// ============================================================
// Almacenamiento de sesión
// ============================================================
// Solo se persiste el refresh token. El ID token vive en memoria:
//   - es un JWT grande (puede superar el límite de SecureStore en Android),
//   - se regenera al restaurar la sesión,
//   - si el dispositivo se pierde, el exposure es menor.
//
// En web `expo-secure-store` no tiene implementación: se usa memoria y la
// sesión no sobrevive a recargas (nunca `localStorage` para tokens).

const SESSION_STORAGE_KEY = 'nequitrampa.session.v1';

export interface SessionStorage {
  loadRefreshToken(): Promise<string | null>;
  saveRefreshToken(refreshToken: string): Promise<void>;
  clear(): Promise<void>;
}

/** Implementación en memoria (tests y web). */
export class MemorySessionStorage implements SessionStorage {
  private refreshToken: string | null;

  constructor(initialRefreshToken: string | null = null) {
    this.refreshToken = initialRefreshToken;
  }

  async loadRefreshToken(): Promise<string | null> {
    return this.refreshToken;
  }

  async saveRefreshToken(refreshToken: string): Promise<void> {
    this.refreshToken = refreshToken;
  }

  async clear(): Promise<void> {
    this.refreshToken = null;
  }
}

/** Forma mínima de `expo-secure-store` que necesita el adaptador. */
export interface SecureStoreLike {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

interface PersistedSessionV1 {
  readonly version: 1;
  readonly refreshToken: string;
}

/**
 * Adaptador sobre SecureStore. El valor guardado es pequeño
 * (`{ version, refreshToken }`), no un ID token completo.
 */
export function createSecureSessionStorage(
  store: SecureStoreLike,
  key: string = SESSION_STORAGE_KEY,
): SessionStorage {
  return {
    async loadRefreshToken(): Promise<string | null> {
      const raw = await store.getItemAsync(key);
      if (!raw) return null;

      try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed === null || typeof parsed !== 'object') return null;
        const candidate = parsed as Partial<PersistedSessionV1>;
        if (candidate.version !== 1) return null;
        if (
          typeof candidate.refreshToken !== 'string' ||
          candidate.refreshToken.length === 0
        ) {
          return null;
        }
        return candidate.refreshToken;
      } catch {
        return null;
      }
    },

    async saveRefreshToken(refreshToken: string): Promise<void> {
      if (!refreshToken) {
        throw new Error('No se puede persistir un refresh token vacío.');
      }
      const payload: PersistedSessionV1 = { version: 1, refreshToken };
      await store.setItemAsync(key, JSON.stringify(payload));
    },

    async clear(): Promise<void> {
      await store.deleteItemAsync(key);
    },
  };
}

export const SESSION_STORAGE_KEY_DEFAULT = SESSION_STORAGE_KEY;
