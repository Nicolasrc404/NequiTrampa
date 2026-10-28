// Cliente HTTP falso para probar los servicios sin red ni Expo.
// Registra cada llamada para verificar ruta, cuerpo y cabeceras (incluida la
// clave de idempotencia) sin inspeccionar detalles internos del servicio.

import type {
  HttpClient,
  RequestOptions,
} from '../../../src/services/http';

export interface FakeCall {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
  readonly options: RequestOptions | undefined;
}

export type FakeResponder = (
  call: FakeCall,
) => unknown | Promise<unknown>;

export interface FakeHttp {
  readonly http: HttpClient;
  readonly calls: readonly FakeCall[];
}

/**
 * @param responder devuelve el payload que el servicio va a validar. Puede
 * lanzar para simular un `ApiError` de la capa HTTP.
 */
export function createFakeHttp(
  responder: FakeResponder = () => undefined,
): FakeHttp {
  const calls: FakeCall[] = [];

  async function call<T>(
    method: string,
    path: string,
    body: unknown,
    options: RequestOptions | undefined,
  ): Promise<T> {
    const entry: FakeCall = { method, path, body, options };
    calls.push(entry);
    return (await responder(entry)) as T;
  }

  const http: HttpClient = {
    baseUrl: 'https://api.example.test',
    request: <T>(method: string, path: string, options?: RequestOptions) =>
      call<T>(method, path, options?.body, options),
    get: <T>(path: string, options?: RequestOptions) =>
      call<T>('GET', path, undefined, options),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      call<T>('POST', path, body, options),
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      call<T>('PATCH', path, body, options),
    put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      call<T>('PUT', path, body, options),
    delete: <T>(path: string, options?: RequestOptions) =>
      call<T>('DELETE', path, undefined, options),
  };

  return { http, calls };
}
