// ============================================================
// Configuración de entorno (pública, sin secretos)
// ============================================================
// Reglas:
//  - Solo se leen variables EXPO_PUBLIC_*, que quedan embebidas en el bundle.
//    Nunca deben contener claves privadas, tokens ni credenciales.
//  - El modo DEMO requiere build de desarrollo (__DEV__) Y no estar desactivado
//    de forma explícita. En producción queda siempre desactivado.
//  - `resolveAppConfig` es puro para poder probarse sin React Native.

import { normalizeBaseUrl } from '../utils/url';

export { normalizeBaseUrl };

export interface EnvSource {
  readonly [key: string]: string | undefined;
}

export interface AppRuntimeConfig {
  /** URL base del API Gateway, sin barra final. `null` si no está configurada o es inválida. */
  readonly apiBaseUrl: string | null;
  /** `true` si hay una URL de API utilizable. */
  readonly apiConfigured: boolean;
  /**
   * Web API key de Identity Platform. Es pública por diseño; `null` si no se
   * configuró. Nunca debe contener secretos de servidor.
   */
  readonly identityApiKey: string | null;
  /** Timeout de la capa HTTP en milisegundos. */
  readonly requestTimeoutMs: number;
  /** Modo DEMO efectivo: solo puede ser `true` en desarrollo. */
  readonly demoModeEnabled: boolean;
  /** El entorno pidió DEMO pero fue bloqueado por no ser build de desarrollo. */
  readonly demoModeBlockedInProduction: boolean;
  readonly isDev: boolean;
  readonly environmentLabel: 'development' | 'production';
}

export interface ResolveAppConfigInput {
  readonly isDev: boolean;
  readonly env: EnvSource;
}

export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
export const MIN_REQUEST_TIMEOUT_MS = 3_000;
export const MAX_REQUEST_TIMEOUT_MS = 60_000;

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'off']);

function readBoolean(raw: string | undefined): boolean | undefined {
  if (raw === undefined) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return undefined;
}

/** Clave pública de navegador: se recorta y queda `null` si está vacía. */
function readPublicKey(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseTimeout(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_REQUEST_TIMEOUT_MS;
  const parsed = Number(raw.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_REQUEST_TIMEOUT_MS;
  return Math.min(
    MAX_REQUEST_TIMEOUT_MS,
    Math.max(MIN_REQUEST_TIMEOUT_MS, Math.trunc(parsed)),
  );
}

/**
 * Resuelve la configuración efectiva de la app.
 * El modo DEMO nunca puede activarse fuera de un build de desarrollo.
 */
export function resolveAppConfig({
  isDev,
  env,
}: ResolveAppConfigInput): AppRuntimeConfig {
  const apiBaseUrl = normalizeBaseUrl(env.EXPO_PUBLIC_API_URL);
  const demoRequested = readBoolean(env.EXPO_PUBLIC_DEMO_MODE) ?? isDev;
  const demoModeBlockedInProduction = !isDev && demoRequested;
  const demoModeEnabled = isDev && demoRequested;

  return {
    apiBaseUrl,
    apiConfigured: apiBaseUrl !== null,
    identityApiKey: readPublicKey(env.EXPO_PUBLIC_IDENTITY_API_KEY),
    requestTimeoutMs: parseTimeout(env.EXPO_PUBLIC_API_TIMEOUT_MS),
    demoModeEnabled,
    demoModeBlockedInProduction,
    isDev,
    environmentLabel: isDev ? 'development' : 'production',
  };
}

/**
 * Acceso estático y literal a `process.env` para que Expo pueda inlinearlo
 * en el bundle (solo funciona con notación de punto directa).
 */
function readExpoPublicEnv(): EnvSource {
  return {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_DEMO_MODE: process.env.EXPO_PUBLIC_DEMO_MODE,
    EXPO_PUBLIC_API_TIMEOUT_MS: process.env.EXPO_PUBLIC_API_TIMEOUT_MS,
    EXPO_PUBLIC_IDENTITY_API_KEY: process.env.EXPO_PUBLIC_IDENTITY_API_KEY,
  };
}

const isDevBuild = typeof __DEV__ === 'undefined' ? false : __DEV__;

/** Configuración activa de la aplicación. */
export const appConfig: AppRuntimeConfig = resolveAppConfig({
  isDev: isDevBuild,
  env: readExpoPublicEnv(),
});

export function isDemoModeEnabled(): boolean {
  return appConfig.demoModeEnabled;
}

export function isApiConfigured(): boolean {
  return appConfig.apiConfigured;
}
