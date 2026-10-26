// ============================================================
// Sesión: construcción y vencimiento
// ============================================================
// Funciones puras (sin React Native, sin almacenamiento) para poder probar
// la lógica de expiración con reloj simulado.

import { AuthError } from './errors';
import { decodeJwtPayload, readExpirationMs, readSessionUser } from './jwt';
import type { AuthTokens, Session, SessionSnapshot, SessionUser } from './types';

/** Renueva el token un minuto antes de que expire (margen de reloj/red). */
export const DEFAULT_REFRESH_SKEW_MS = 60_000;

export interface BuildSessionInput {
  readonly idToken: string;
  readonly refreshToken: string;
  /** Segundos informados por Identity Platform; `0` si no vino. */
  readonly expiresInSeconds: number;
  readonly now?: number;
}

/**
 * Construye una sesión a partir de un ID token.
 * - El `uid` debe existir en el token: sin identidad no hay sesión.
 * - La expiración prefiere el claim `exp` (firmado) y, si Identity Platform
 *   informa `expiresIn`, usa el menor de ambos para no sobreestimar.
 * @throws AuthError('invalid_session') si el token o la expiración no son válidos.
 */
export function buildSession(input: BuildSessionInput): Session {
  const now = input.now ?? Date.now();
  const payload = decodeJwtPayload(input.idToken);
  if (!payload) {
    throw new AuthError('invalid_session', 'El token de acceso no es válido.');
  }

  const user = readSessionUser(payload);
  if (!user) {
    throw new AuthError(
      'invalid_session',
      'El token de acceso no contiene una identidad válida.',
    );
  }

  const expiresFromClaim = readExpirationMs(payload);
  const expiresFromResponse =
    Number.isFinite(input.expiresInSeconds) && input.expiresInSeconds > 0
      ? now + Math.trunc(input.expiresInSeconds) * 1000
      : null;

  const expiresAt =
    expiresFromClaim !== null && expiresFromResponse !== null
      ? Math.min(expiresFromClaim, expiresFromResponse)
      : (expiresFromClaim ?? expiresFromResponse);

  if (expiresAt === null) {
    throw new AuthError(
      'invalid_session',
      'El token de acceso no tiene una expiración válida.',
    );
  }

  const tokens: AuthTokens = {
    idToken: input.idToken,
    refreshToken: input.refreshToken,
    expiresAt,
  };

  return { tokens, user };
}

/**
 * `true` si el token expiró o está dentro del margen de renovación.
 * Con `skewMs = 0` responde estrictamente si ya expiró.
 */
export function isSessionExpired(
  session: Session,
  now: number = Date.now(),
  skewMs: number = 0,
): boolean {
  return session.tokens.expiresAt - skewMs <= now;
}

/** Vista pública (sin tokens) de una sesión autenticada. */
export function sessionSnapshot(session: Session): SessionSnapshot {
  return {
    status: 'authenticated',
    user: session.user,
    expiresAt: session.tokens.expiresAt,
    errorCode: null,
  };
}

/** `true` si el usuario tiene alguno de los roles indicados (case-sensitive). */
export function hasRole(user: SessionUser | null, role: string): boolean {
  return user?.roles.includes(role) === true;
}
