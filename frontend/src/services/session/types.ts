// ============================================================
// Modelo de sesión
// ============================================================
// Un `Session` combina los tokens de Identity Platform con la identidad de
// dominio que el backend necesita:
//   - `uid`       : auth subject (claim `user_id` / `sub`).
//   - `clientId`  : client_id de dominio (claim `client_id`), si existe.
//   - `roles`     : roles RBAC del token.
//
// `clientId` puede ser `null`: el backend lo resuelve desde Spanner cuando el
// token no lo incluye. El frontend nunca lo inventa a partir del uid.

export interface AuthTokens {
  /** ID token JWT de Identity Platform (no es un refresh token). */
  readonly idToken: string;
  /** Refresh token de Identity Platform; es el único valor que se persiste. */
  readonly refreshToken: string;
  /** Momento de expiración del ID token, en milisegundos epoch. */
  readonly expiresAt: number;
}

export interface SessionUser {
  /** Auth subject: `user_id` o `sub` del JWT. */
  readonly uid: string;
  /** Client id de dominio (`client_id`), o `null` si el token no lo trae. */
  readonly clientId: string | null;
  /** Roles normalizados del token (`role` / `roles`). */
  readonly roles: readonly string[];
}

export interface Session {
  readonly tokens: AuthTokens;
  readonly user: SessionUser;
}

/**
 * `initializing` : aún no se leyó el almacenamiento.
 * `authenticated`: hay un ID token utilizable en memoria.
 * `anonymous`    : no hay sesión (nunca hubo, o se cerró/expiró).
 * `unavailable`  : no se pudo validar por red/configuración; el refresh token
 *                  persistido se conserva para reintentar.
 */
export type SessionStatus =
  | 'initializing'
  | 'authenticated'
  | 'anonymous'
  | 'unavailable';

export type AuthErrorCode =
  | 'configuration'
  | 'invalid_credentials'
  | 'user_disabled'
  | 'too_many_attempts'
  | 'invalid_session'
  | 'network'
  | 'unknown';

/** Vista inmutable de la sesión para la UI. Nunca incluye tokens. */
export interface SessionSnapshot {
  readonly status: SessionStatus;
  readonly user: SessionUser | null;
  readonly expiresAt: number | null;
  /** Última causa de `anonymous` / `unavailable`; se limpia al autenticar. */
  readonly errorCode: AuthErrorCode | null;
}

/** Respuesta normalizada de Identity Platform (sign-in y refresh). */
export interface IdentityTokens {
  readonly idToken: string;
  readonly refreshToken: string;
  /** Segundos de vida del ID token; `0` si el proveedor no lo informó. */
  readonly expiresInSeconds: number;
}
