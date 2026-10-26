// ============================================================
// Cliente HTTP de la aplicación
// ============================================================
// Única instancia que consume el API Gateway. Adjunta el ID token de la sesión
// y, ante un 401, invalida la sesión local para que el gate vuelva a pedir
// autenticación. No hay reintento automático en 401.

import { appConfig } from '../config/appConfig';
import { createHttpClient, type HttpClient } from './http';
import { createBackofficeService, type BackofficeService } from './backofficeService';
import { sessionManager } from './session/platform';

export const apiClient: HttpClient | null = appConfig.apiBaseUrl
  ? createHttpClient({
      baseUrl: appConfig.apiBaseUrl,
      timeoutMs: appConfig.requestTimeoutMs,
      getAccessToken: () => sessionManager.getAccessToken(),
      onUnauthorized: () => {
        void sessionManager.handleUnauthorized();
      },
    })
  : null;

/** Falla explícitamente si no hay `EXPO_PUBLIC_API_URL` configurada. */
export function requireApiClient(): HttpClient {
  if (!apiClient) {
    throw new Error(
      'La API no está configurada. Define EXPO_PUBLIC_API_URL con la URL del gateway.',
    );
  }
  return apiClient;
}

let backofficeService: BackofficeService | null = null;

/** Servicio del backoffice sobre el mismo cliente (y la misma sesión) de la app. */
export function requireBackoffice(): BackofficeService {
  backofficeService ??= createBackofficeService(requireApiClient());
  return backofficeService;
}
