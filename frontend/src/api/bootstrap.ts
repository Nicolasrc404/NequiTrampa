// ============================================================
// Cableado de la capa HTTP antigua (Backoffice) con la sesión única
// ============================================================
// `src/api/http.ts` es agnóstico de sesión para poder probarse con dobles.
// Este módulo es el único punto que la conecta con `sessionManager` y debe
// evaluarse antes de la primera petición del Backoffice.

import { sessionManager } from '../services/session/platform';
import { configureHttp } from './http';

configureHttp({
  getToken: () => sessionManager.getAccessToken(),
  onUnauthorized: (accessToken) => {
    void sessionManager.handleUnauthorized(accessToken);
  },
});
