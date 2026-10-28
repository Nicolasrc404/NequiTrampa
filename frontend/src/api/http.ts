import { appConfig } from '../config/appConfig';
import { createHttpClient } from '../services/http/client';
import { ApiError as CentralApiError } from '../services/http/ApiError';
import { generateIdempotencyKey } from '../utils/idempotency';

/**
 * Compatibilidad para consumidores antiguos (Backoffice). La URL ya no tiene
 * fallback de producción: debe provenir explícitamente de Expo.
 */
export const API_URL = appConfig.apiBaseUrl ?? '';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly requestId?: string,
  ) {
    super(message);
  }
}

type TokenProvider = () => Promise<string | null>;
let tokenProvider: TokenProvider = async () => null;
let onUnauthorized: () => void = () => {};

export function configureHttp(opts: { getToken: TokenProvider; onUnauthorized: () => void }) {
  tokenProvider = opts.getToken;
  onUnauthorized = opts.onUnauthorized;
}

export const newIdempotencyKey = generateIdempotencyKey;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  idempotencyKey?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError(500, 'La API no está configurada.', 'config_missing');
  }

  try {
    const client = createHttpClient({
      baseUrl: API_URL,
      timeoutMs: opts.timeoutMs,
      getAccessToken: tokenProvider,
      onUnauthorized,
    });
    return await client.request<T>(opts.method ?? 'GET', path, {
      query: opts.query,
      body: opts.body,
      signal: opts.signal,
      idempotencyKey: opts.idempotencyKey,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof CentralApiError) {
      throw new ApiError(
        error.status || (error.kind === 'network' || error.kind === 'timeout' ? 503 : 500),
        error.toUserMessage().message,
        error.problem.code ?? error.kind,
        error.requestId,
      );
    }
    throw new ApiError(500, 'Error inesperado.', 'unexpected');
  }
}
