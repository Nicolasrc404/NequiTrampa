// ============================================================
// Cliente HTTP de la aplicación
// ============================================================
// Única instancia que consume el API Gateway. Adjunta el ID token de la sesión
// y, ante un 401, invalida la sesión local para que el gate vuelva a pedir
// autenticación. No hay reintento automático en 401.

import { appConfig } from '../config/appConfig';
import { createHttpClient, type HttpClient } from './http';
import { sessionManager } from './session/platform';
import { configureHttp } from '../api/http';

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

// api/http.ts es un adaptador heredado que siguen usando Backoffice y
// servicios antiguos; sin esto su tokenProvider se queda en `null` y esas
// peticiones viajan sin Authorization.
configureHttp({
  getToken: () => sessionManager.getAccessToken(),
  onUnauthorized: () => {
    void sessionManager.handleUnauthorized();
  },
});

/** Falla explícitamente si no hay `EXPO_PUBLIC_API_URL` configurada. */
export function requireApiClient(): HttpClient {
  if (!apiClient) {
    throw new Error(
      'La API no está configurada. Define EXPO_PUBLIC_API_URL con la URL del gateway.',
    );
  }
  return apiClient;
}
