// ============================================================
// Cableado de plataforma de la sesión
// ============================================================
// Este módulo es el único que conoce Expo/React Native. El núcleo de sesión
// (`sessionManager`, `storage`, `identityPlatform`) es puro y testeable.
//
// - Nativo: refresh token en SecureStore (Keychain / Keystore).
// - Web: memoria. `expo-secure-store` no tiene implementación web y los tokens
//   nunca se guardan en `localStorage`.

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { appConfig } from '../../config/appConfig';
import { idempotencyKeys } from '../../utils/idempotency';
import { createIdentityPlatformClient, unconfiguredIdentityClient } from './identityPlatform';
import { SessionManager } from './sessionManager';
import {
  createSecureSessionStorage,
  MemorySessionStorage,
  type SessionStorage,
} from './storage';

export const sessionStorage: SessionStorage =
  Platform.OS === 'web'
    ? new MemorySessionStorage()
    : createSecureSessionStorage(SecureStore);

export const identityPlatformClient = appConfig.identityApiKey
  ? createIdentityPlatformClient({ apiKey: appConfig.identityApiKey })
  : unconfiguredIdentityClient;

/** Instancia única de sesión para toda la app. */
export const sessionManager = new SessionManager({
  storage: sessionStorage,
  identity: identityPlatformClient,
  onSessionCleared: () => {
    idempotencyKeys.clear();
  },
});
