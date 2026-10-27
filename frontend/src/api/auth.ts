// Compatibilidad de Auth para Backoffice.
// La fuente única de sesión es services/session/sessionManager: refresh token
// en SecureStore (nativo), ID token en memoria y roles derivados del JWT.

import { requireApiClient } from '../services/api';
import { sessionManager } from '../services/session/platform';
import type { SessionSnapshot } from '../services/session/types';
import { ApiError } from './http';

export function subscribeSession(listener: () => void): () => void {
  return sessionManager.subscribe(() => listener());
}

export function hasSession(): boolean {
  return sessionManager.getSnapshot().status === 'authenticated';
}

/** El token no expone el correo en la vista pública de la sesión. */
export function sessionEmail(): string {
  return '';
}

export async function restoreSession(): Promise<SessionSnapshot> {
  return sessionManager.restore();
}

export async function signIn(email: string, password: string): Promise<void> {
  try {
    await sessionManager.signIn(email, password);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : 'No pudimos iniciar sesión.';
    throw new ApiError(401, message, 'authentication_error');
  }
}

export function signOut(): Promise<void> {
  return sessionManager.signOut();
}

export async function fetchRoles(): Promise<string[]> {
  try {
    const response = await requireApiClient().get<unknown>('/v1/me/access');
    if (response === null || typeof response !== 'object' || Array.isArray(response)) {
      throw new Error('Respuesta de acceso inválida.');
    }
    const roles = (response as { roles?: unknown }).roles;
    if (!Array.isArray(roles) || roles.some((role) => typeof role !== 'string')) {
      throw new Error('Respuesta de roles inválida.');
    }
    return roles;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'No pudimos consultar tus permisos.', 'access_error');
  }
}
