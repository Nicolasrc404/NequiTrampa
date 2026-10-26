// ============================================================
// ApiError — error único de la capa HTTP
// ============================================================
// Traduce cualquier fallo (HTTP, red, timeout, cancelación) a un objeto con
// clasificación estable, mensaje para el usuario y política de reintento.
// No transporta tokens ni cuerpos sensibles.

import {
  kindForStatus,
  isRetryableKind,
  parseProblemDetails,
  parseRetryAfter,
  STATUS_TITLES,
  type ApiErrorKind,
  type ApiProblem,
  type HeaderReader,
} from './problemDetails';

export interface ApiErrorInit {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly problem?: ApiProblem;
  readonly retryAfterSeconds?: number;
  readonly requestId?: string;
  readonly isAbort?: boolean;
  readonly cause?: unknown;
}

export type ApiPrimaryAction = 'retry' | 'login' | 'back' | 'none';

export interface ApiUserMessage {
  readonly title: string;
  readonly message: string;
  readonly primaryAction: ApiPrimaryAction;
}

/** Mensaje genérico cuando el backend devuelve 5xx: nunca se filtra el detalle interno. */
const SAFE_SERVER_MESSAGE =
  'Es un problema de nuestro lado, no tuyo. Intenta de nuevo en unos minutos.';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly problem: ApiProblem;
  readonly retryAfterSeconds?: number;
  readonly requestId?: string;
  readonly isAbort: boolean;

  constructor(init: ApiErrorInit) {
    const problem: ApiProblem =
      init.problem ??
      ({
        title: STATUS_TITLES[init.status ?? 0] ?? 'Error inesperado',
        status: init.status ?? 0,
      } satisfies ApiProblem);
    super(problem.detail ? `${problem.title}: ${problem.detail}` : problem.title);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status ?? problem.status;
    this.problem = problem;
    this.retryAfterSeconds = init.retryAfterSeconds;
    this.requestId = init.requestId ?? problem.traceId;
    this.isAbort = init.isAbort === true;
    if (init.cause !== undefined) {
      // `cause` existe en ES2022; se asigna defensivamente para RN antiguos.
      (this as { cause?: unknown }).cause = init.cause;
    }
  }

  /** Errores con efecto transitorio: reintentar es seguro para lecturas. */
  get isRetryable(): boolean {
    return isRetryableKind(this.kind);
  }

  /** La sesión debe renovarse o cerrarse. */
  get requiresLogin(): boolean {
    return this.kind === 'unauthorized';
  }

  /** Construye el error a partir de una respuesta HTTP no exitosa. */
  static fromResponse(
    status: number,
    rawBody: string | null,
    headers?: HeaderReader | null,
  ): ApiError {
    const problem = parseProblemDetails(status, rawBody, headers);
    return new ApiError({
      kind: kindForStatus(status),
      status,
      problem,
      retryAfterSeconds: parseRetryAfter(headers?.get('retry-after')),
    });
  }

  /** Fallo de transporte (sin respuesta HTTP). */
  static fromTransport(
    kind: 'network' | 'timeout' | 'aborted' | 'unexpected',
    cause?: unknown,
  ): ApiError {
    return new ApiError({ kind, cause, isAbort: kind === 'aborted' });
  }

  /**
   * Mensaje listo para la UI. Para 5xx y errores de transporte no se usa el
   * `detail` del servidor (podría exponer información interna).
   */
  toUserMessage(): ApiUserMessage {
    const { title, detail } = this.problem;
    switch (this.kind) {
      case 'unauthorized':
        return {
          title: 'Tu sesión venció',
          message: 'Inicia sesión de nuevo para continuar.',
          primaryAction: 'login',
        };
      case 'forbidden':
        return {
          title: 'No puedes acceder a esta información',
          message:
            detail ?? 'No tienes permisos para ver o modificar este recurso.',
          primaryAction: 'back',
        };
      case 'not_found':
        return {
          title: title || 'No encontramos esta información',
          message:
            detail ?? 'El recurso que buscas no existe o ya no está disponible.',
          primaryAction: 'back',
        };
      case 'conflict':
        return {
          title: title || 'La operación ya fue procesada',
          message:
            detail ??
            'Esta operación ya se había registrado. Revisa tu historial antes de intentarlo de nuevo.',
          primaryAction: 'none',
        };
      case 'unprocessable':
      case 'bad_request':
        return {
          title: title || 'Revisa los datos ingresados',
          message: detail ?? 'Hay campos que debemos corregir antes de continuar.',
          primaryAction: 'none',
        };
      case 'rate_limited': {
        const wait =
          this.retryAfterSeconds && this.retryAfterSeconds > 0
            ? ` Espera ${this.retryAfterSeconds} segundos.`
            : ' Espera un momento.';
        return {
          title: 'Demasiados intentos',
          message: `Por seguridad bloqueamos intentos seguidos.${wait}`,
          primaryAction: 'retry',
        };
      }
      case 'server_error':
        return {
          title: 'Algo salió mal',
          message: SAFE_SERVER_MESSAGE,
          primaryAction: 'retry',
        };
      case 'unavailable':
        return {
          title: 'Servicio no disponible',
          message:
            'No pudimos conectar con el servicio. Revisa tu conexión e intenta de nuevo.',
          primaryAction: 'retry',
        };
      case 'network':
        return {
          title: 'Sin conexión',
          message:
            'No hay conexión con el servidor. Verifica tu red e intenta de nuevo.',
          primaryAction: 'retry',
        };
      case 'timeout':
        return {
          title: 'La operación tardó demasiado',
          message:
            'El servidor no respondió a tiempo. Intenta de nuevo antes de repetir la operación.',
          primaryAction: 'retry',
        };
      case 'aborted':
        return {
          title: 'Operación cancelada',
          message: 'La operación se canceló. No se realizó ningún cambio.',
          primaryAction: 'none',
        };
      case 'client_error':
        return {
          title: title || 'No pudimos completar la operación',
          message: detail ?? 'Revisa la información e intenta de nuevo.',
          primaryAction: 'none',
        };
      default:
        return {
          title: title || 'Error inesperado',
          message:
            detail ?? 'Ocurrió un error inesperado. Intenta de nuevo en un momento.',
          primaryAction: 'none',
        };
    }
  }
}

/** Normaliza cualquier valor lanzado a `ApiError`. */
export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) {
    if (error.name === 'AbortError') return ApiError.fromTransport('aborted', error);
    return ApiError.fromTransport('unexpected', error);
  }
  return ApiError.fromTransport('unexpected', error);
}
