// Núcleo de sesión (sin dependencias de Expo/React Native).
export { AuthError, asAuthError } from './errors';
export type { AuthErrorOptions } from './errors';

export {
  createIdentityPlatformClient,
  unconfiguredIdentityClient,
  IDENTITY_REFRESH_URL,
  IDENTITY_SIGN_IN_URL,
} from './identityPlatform';
export type {
  IdentityPlatformClient,
  IdentityPlatformOptions,
} from './identityPlatform';

export { decodeJwtPayload, readExpirationMs, readSessionUser } from './jwt';
export type { JwtPayload } from './jwt';

export {
  buildSession,
  DEFAULT_REFRESH_SKEW_MS,
  hasRole,
  isSessionExpired,
  sessionSnapshot,
} from './session';
export type { BuildSessionInput } from './session';

export { SessionManager } from './sessionManager';
export type { SessionListener, SessionManagerOptions } from './sessionManager';

export {
  createSecureSessionStorage,
  MemorySessionStorage,
  SESSION_STORAGE_KEY_DEFAULT,
} from './storage';
export type { SecureStoreLike, SessionStorage } from './storage';

export type {
  AuthErrorCode,
  AuthTokens,
  IdentityTokens,
  Session,
  SessionSnapshot,
  SessionStatus,
  SessionUser,
} from './types';
