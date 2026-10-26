// ============================================================
// Servicio del registro personal de efectivo (Cash)
// ============================================================
// Contrato verificado en `src/Nequi.Finance/Cash/CashController.cs`:
//   GET  /v1/cash/balance              -> CashBalanceDto
//   GET  /v1/cash/movements?limit      -> CashMovementDto[]
//   POST /v1/cash/movements            -> 201 CashMovementCreatedDto
//
// Reglas:
//   - `Idempotency-Key` OBLIGATORIA en POST (filtro del backend).
//   - El efectivo es un registro personal declarado: NO es saldo bancario y
//     no genera asientos en el ledger.
//   - 409 CASH_DUPLICATE: el backend deduplica por fecha + dirección + monto +
//     categoría + nota. No se bloquea en el cliente un gasto legítimo repetido:
//     se muestra el conflicto del servidor.
//   - 422 CASH_INSUFFICIENT y 404 CATEGORY_NOT_FOUND se propagan clasificados.

import type { HttpClient } from './http';
import {
  asRecord,
  optionalString,
  requireOneOf,
  requireSafeInteger,
  requireString,
  ServiceContractError,
} from './contract';
import { requireIdempotencyKey } from './idempotency';
import { normalizeBaseUrl } from '../utils/url';

export const CASH_DEFAULT_LIMIT = 100;
export const CASH_MAX_LIMIT = 500;
export const MAX_CASH_NOTE_LENGTH = 140;
export const MAX_CASH_AMOUNT_CENTS = 1_000_000_000_000;
export const CASH_DIRECTIONS = ['income', 'expense'] as const;

export type CashDirectionDto = (typeof CASH_DIRECTIONS)[number];

export interface CashBalanceDto {
  readonly availableCents: number;
  readonly incomeCents: number;
  readonly expenseCents: number;
  readonly movementCount: number;
  readonly currency: 'COP';
  readonly updatedAt: string;
}

export interface CashMovementDto {
  readonly id: string;
  readonly direction: CashDirectionDto;
  /** Monto absoluto declarado, en centavos. */
  readonly amountCents: number;
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly note: string | null;
  readonly occurredOn: string;
  readonly balanceAfterCents: number;
  readonly createdAt: string;
}

export interface CashMovementCreatedDto {
  readonly movement: CashMovementDto;
  readonly balance: CashBalanceDto;
}

export interface CreateCashMovementInput {
  readonly direction: CashDirectionDto;
  readonly amountCents: number;
  readonly categoryId?: string | null;
  readonly note?: string | null;
  readonly occurredOn?: string | null;
}

export interface CashListOptions {
  readonly limit?: number;
  readonly signal?: AbortSignal;
}

export interface CashCreateOptions {
  readonly idempotencyKey: string;
  readonly signal?: AbortSignal;
}

export interface CashService {
  getBalance(options?: { readonly signal?: AbortSignal }): Promise<CashBalanceDto>;
  listMovements(options?: CashListOptions): Promise<readonly CashMovementDto[]>;
  createMovement(
    input: CreateCashMovementInput,
    options: CashCreateOptions,
  ): Promise<CashMovementCreatedDto>;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseBalance(payload: unknown): CashBalanceDto {
  const dto = asRecord(payload, 'cashBalance');
  const currency = requireString(dto, 'currency');
  if (currency !== 'COP') {
    throw new ServiceContractError(
      'El saldo de efectivo no está denominado en COP.',
      'currency',
    );
  }
  return {
    availableCents: requireSafeInteger(dto, 'availableCents', { min: 0 }),
    incomeCents: requireSafeInteger(dto, 'incomeCents', { min: 0 }),
    expenseCents: requireSafeInteger(dto, 'expenseCents', { min: 0 }),
    movementCount: requireSafeInteger(dto, 'movementCount', { min: 0 }),
    currency: 'COP',
    updatedAt: requireString(dto, 'updatedAt'),
  };
}

function parseMovement(payload: unknown): CashMovementDto {
  const dto = asRecord(payload, 'cashMovement');
  return {
    id: requireString(dto, 'id'),
    direction: requireOneOf(dto, 'direction', CASH_DIRECTIONS),
    amountCents: requireSafeInteger(dto, 'amountCents', { min: 1 }),
    categoryId: optionalString(dto, 'categoryId'),
    categoryName: optionalString(dto, 'categoryName'),
    note: optionalString(dto, 'note'),
    occurredOn: requireString(dto, 'occurredOn'),
    balanceAfterCents: requireSafeInteger(dto, 'balanceAfterCents', { min: 0 }),
    createdAt: requireString(dto, 'createdAt'),
  };
}

function parseCreated(payload: unknown): CashMovementCreatedDto {
  const dto = asRecord(payload, 'cashMovementCreated');
  return {
    movement: parseMovement(dto.movement),
    balance: parseBalance(dto.balance),
  };
}

function validateAmount(amountCents: number): number {
  if (!Number.isSafeInteger(amountCents)) {
    throw new Error('El monto debe ser un entero de centavos.');
  }
  if (amountCents < 1 || amountCents > MAX_CASH_AMOUNT_CENTS) {
    throw new Error('El monto debe ser un valor positivo en centavos de COP.');
  }
  return amountCents;
}

function validateOccurredOn(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim().length === 0) {
    return null;
  }
  const date = value.trim();
  if (!DATE_PATTERN.test(date)) {
    throw new Error('La fecha debe usar el formato YYYY-MM-DD.');
  }
  return date;
}

export function createCashService(http: HttpClient): CashService {
  if (!normalizeBaseUrl(http.baseUrl)) {
    throw new Error('createCashService: cliente HTTP sin URL base válida.');
  }

  return {
    async getBalance(options = {}) {
      const payload = await http.get<unknown>('/v1/cash/balance', {
        signal: options.signal,
      });
      return parseBalance(payload);
    },

    async listMovements(options = {}) {
      const limit = options.limit ?? CASH_DEFAULT_LIMIT;
      if (!Number.isInteger(limit) || limit < 1 || limit > CASH_MAX_LIMIT) {
        throw new RangeError(`limit debe estar entre 1 y ${CASH_MAX_LIMIT}.`);
      }
      const payload = await http.get<unknown>('/v1/cash/movements', {
        query: { limit },
        signal: options.signal,
      });
      if (!Array.isArray(payload)) {
        throw new ServiceContractError(
          'El historial de efectivo no es una lista.',
          'cashMovements',
        );
      }
      return payload.map(parseMovement);
    },

    async createMovement(input, options) {
      const idempotencyKey = requireIdempotencyKey(options.idempotencyKey);
      const direction = requireCashDirection(input.direction);
      const amountCents = validateAmount(input.amountCents);
      const categoryId = input.categoryId?.trim() ?? '';
      const note = input.note?.trim() ?? '';
      const occurredOn = validateOccurredOn(input.occurredOn);

      if (categoryId.length > 64) {
        throw new Error('El identificador de categoría no es válido.');
      }
      if (note.length > MAX_CASH_NOTE_LENGTH) {
        throw new Error(
          `La nota no puede exceder ${MAX_CASH_NOTE_LENGTH} caracteres.`,
        );
      }

      const payload = await http.post<unknown>(
        '/v1/cash/movements',
        {
          direction,
          amountCents,
          categoryId: categoryId.length > 0 ? categoryId : null,
          note: note.length > 0 ? note : null,
          occurredOn,
        },
        { idempotencyKey, signal: options.signal },
      );
      return parseCreated(payload);
    },
  };
}

function requireCashDirection(value: string): CashDirectionDto {
  if (!(CASH_DIRECTIONS as readonly string[]).includes(value)) {
    throw new Error("La dirección debe ser 'income' o 'expense'.");
  }
  return value as CashDirectionDto;
}
