export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://nequi-gateway-7v3gdoy4ra-tl.a.run.app').replace(/\/$/, '');

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

export function newIdempotencyKey(): string {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-a${hex().slice(1)}-${hex()}${hex()}${hex()}`;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  idempotencyKey?: string;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const qs = Object.entries(opts.query ?? {})
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = await tokenProvider();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}${qs ? `?${qs}` : ''}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(503, 'No hay conexión con el servicio.', 'network_error');
  }

  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;

  let problem: { detail?: string; title?: string; code?: string; requestId?: string } = {};
  try {
    problem = await res.json();
  } catch {
    // cuerpo no JSON
  }
  if (res.status === 401) onUnauthorized();
  throw new ApiError(res.status, problem.detail ?? problem.title ?? `HTTP ${res.status}`, problem.code, problem.requestId);
}
