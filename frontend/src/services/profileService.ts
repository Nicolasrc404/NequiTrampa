// ============================================================
// Servicio de perfil
// ============================================================
// Contrato verificado en `src/Nequi.Profile/Controllers/ProfileController.cs`:
//   GET   /v1/profile -> ProfileDto
//   PATCH /v1/profile { timezone?, alias? } -> ProfileDto
//
// Solo se editan `timezone` y `alias`; cualquier otro campo es de solo lectura.

import type { HttpClient } from './http';
import {
  asRecord,
  optionalString,
  requireString,
} from './contract';
import { normalizeBaseUrl } from '../utils/url';

export const MIN_ALIAS_LENGTH = 2;
export const MAX_ALIAS_LENGTH = 50;

export interface ProfileDto {
  readonly clientId: string;
  readonly authSubject: string;
  readonly email: string;
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly alias: string | null;
  readonly transferCode: string;
  readonly status: string;
  readonly timezone: string;
  readonly walletId: string | null;
  readonly walletStatus: string | null;
  readonly currency: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface UpdateProfileInput {
  readonly timezone?: string;
  readonly alias?: string;
}

export interface ProfileService {
  get(options?: { readonly signal?: AbortSignal }): Promise<ProfileDto>;
  update(
    input: UpdateProfileInput,
    options?: { readonly signal?: AbortSignal },
  ): Promise<ProfileDto>;
}

function parseProfile(payload: unknown): ProfileDto {
  const dto = asRecord(payload, 'profile');
  return {
    clientId: requireString(dto, 'clientId'),
    authSubject: requireString(dto, 'authSubject'),
    email: requireString(dto, 'email'),
    username: requireString(dto, 'username'),
    firstName: requireString(dto, 'firstName'),
    lastName: requireString(dto, 'lastName'),
    alias: optionalString(dto, 'alias'),
    transferCode: requireString(dto, 'transferCode'),
    status: requireString(dto, 'status'),
    timezone: requireString(dto, 'timezone'),
    walletId: optionalString(dto, 'walletId'),
    walletStatus: optionalString(dto, 'walletStatus'),
    currency: optionalString(dto, 'currency'),
    createdAt: optionalString(dto, 'createdAt'),
    updatedAt: optionalString(dto, 'updatedAt'),
  };
}

export function createProfileService(http: HttpClient): ProfileService {
  if (!normalizeBaseUrl(http.baseUrl)) {
    throw new Error('createProfileService: cliente HTTP sin URL base válida.');
  }

  return {
    async get(options) {
      const payload = await http.get<unknown>('/v1/profile', {
        signal: options?.signal,
      });
      return parseProfile(payload);
    },

    async update(input, options) {
      const timezone = input.timezone?.trim();
      const alias = input.alias?.trim();
      if (!timezone && !alias) {
        throw new Error('Envía al menos timezone o alias para actualizar.');
      }
      if (alias !== undefined && (alias.length < MIN_ALIAS_LENGTH || alias.length > MAX_ALIAS_LENGTH)) {
        throw new Error(
          `El alias debe tener entre ${MIN_ALIAS_LENGTH} y ${MAX_ALIAS_LENGTH} caracteres.`,
        );
      }
      const body: Record<string, string> = {};
      if (timezone) body.timezone = timezone;
      if (alias) body.alias = alias;

      const payload = await http.patch<unknown>('/v1/profile', body, {
        signal: options?.signal,
      });
      return parseProfile(payload);
    },
  };
}
