// ============================================================
// Cliente REST de Identity Platform
// ============================================================
// Se usa la API REST oficial (identitytoolkit / securetoken) en lugar del SDK
// de Firebase para no añadir dependencias nativas ni configuración duplicada.
// El backend valida el JWT emitido aquí con las mismas reglas que el SDK.
//
// Seguridad:
//   - La API key de Identity Platform es pública (va en el bundle).
//   - Nunca se registran correo, contraseña, tokens ni el cuerpo del proveedor.
//   - Los errores se traducen a `AuthError` sin filtrar detalles internos.

import { AuthError } from './errors';
import type { IdentityTokens } from './types';

export const IDENTITY_SIGN_IN_URL =
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
export const IDENTITY_REFRESH_URL = 'https://securetoken.googleapis.com/v1/token';
const DEFAULT_TIMEOUT_MS = 15_000;

export interface IdentityPlatformOptions {
  /** Web API key de Identity Platform (pública). */
  readonly apiKey: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly signInUrl?: string;
  readonly refreshUrl?: string;
}

export interface IdentityPlatformClient {
  signInWithPassword(email: string, password: string): Promise<IdentityTokens>;
  refresh(refreshToken: string): Promise<IdentityTokens>;
}

type ErrorContext = 'sign-in' | 'refresh';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readPositiveNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function messageFor(code: AuthError['code']): string {
  switch (code) {
    case 'invalid_credentials':
      return 'El correo o la contraseña no son correctos.';
    case 'user_disabled':
      return 'Esta cuenta está deshabilitada. Contacta a soporte.';
    case 'too_many_attempts':
      return 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.';
    case 'invalid_session':
      return 'Tu sesión venció. Inicia sesión nuevamente.';
    case 'network':
      return 'No pudimos conectar con el servicio de autenticación. Revisa tu conexión.';
    case 'configuration':
      return 'La autenticación no está configurada en esta app.';
    default:
      return 'No pudimos completar la autenticación.';
  }
}

/**
 * Traduce el mensaje del proveedor a una causa estable.
 * No se conserva el mensaje original para evitar filtrarlo a la UI.
 */
function mapProviderError(
  providerMessage: string,
  status: number,
  context: ErrorContext,
): AuthError {
  const code = providerMessage.toUpperCase();

  const make = (authCode: AuthError['code'], retryAfterMs?: number) =>
    new AuthError(authCode, messageFor(authCode), {
      status,
      retryAfterMs,
    });

  if (status === 429 || code.includes('TOO_MANY_ATTEMPTS')) {
    return make('too_many_attempts', 60_000);
  }
  if (code.includes('USER_DISABLED')) return make('user_disabled');
  if (
    code.includes('API_KEY_INVALID') ||
    code.includes('API KEY NOT VALID') ||
    code.includes('OPERATION_NOT_ALLOWED') ||
    code.includes('CONFIGURATION_NOT_FOUND')
  ) {
    return make('configuration');
  }

  if (
    code.includes('INVALID_LOGIN_CREDENTIALS') ||
    code.includes('EMAIL_NOT_FOUND') ||
    code.includes('INVALID_PASSWORD') ||
    code.includes('INVALID_EMAIL')
  ) {
    return make('invalid_credentials');
  }

  if (
    code.includes('TOKEN_EXPIRED') ||
    code.includes('INVALID_REFRESH_TOKEN') ||
    code.includes('MISSING_REFRESH_TOKEN') ||
    code.includes('INVALID_GRANT_TYPE') ||
    code.includes('USER_NOT_FOUND')
  ) {
    return make(context === 'refresh' ? 'invalid_session' : 'invalid_credentials');
  }

  if (status === 401 || status === 400) {
    return make(context === 'refresh' ? 'invalid_session' : 'invalid_credentials');
  }

  return make('unknown');
}

/**
 * Crea el cliente REST. Si falta la API key, todas las llamadas fallan con
 * `configuration` (el gate de la app muestra el aviso correspondiente).
 */
export function createIdentityPlatformClient(
  options: IdentityPlatformOptions,
): IdentityPlatformClient {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    return unconfiguredIdentityClient;
  }

  const timeoutMs =
    Number.isFinite(options.timeoutMs) && (options.timeoutMs ?? 0) > 0
      ? Math.trunc(options.timeoutMs as number)
      : DEFAULT_TIMEOUT_MS;
  const fetchImpl: typeof fetch =
    options.fetchImpl ??
    ((input, init) => {
      if (typeof fetch !== 'function') {
        return Promise.reject(new Error('fetch no está disponible.'));
      }
      return fetch(input, init);
    });

  const signInUrl = options.signInUrl ?? IDENTITY_SIGN_IN_URL;
  const refreshUrl = options.refreshUrl ?? IDENTITY_REFRESH_URL;

  async function post(
    url: string,
    body: BodyInit,
    contentType: string,
    context: ErrorContext,
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          Accept: 'application/json',
        },
        body,
        signal: controller.signal,
      });
    } catch (error) {
      const name = (error as { name?: string } | null)?.name;
      if (timedOut || name === 'AbortError') {
        throw new AuthError('network', messageFor('network'), { cause: error });
      }
      throw new AuthError('network', messageFor('network'), { cause: error });
    } finally {
      clearTimeout(timer);
    }

    let raw = '';
    try {
      raw = await response.text();
    } catch {
      raw = '';
    }

    let parsed: unknown = null;
    if (raw.trim().length > 0) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    if (response.ok && isRecord(parsed)) {
      return parsed;
    }

    const providerMessage =
      isRecord(parsed) && isRecord(parsed.error)
        ? String(parsed.error.message ?? '')
        : '';
    throw mapProviderError(providerMessage, response.status, context);
  }

  return {
    async signInWithPassword(
      email: string,
      password: string,
    ): Promise<IdentityTokens> {
      const data = await post(
        `${signInUrl}?key=${encodeURIComponent(apiKey)}`,
        JSON.stringify({ email, password, returnSecureToken: true }),
        'application/json',
        'sign-in',
      );

      const idToken = readString(data.idToken);
      const refreshToken = readString(data.refreshToken);
      if (!idToken || !refreshToken) {
        throw new AuthError('unknown', messageFor('unknown'));
      }

      return {
        idToken,
        refreshToken,
        expiresInSeconds: readPositiveNumber(data.expiresIn),
      };
    },

    async refresh(refreshToken: string): Promise<IdentityTokens> {
      if (!refreshToken) {
        throw new AuthError('invalid_session', messageFor('invalid_session'));
      }

      const form = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

      const data = await post(
        `${refreshUrl}?key=${encodeURIComponent(apiKey)}`,
        form.toString(),
        'application/x-www-form-urlencoded',
        'refresh',
      );

      const idToken = readString(data.id_token);
      if (!idToken) {
        throw new AuthError('invalid_session', messageFor('invalid_session'));
      }

      return {
        idToken,
        // Identity Platform rota el refresh token; si no viene, se conserva.
        refreshToken: readString(data.refresh_token) ?? refreshToken,
        expiresInSeconds: readPositiveNumber(data.expires_in),
      };
    },
  };
}

/** Cliente inerte cuando no hay `EXPO_PUBLIC_IDENTITY_API_KEY`. */
export const unconfiguredIdentityClient: IdentityPlatformClient = {
  async signInWithPassword(): Promise<IdentityTokens> {
    throw new AuthError('configuration', messageFor('configuration'));
  },
  async refresh(): Promise<IdentityTokens> {
    throw new AuthError('configuration', messageFor('configuration'));
  },
};
