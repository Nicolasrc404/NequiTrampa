// ============================================================
// Registro de clientes nuevos
// ============================================================
// Contrato verificado en `src/Nequi.Profile/Controllers/RegisterController.cs`:
//   POST /v1/auth/register { email, password, firstName, lastName } -> 201 ProfileDto
//
// El auto-registro público de Identity Platform permanece desactivado: el
// backend crea la identidad con su cuenta de servicio. Este cliente solo
// habla con el Gateway, nunca directo con Identity Platform.

import { createHttpClient } from '../http/client';
import { ApiError, asApiError } from '../http/ApiError';
import { appConfig } from '../../config/appConfig';

export interface RegisterInput {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
}

export interface RegistrationClient {
  register(input: RegisterInput): Promise<void>;
}

function createUnconfiguredClient(): RegistrationClient {
  return {
    register() {
      return Promise.reject(
        ApiError.fromTransport(
          'unexpected',
          new Error('El API Gateway no está configurado.'),
        ),
      );
    },
  };
}

export function createRegistrationClient(): RegistrationClient {
  if (!appConfig.apiBaseUrl) return createUnconfiguredClient();

  const http = createHttpClient({
    baseUrl: appConfig.apiBaseUrl,
    timeoutMs: appConfig.requestTimeoutMs,
  });

  return {
    async register(input: RegisterInput): Promise<void> {
      try {
        await http.post<unknown>(
          '/v1/auth/register',
          {
            email: input.email.trim(),
            password: input.password,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
          },
          { skipAuth: true },
        );
      } catch (error) {
        throw asApiError(error);
      }
    },
  };
}

export const registrationClient: RegistrationClient = createRegistrationClient();
