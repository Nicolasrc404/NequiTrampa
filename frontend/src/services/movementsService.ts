// ============================================================
// Servicio de movimientos
// ============================================================
// Contrato verificado en `src/Nequi.Finance/Movements/MovementsEndpoints.cs`:
//   GET /v1/movements?limit=N -> { clientId, count, limit, items[] }
//
// Reglas del contrato:
//   - Solo existe listado. No hay detalle, búsqueda ni paginación por cursor.
//   - El backend limita a 200 elementos por solicitud.
//   - Un CLIENTE nunca puede enviar `clientId`; lo resuelve el backend desde el
//     token o desde el directorio de clientes. El frontend no lo envía.
//   - `count` es el tamaño de la página, no el total histórico.

import type { HttpClient } from './http';
import {
  asRecord,
  optionalSafeInteger,
  optionalString,
  requireArray,
  requireSafeInteger,
  requireString,
} from './contract';
import { normalizeBaseUrl } from '../utils/url';

export const MOVEMENTS_DEFAULT_LIMIT = 50;
export const MOVEMENTS_MAX_LIMIT = 200;

export interface MovementDto {
  readonly eventId: string | null;
  readonly operationId: string | null;
  readonly type: string | null;
  readonly amountCents: number;
  readonly currency: string | null;
  readonly counterpartyClientId: string | null;
  readonly description: string | null;
  readonly balanceAfterCents: number | null;
  readonly occurredAt: string | null;
  readonly syncStatus: string | null;
  readonly status: string | null;
}

export interface MovementsPageDto {
  readonly clientId: string;
  readonly count: number;
  readonly limit: number;
  readonly items: readonly MovementDto[];
}

export interface ListMovementsOptions {
  /** 1..200. Por defecto 50, igual que el backend. */
  readonly limit?: number;
  readonly signal?: AbortSignal;
}

export interface MovementsService {
  list(options?: ListMovementsOptions): Promise<MovementsPageDto>;
}

function parseMovement(payload: unknown): MovementDto {
  const dto = asRecord(payload, 'movement');
  return {
    eventId: optionalString(dto, 'eventId'),
    operationId: optionalString(dto, 'operationId'),
    type: optionalString(dto, 'type'),
    amountCents: requireSafeInteger(dto, 'amountCents'),
    currency: optionalString(dto, 'currency'),
    counterpartyClientId: optionalString(dto, 'counterpartyClientId'),
    description: optionalString(dto, 'description'),
    balanceAfterCents: optionalSafeInteger(dto, 'balanceAfterCents'),
    occurredAt: optionalString(dto, 'occurredAt'),
    syncStatus: optionalString(dto, 'syncStatus'),
    status: optionalString(dto, 'status'),
  };
}

function parsePage(payload: unknown): MovementsPageDto {
  const dto = asRecord(payload, 'movements');
  const items = requireArray(dto, 'items').map(parseMovement);
  return {
    clientId: requireString(dto, 'clientId'),
    count: requireSafeInteger(dto, 'count', { min: 0 }),
    limit: requireSafeInteger(dto, 'limit', {
      min: 1,
      max: MOVEMENTS_MAX_LIMIT,
    }),
    items,
  };
}

export function createMovementsService(http: HttpClient): MovementsService {
  if (!normalizeBaseUrl(http.baseUrl)) {
    throw new Error('createMovementsService: cliente HTTP sin URL base válida.');
  }
  return {
    async list(options = {}) {
      const limit = options.limit ?? MOVEMENTS_DEFAULT_LIMIT;
      if (!Number.isInteger(limit) || limit < 1 || limit > MOVEMENTS_MAX_LIMIT) {
        throw new RangeError(
          `limit debe estar entre 1 y ${MOVEMENTS_MAX_LIMIT}.`,
        );
      }
      // Deliberadamente no se acepta `clientId`: un cliente no puede consultar
      // los movimientos de otro.
      const payload = await http.get<unknown>('/v1/movements', {
        query: { limit },
        signal: options.signal,
      });
      return parsePage(payload);
    },
  };
}
