// ============================================================
// RFC 9457 — Problem Details for HTTP APIs
// ============================================================
// Normaliza cualquier respuesta de error del backend a una estructura única.
// El backend usa `application/problem+json` con `title`, `status`, `detail`,
// `type` y la extensión `code` (p. ej. MISSING_IDEMPOTENCY_KEY).

/** Clasificación estable de errores para decidir UI, reintento y sesión. */
export type ApiErrorKind =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'unprocessable'
  | 'rate_limited'
  | 'server_error'
  | 'unavailable'
  | 'client_error'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'unexpected';

export interface ApiProblem {
  readonly type?: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  /** Código de negocio estable (`code` en las extensiones del backend). */
  readonly code?: string;
  /** Errores de validación por campo. */
  readonly errors?: Readonly<Record<string, readonly string[]>>;
  readonly traceId?: string;
}

export interface HeaderReader {
  get(name: string): string | null;
}

const STATUS_KIND: Readonly<Record<number, ApiErrorKind>> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'unprocessable',
  429: 'rate_limited',
  500: 'server_error',
  502: 'server_error',
  503: 'unavailable',
  504: 'unavailable',
};

export const STATUS_TITLES: Readonly<Record<number, string>> = {
  400: 'Solicitud inválida',
  401: 'Tu sesión venció',
  403: 'No puedes acceder a esta información',
  404: 'No encontramos esta información',
  409: 'La operación ya fue procesada',
  422: 'Revisa los datos ingresados',
  429: 'Demasiados intentos',
  500: 'Algo salió mal',
  502: 'Algo salió mal',
  503: 'Servicio no disponible',
  504: 'Servicio no disponible',
};

const RETRYABLE_KINDS: ReadonlySet<ApiErrorKind> = new Set<ApiErrorKind>([
  'rate_limited',
  'server_error',
  'unavailable',
  'network',
  'timeout',
]);

export function kindForStatus(status: number): ApiErrorKind {
  const known = STATUS_KIND[status];
  if (known) return known;
  if (status >= 500) return 'server_error';
  if (status >= 400) return 'client_error';
  return 'unexpected';
}

/** Solo estos errores tienen sentido reintentar (idempotencia mediante). */
export function isRetryableKind(kind: ApiErrorKind): boolean {
  return RETRYABLE_KINDS.has(kind);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return undefined;
}

function readErrors(value: unknown): Record<string, string[]> | undefined {
  if (!isRecord(value)) return undefined;
  const result: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(value)) {
    if (Array.isArray(messages)) {
      const normalized = messages
        .map((message) => (typeof message === 'string' ? message.trim() : ''))
        .filter((message) => message.length > 0);
      if (normalized.length > 0) result[field] = normalized;
    } else if (typeof messages === 'string' && messages.trim().length > 0) {
      result[field] = [messages.trim()];
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Convierte el cuerpo crudo de una respuesta de error en un `ApiProblem`.
 * Nunca lanza: si el cuerpo no es JSON válido se usa el texto como detalle.
 */
export function parseProblemDetails(
  status: number,
  rawBody?: string | null,
  headers?: HeaderReader | null,
): ApiProblem {
  const fallbackTitle = STATUS_TITLES[status] ?? `Error ${status}`;
  const traceIdFromHeader = headers?.get('x-request-id') ?? undefined;
  const body = (rawBody ?? '').trim();

  let parsed: unknown;
  if (body.startsWith('{') || body.startsWith('[')) {
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = undefined;
    }
  }

  if (isRecord(parsed)) {
    const title = readString(parsed, 'title') ?? fallbackTitle;
    const detail = readString(parsed, 'detail');
    const code = readString(parsed, 'code') ?? readString(parsed, 'errorCode');
    const traceId =
      readString(parsed, 'traceId') ??
      readString(parsed, 'requestId') ??
      readString(parsed, 'trace_id') ??
      traceIdFromHeader;
    return {
      type: readString(parsed, 'type'),
      title,
      status,
      detail,
      instance: readString(parsed, 'instance'),
      code,
      errors: readErrors(parsed.errors),
      traceId,
    };
  }

  // Cuerpo no JSON (HTML de un proxy, texto plano de un 502, etc.).
  const detail =
    body.length > 0 && body.length <= 280 && !body.includes('<') ? body : undefined;

  return {
    title: fallbackTitle,
    status,
    detail,
    traceId: traceIdFromHeader,
  };
}

/**
 * Interpreta `Retry-After` (segundos o fecha HTTP) y devuelve segundos.
 * Devuelve `undefined` si el encabezado falta o es inválido.
 */
export function parseRetryAfter(
  value: string | null | undefined,
  now: number = Date.now(),
): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isFinite(seconds) ? seconds : undefined;
  }

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return undefined;
  return Math.max(0, Math.ceil((timestamp - now) / 1000));
}
