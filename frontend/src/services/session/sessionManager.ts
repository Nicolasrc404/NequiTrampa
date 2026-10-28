// ============================================================
// SessionManager
// ============================================================
// Responsabilidades:
//   - Restaurar la sesión desde el refresh token persistido.
//   - Entregar un ID token vigente (renovación single-flight).
//   - Cerrar sesión local ante `signOut` o un 401 del backend.
//   - Notificar a la UI mediante snapshots sin exponer tokens.
//
// No usa timers ni React: se puede probar con reloj y almacenamiento falsos.
// No registra tokens, correo ni contraseña.

import { asAuthError, AuthError } from './errors';
import type { IdentityPlatformClient } from './identityPlatform';
import {
  buildSession,
  DEFAULT_REFRESH_SKEW_MS,
  isSessionExpired,
} from './session';
import type { SessionStorage } from './storage';
import type {
  AuthErrorCode,
  Session,
  SessionSnapshot,
  SessionStatus,
} from './types';

export interface SessionManagerOptions {
  readonly storage: SessionStorage;
  readonly identity: IdentityPlatformClient;
  readonly now?: () => number;
  readonly refreshSkewMs?: number;
  /**
   * Se invoca al cerrar sesión (logout, 401 o refresh inválido).
   * Se usa para limpiar claves de idempotencia de la sesión anterior.
   */
  readonly onSessionCleared?: () => void | Promise<void>;
}

export type SessionListener = (snapshot: SessionSnapshot) => void;

export class SessionManager {
  private readonly storage: SessionStorage;
  private readonly identity: IdentityPlatformClient;
  private readonly now: () => number;
  private readonly refreshSkewMs: number;
  private readonly onSessionCleared?: () => void | Promise<void>;

  private session: Session | null = null;
  private status: SessionStatus = 'initializing';
  private errorCode: AuthErrorCode | null = null;

  private restorePromise: Promise<SessionSnapshot> | null = null;
  private refreshPromise: Promise<Session> | null = null;
  private readonly listeners = new Set<SessionListener>();
  /** Cambia en login/logout: invalida restauraciones que terminan tarde. */
  private generation = 0;

  constructor(options: SessionManagerOptions) {
    this.storage = options.storage;
    this.identity = options.identity;
    this.now = options.now ?? Date.now;
    this.refreshSkewMs = options.refreshSkewMs ?? DEFAULT_REFRESH_SKEW_MS;
    this.onSessionCleared = options.onSessionCleared;
  }

  /** Vista pública de la sesión (sin tokens). */
  getSnapshot(): SessionSnapshot {
    return {
      status: this.status,
      user: this.session?.user ?? null,
      expiresAt: this.session?.tokens.expiresAt ?? null,
      errorCode: this.errorCode,
    };
  }

  /** Suscribe a cambios y emite el estado actual de inmediato. */
  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    this.emit(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Restaura la sesión una sola vez por intento concurrente.
   * - Sin refresh token → `anonymous`.
   * - Refresh válido → `authenticated`.
   * - Refresh inválido → borra el token y queda `anonymous`.
   * - Red/configuración → conserva el token y queda `unavailable`.
   */
  restore(): Promise<SessionSnapshot> {
    if (this.restorePromise) return this.restorePromise;
    this.restorePromise = this.doRestore().finally(() => {
      this.restorePromise = null;
    });
    return this.restorePromise;
  }

  /**
   * Devuelve un ID token vigente o `null` si no hay sesión utilizable.
   * Renueva cerca del vencimiento con una única petición concurrente.
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.session && this.status !== 'unavailable') {
      await this.restore();
    }

    const current = this.session;
    if (!current) return null;

    if (!isSessionExpired(current, this.now(), this.refreshSkewMs)) {
      return current.tokens.idToken;
    }

    const generation = this.generation;
    try {
      const refreshed = await this.refreshWith(
        current.tokens.refreshToken,
        generation,
      );
      return refreshed.tokens.idToken;
    } catch (error) {
      // Un login/logout posterior manda: no se toca la sesión nueva.
      if (generation !== this.generation) return null;

      const auth = asAuthError(error);
      if (auth.code === 'invalid_session') {
        await this.clearSession('anonymous', auth.code);
        return null;
      }
      // Red/configuración: si aún no expiró, se puede usar el token actual.
      if (!isSessionExpired(current, this.now(), 0)) {
        return current.tokens.idToken;
      }
      return null;
    }
  }

  /**
   * Inicia sesión con correo y contraseña.
   * Persiste únicamente el refresh token y limpia claves de idempotencia
   * heredadas de una sesión anterior.
   */
  async signIn(email: string, password: string): Promise<SessionSnapshot> {
    // Invalida cualquier restauración que esté en vuelo.
    const generation = ++this.generation;
    const tokens = await this.identity.signInWithPassword(email, password);
    if (generation !== this.generation) {
      throw new AuthError(
        'invalid_session',
        'La sesión cambió durante el inicio de sesión.',
      );
    }
    const session = buildSession({
      idToken: tokens.idToken,
      refreshToken: tokens.refreshToken,
      expiresInSeconds: tokens.expiresInSeconds,
      now: this.now(),
    });

    await this.persistRefreshToken(session.tokens.refreshToken);
    this.session = session;
    this.errorCode = null;
    this.setStatus('authenticated');
    await this.notifySessionCleared();

    return this.getSnapshot();
  }

  /** Cierre de sesión local. No llama al backend. */
  async signOut(): Promise<void> {
    await this.clearSession('anonymous', null);
  }

  /** Un 401 del backend invalida la sesión local (no se reintenta la request). */
  async handleUnauthorized(): Promise<void> {
    await this.clearSession('anonymous', 'invalid_session');
  }

  private async doRestore(): Promise<SessionSnapshot> {
    const generation = this.generation;

    if (
      this.session &&
      !isSessionExpired(this.session, this.now(), this.refreshSkewMs)
    ) {
      this.errorCode = null;
      this.setStatus('authenticated');
      return this.getSnapshot();
    }

    let refreshToken: string | null;
    try {
      refreshToken = await this.storage.loadRefreshToken();
    } catch {
      if (generation !== this.generation) return this.getSnapshot();
      this.session = null;
      this.errorCode = 'unknown';
      this.setStatus('unavailable');
      return this.getSnapshot();
    }

    if (generation !== this.generation) return this.getSnapshot();

    if (!refreshToken) {
      const hadSession = this.session !== null;
      this.session = null;
      this.errorCode = null;
      this.setStatus('anonymous');
      if (hadSession) await this.notifySessionCleared();
      return this.getSnapshot();
    }

    try {
      await this.refreshWith(refreshToken, generation);
      return this.getSnapshot();
    } catch (error) {
      if (generation !== this.generation) return this.getSnapshot();

      const auth = asAuthError(error);
      if (auth.code === 'invalid_session') {
        // El proveedor rechazó el refresh token: ya no sirve.
        await this.clearSession('anonymous', auth.code);
      } else {
        // Red o configuración: se conserva el refresh token para reintentar.
        this.session = null;
        this.errorCode = auth.code;
        this.setStatus('unavailable');
      }
      return this.getSnapshot();
    }
  }

  /** Renueva con una sola petición aunque lleguen varios llamadores. */
  private refreshWith(
    refreshToken: string,
    generation: number = this.generation,
  ): Promise<Session> {
    if (this.refreshPromise) return this.refreshPromise;

    const promise = (async (): Promise<Session> => {
      const tokens = await this.identity.refresh(refreshToken);
      if (generation !== this.generation) {
        throw new AuthError(
          'invalid_session',
          'La sesión cambió durante la renovación.',
        );
      }

      const session = buildSession({
        idToken: tokens.idToken,
        refreshToken: tokens.refreshToken || refreshToken,
        expiresInSeconds: tokens.expiresInSeconds,
        now: this.now(),
      });

      await this.persistRefreshToken(session.tokens.refreshToken);
      this.session = session;
      this.errorCode = null;
      this.setStatus('authenticated');
      return session;
    })();

    this.refreshPromise = promise;
    return promise.finally(() => {
      if (this.refreshPromise === promise) this.refreshPromise = null;
    });
  }

  private async clearSession(
    status: SessionStatus,
    errorCode: AuthErrorCode | null,
  ): Promise<void> {
    this.generation += 1;
    this.session = null;
    this.errorCode = errorCode;
    await this.deletePersistedToken();
    this.setStatus(status);
    await this.notifySessionCleared();
  }

  private async persistRefreshToken(refreshToken: string): Promise<void> {
    try {
      await this.storage.saveRefreshToken(refreshToken);
    } catch {
      // La sesión sigue utilizable en memoria; el próximo arranque pedirá
      // credenciales de nuevo. No se falla el login por un problema de storage.
    }
  }

  private async deletePersistedToken(): Promise<void> {
    try {
      await this.storage.clear();
    } catch {
      // El token caducará en el proveedor; nunca se bloquea el logout local.
    }
  }

  private async notifySessionCleared(): Promise<void> {
    if (!this.onSessionCleared) return;
    try {
      await this.onSessionCleared();
    } catch {
      // La limpieza auxiliar no debe romper el flujo de sesión.
    }
  }

  private setStatus(status: SessionStatus): void {
    this.status = status;
    for (const listener of [...this.listeners]) {
      this.emit(listener);
    }
  }

  private emit(listener: SessionListener): void {
    try {
      listener(this.getSnapshot());
    } catch {
      // Un consumidor defectuoso no debe afectar a los demás.
    }
  }
}
