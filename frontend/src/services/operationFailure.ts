// ============================================================
// Clasificación de fallos de una operación financiera
// ============================================================
// Traduce el `code` de RFC 9457 y el estado HTTP a una intención de UI.
// No conoce pantallas ni navegación: eso se decide en App.tsx.

import { asApiError, type ApiError } from './http';

export type OperationFailureKind =
  | 'validation'
  | 'session'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'insufficient_funds'
  | 'limit_exceeded'
  | 'rate_limited'
  | 'server_error'
  | 'unavailable'
  | 'uncertain'
  | 'cancelled'
  | 'unknown';

/** `true` si el servidor pudo haber aplicado la operación. */
export function isAmbiguousFailure(kind: OperationFailureKind): boolean {
  return kind === 'uncertain';
}

export function classifyOperationFailure(error: unknown): OperationFailureKind {
  const apiError: ApiError = asApiError(error);
  const code = (apiError.problem.code ?? '').toUpperCase();

  if (code === 'INSUFFICIENT_FUNDS') return 'insufficient_funds';
  if (code === 'LIMIT_EXCEEDED') return 'limit_exceeded';

  switch (apiError.kind) {
    case 'bad_request':
    case 'unprocessable':
      return 'validation';
    case 'unauthorized':
      return 'session';
    case 'forbidden':
      return 'forbidden';
    case 'not_found':
      return 'not_found';
    case 'conflict':
      return 'conflict';
    case 'rate_limited':
      return 'rate_limited';
    case 'server_error':
      return 'server_error';
    case 'unavailable':
      return 'unavailable';
    case 'timeout':
    case 'network':
      return 'uncertain';
    case 'aborted':
      return 'cancelled';
    default:
      return 'unknown';
  }
}
