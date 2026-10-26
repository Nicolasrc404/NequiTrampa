// ============================================================
// Error de autenticación
// ============================================================
// Clasificación estable para que la UI decida qué mostrar. Nunca incluye
// correo, contraseña, tokens ni el cuerpo crudo del proveedor.

import type { AuthErrorCode } from './types';

export interface AuthErrorOptions {
  readonly status?: number;
  readonly retryAfterMs?: number;
  readonly cause?: unknown;
}

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status?: number;
  readonly retryAfterMs?: number;

  constructor(code: AuthErrorCode, message: string, options: AuthErrorOptions = {}) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = options.status;
    this.retryAfterMs = options.retryAfterMs;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }

  /** Errores que se resuelven reintentando (sin cambiar credenciales). */
  get isRetryable(): boolean {
    return this.code === 'network' || this.code === 'too_many_attempts';
  }
}

export function asAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  return new AuthError('unknown', 'No pudimos completar la autenticación.');
}
