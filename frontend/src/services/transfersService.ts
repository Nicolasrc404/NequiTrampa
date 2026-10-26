// ============================================================
// Servicio de transferencias
// ============================================================
// Contrato verificado en `src/Nequi.Wallet/Controllers/TransfersController.cs`:
//   POST /v1/transfers            -> 201 TransferResponseDto
//   GET  /v1/transfers?page&pageSize -> TransferResponseDto[]
//   GET  /v1/transfers/{id}       -> TransferResponseDto
//   GET  /v1/transfers/{id}/receipt -> TransferReceiptDto
//
// `TransferId` de la respuesta es la referencia pública de la operación.
// El comprobante definitivo SOLO se obtiene de `/receipt`; nunca se fabrica en
// el cliente.
//
// Nota de contrato: `CreateTransferRequestDto.Amount` es un decimal en COP.
// La app opera en centavos enteros y solo convierte al serializar.

import type { HttpClient } from './http';
import {
  asRecord,
  centsToCopAmount,
  optionalString,
  requireSafeInteger,
  requireString,
  ServiceContractError,
} from './contract';
import { requireIdempotencyKey } from './idempotency';
import { copDecimalToCents } from '../utils/money';
import { normalizeBaseUrl } from '../utils/url';

/** Límite por operación: $2.000.000 COP. */
export const MAX_TRANSFER_CENTS = 200_000_000;
/** Monto mínimo aceptado por el DTO del backend: $1 COP. */
export const MIN_TRANSFER_CENTS = 100;
export const MAX_TRANSFER_CODE_LENGTH = 20;
export const MAX_TRANSFER_DESCRIPTION_LENGTH = 140;
export const DEFAULT_TRANSFER_PAGE_SIZE = 20;

const DESTINATION_CODE_PATTERN = /^[A-Za-z0-9_-]+$/;

export interface TransferDto {
  readonly transferId: string;
  readonly originClientId: string;
  readonly destinationClientId: string;
  readonly destinationTransferCode: string;
  readonly amount: number;
  readonly amountCents: number;
  readonly currency: 'COP';
  readonly status: string;
  readonly ledgerOperationId: string;
  readonly timestamp: string;
  readonly description: string | null;
}

export interface TransferReceiptDto {
  readonly receiptNumber: string;
  readonly transferId: string;
  readonly originMaskedTransferCode: string;
  readonly destinationMaskedTransferCode: string;
  readonly amount: number;
  readonly amountCents: number;
  readonly currency: 'COP';
  readonly completedAt: string;
  readonly authorizationCode: string;
  readonly status: string;
}

export interface CreateTransferInput {
  readonly destinationTransferCode: string;
  readonly amountCents: number;
  readonly description?: string | null;
}

export interface ListTransfersOptions {
  readonly page?: number;
  readonly pageSize?: number;
  readonly signal?: AbortSignal;
}

export interface TransferRequestOptions {
  readonly idempotencyKey: string;
  readonly signal?: AbortSignal;
}

export interface TransfersService {
  create(input: CreateTransferInput, options: TransferRequestOptions): Promise<TransferDto>;
  list(options?: ListTransfersOptions): Promise<readonly TransferDto[]>;
  getById(id: string, options?: { readonly signal?: AbortSignal }): Promise<TransferDto>;
  getReceipt(id: string, options?: { readonly signal?: AbortSignal }): Promise<TransferReceiptDto>;
}

function parseTransfer(payload: unknown): TransferDto {
  const dto = asRecord(payload, 'transfer');
  const currency = requireString(dto, 'currency');
  if (currency !== 'COP') {
    throw new ServiceContractError(
      'La transferencia no está denominada en COP.',
      'currency',
    );
  }
  return {
    transferId: requireString(dto, 'transferId'),
    originClientId: requireString(dto, 'originClientId'),
    destinationClientId: requireString(dto, 'destinationClientId'),
    destinationTransferCode: requireString(dto, 'destinationTransferCode'),
    amount: requireFiniteNumber(dto, 'amount'),
    amountCents: requireSafeInteger(dto, 'amountCents', { min: 1 }),
    currency: 'COP',
    status: requireString(dto, 'status'),
    ledgerOperationId: requireString(dto, 'ledgerOperationId'),
    timestamp: requireString(dto, 'timestamp'),
    description: optionalString(dto, 'description'),
  };
}

function requireFiniteNumber(
  source: Readonly<Record<string, unknown>>,
  key: string,
): number {
  const value = source[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ServiceContractError(
      `El campo '${key}' de la respuesta no es numérico.`,
      key,
    );
  }
  return value;
}

function parseReceipt(payload: unknown): TransferReceiptDto {
  const dto = asRecord(payload, 'receipt');
  const currency = requireString(dto, 'currency');
  if (currency !== 'COP') {
    throw new ServiceContractError(
      'El comprobante no está denominado en COP.',
      'currency',
    );
  }
  const amount = requireFiniteNumber(dto, 'amount');
  let amountCents: number;
  try {
    amountCents = copDecimalToCents(amount);
  } catch {
    throw new ServiceContractError(
      'El monto del comprobante no es un decimal COP válido.',
      'amount',
    );
  }
  return {
    receiptNumber: requireString(dto, 'receiptNumber'),
    transferId: requireString(dto, 'transferId'),
    originMaskedTransferCode: requireString(dto, 'originMaskedTransferCode'),
    destinationMaskedTransferCode: requireString(dto, 'destinationMaskedTransferCode'),
    amount,
    amountCents,
    currency: 'COP',
    completedAt: requireString(dto, 'completedAt'),
    authorizationCode: requireString(dto, 'authorizationCode'),
    status: requireString(dto, 'status'),
  };
}

function normalizeCode(code: string): string {
  const trimmed = code.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > MAX_TRANSFER_CODE_LENGTH ||
    !DESTINATION_CODE_PATTERN.test(trimmed)
  ) {
    throw new Error(
      'El código de transferencia debe tener entre 1 y 20 caracteres alfanuméricos, guiones o guiones bajos.',
    );
  }
  return trimmed;
}

function validateAmountCents(amountCents: number): number {
  if (!Number.isSafeInteger(amountCents)) {
    throw new Error('El monto debe ser un entero de centavos.');
  }
  if (amountCents < MIN_TRANSFER_CENTS || amountCents > MAX_TRANSFER_CENTS) {
    throw new Error('El monto debe estar entre $1 y $2.000.000 COP.');
  }
  return amountCents;
}

export function createTransfersService(http: HttpClient): TransfersService {
  if (!normalizeBaseUrl(http.baseUrl)) {
    throw new Error('createTransfersService: cliente HTTP sin URL base válida.');
  }

  return {
    async create(input, options) {
      const idempotencyKey = requireIdempotencyKey(options.idempotencyKey);
      const destinationTransferCode = normalizeCode(input.destinationTransferCode);
      const amountCents = validateAmountCents(input.amountCents);
      const description = input.description?.trim() ?? '';
      if (description.length > MAX_TRANSFER_DESCRIPTION_LENGTH) {
        throw new Error(
          `La descripción no puede exceder ${MAX_TRANSFER_DESCRIPTION_LENGTH} caracteres.`,
        );
      }

      const payload = await http.post<unknown>(
        '/v1/transfers',
        {
          destinationTransferCode,
          amount: centsToCopAmount(amountCents),
          description: description.length > 0 ? description : null,
          currency: 'COP',
        },
        { idempotencyKey, signal: options.signal },
      );
      return parseTransfer(payload);
    },

    async list(options = {}) {
      const page = options.page ?? 1;
      const pageSize = options.pageSize ?? DEFAULT_TRANSFER_PAGE_SIZE;
      if (!Number.isInteger(page) || page < 1) {
        throw new RangeError('page debe ser un entero mayor o igual a 1.');
      }
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new RangeError('pageSize debe estar entre 1 y 100.');
      }
      const payload = await http.get<unknown>('/v1/transfers', {
        query: { page, pageSize },
        signal: options.signal,
      });
      if (!Array.isArray(payload)) {
        throw new ServiceContractError(
          'El historial de transferencias no es una lista.',
          'transfers',
        );
      }
      return payload.map(parseTransfer);
    },

    async getById(id, options) {
      const reference = (id ?? '').trim();
      if (reference.length === 0) {
        throw new Error('La transferencia requiere un identificador.');
      }
      const payload = await http.get<unknown>(
        `/v1/transfers/${encodeURIComponent(reference)}`,
        { signal: options?.signal },
      );
      return parseTransfer(payload);
    },

    async getReceipt(id, options) {
      const reference = (id ?? '').trim();
      if (reference.length === 0) {
        throw new Error('La transferencia requiere un identificador.');
      }
      const payload = await http.get<unknown>(
        `/v1/transfers/${encodeURIComponent(reference)}/receipt`,
        { signal: options?.signal },
      );
      return parseReceipt(payload);
    },
  };
}
