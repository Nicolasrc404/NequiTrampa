// ============================================================
// Cliente HTTP único de la aplicación
// ============================================================
// Responsabilidades:
//  - Construir URLs contra el API Gateway.
//  - Adjuntar el JWT de Identity Platform en cada solicitud autenticada.
//  - Aplicar timeout y cancelación cooperativa.
//  - Convertir respuestas de error RFC 9457 en `ApiError` clasificados.
//  - Centralizar el manejo de 401 (invalidación de sesión).
//  - Enviar `Idempotency-Key` en mutaciones financieras.
// No registra tokens, cuerpos ni datos financieros.

import { ApiError } from './ApiError';
import {
  buildUrl,
  normalizeBaseUrl,
  type QueryParams,
} from '../../utils/url';

export interface HttpClientOptions {
  readonly baseUrl: string;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
  /** Devuelve el ID token vigente o `null` si no hay sesión. */
  readonly getAccessToken?: () => string | null | Promise<string | null>;
  /** Se invoca una sola vez por respuesta 401 (excepto con `skipAuth`). */
  readonly onUnauthorized?: (error: ApiError) => void;
  readonly defaultHeaders?: Readonly<Record<string, string>>;
}

export interface RequestOptions {
  readonly query?: QueryParams;
  readonly headers?: Readonly<Record<string, string | undefined>>;
  readonly body?: unknown;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
  /** Clave de idempotencia reutilizada en los reintentos de una misma operación. */
  readonly idempotencyKey?: string;
  /** Omite Authorization y el hook de 401 (endpoints públicos). */
  readonly skipAuth?: boolean;
}

export interface HttpClient {
  readonly baseUrl: string;
  request<T>(method: string, path: string, options?: RequestOptions): Promise<T>;
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

function looksLikeJson(text: string): boolean {
  const first = text.trimStart().charAt(0);
  return first === '{' || first === '[';
}

async function readBody(response: Response): Promise<string> {
  if (typeof response.text === 'function') return response.text();
  return '';
}

function parseSuccessBody<T>(status: number, raw: string, contentType: string): T {
  if (status === 204 || status === 205) return undefined as T;
  const text = raw.trim();
  if (text.length === 0) return undefined as T;

  const isJson = contentType.toLowerCase().includes('json') || looksLikeJson(text);
  if (!isJson) return raw as unknown as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw ApiError.fromTransport('unexpected', new Error('Respuesta JSON inválida'));
  }
}

function composeHeaders(
  defaults: Readonly<Record<string, string>> | undefined,
  options: RequestOptions,
  accessToken: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...defaults,
  };

  if (options.headers) {
    for (const [name, value] of Object.entries(options.headers)) {
      if (value === undefined) continue;
      headers[name] = value;
    }
  }

  if (options.body !== undefined && headers['Content-Type'] === undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken && !options.skipAuth) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }
  return headers;
}

/**
 * Crea el cliente HTTP. La URL base debe ser absoluta (http/https).
 * @throws Error si la URL base no es válida.
 */
export function createHttpClient(options: HttpClientOptions): HttpClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  if (!baseUrl) {
    throw new Error(
      'createHttpClient: baseUrl inválida. Configura EXPO_PUBLIC_API_URL con una URL http(s) absoluta.',
    );
  }

  const resolvedBaseUrl: string = baseUrl;

  const defaultTimeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl: typeof fetch =
    options.fetchImpl ??
    ((input, init) => {
      if (typeof fetch !== 'function') {
        return Promise.reject(
          new Error('fetch no está disponible en este runtime.'),
        );
      }
      return fetch(input, init);
    });

  async function request<T>(
    method: string,
    path: string,
    requestOptions: RequestOptions = {},
  ): Promise<T> {
    if (requestOptions.signal?.aborted) {
      throw ApiError.fromTransport('aborted');
    }

    const url = buildUrl(resolvedBaseUrl, path, requestOptions.query);
    const accessToken = requestOptions.skipAuth
      ? null
      : (await resolveToken(options.getAccessToken)) ?? null;

    const headers = composeHeaders(options.defaultHeaders, requestOptions, accessToken);

    const controller = new AbortController();
    let timedOut = false;
    let externallyAborted = false;
    const timeoutMs = requestOptions.timeoutMs ?? defaultTimeoutMs;

    const onExternalAbort = () => {
      externallyAborted = true;
      controller.abort();
    };
    if (requestOptions.signal && typeof requestOptions.signal.addEventListener === 'function') {
      requestOptions.signal.addEventListener('abort', onExternalAbort);
    }

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method,
        headers,
        body: requestOptions.body === undefined ? undefined : JSON.stringify(requestOptions.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (timedOut) throw ApiError.fromTransport('timeout', error);
      if (externallyAborted) throw ApiError.fromTransport('aborted', error);
      const name = (error as { name?: string } | null)?.name;
      if (name === 'AbortError') throw ApiError.fromTransport('aborted', error);
      throw ApiError.fromTransport('network', error);
    } finally {
      clearTimeout(timer);
      if (
        requestOptions.signal &&
        typeof requestOptions.signal.removeEventListener === 'function'
      ) {
        requestOptions.signal.removeEventListener('abort', onExternalAbort);
      }
    }

    const raw = await readBody(response);
    const status = response.status;

    if (!isSuccessStatus(status)) {
      const error = ApiError.fromResponse(status, raw, response.headers);
      if (status === 401 && !requestOptions.skipAuth && options.onUnauthorized) {
        try {
          options.onUnauthorized(error);
        } catch {
          // El hook de sesión nunca debe enmascarar el error HTTP original.
        }
      }
      throw error;
    }

    const contentType = response.headers?.get?.('content-type') ?? '';
    return parseSuccessBody<T>(status, raw, contentType);
  }

  return {
    baseUrl: resolvedBaseUrl,
    request,
    get: (path, requestOptions) => request('GET', path, requestOptions),
    post: (path, body, requestOptions) =>
      request('POST', path, { ...requestOptions, body }),
    patch: (path, body, requestOptions) =>
      request('PATCH', path, { ...requestOptions, body }),
    put: (path, body, requestOptions) =>
      request('PUT', path, { ...requestOptions, body }),
    delete: (path, requestOptions) => request('DELETE', path, requestOptions),
  };
}

async function resolveToken(
  provider: HttpClientOptions['getAccessToken'],
): Promise<string | null> {
  if (!provider) return null;
  try {
    return (await provider()) ?? null;
  } catch {
    return null;
  }
}
