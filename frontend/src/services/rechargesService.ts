// ============================================================
// Servicio de recargas
// ============================================================
// Contrato verificado en `src/Nequi.Wallet/Controllers/RechargesController.cs`:
//   POST /v1/recharges -> 201 RechargeResponseDto
//   GET  /v1/recharges -> RechargeResponseDto[]
//
// La recarga actual es "simulada" y el backend exige uno de los métodos
// `SIMULATED_PSE | SIMULATED_CARD | SIMULATED_CORRESPONSAL`. El diseño Stitch
// de Recharges_01 solo elige monto: la selección de método es una decisión de
// producto pendiente. La app usa `SIMULATED_PSE` como método explícito y
// documentado, nunca lo deduce del usuario.

import type { HttpClient } from './http';
import {
  asRecord,
  centsToCopAmount,
  requireArray,
  requireSafeInteger,
  requireString,
  ServiceContractError,
} from './contract';
import { requireIdempotencyKey } from './idempotency';
import { normalizeBaseUrl } from '../utils/url';

export const MIN_RECHARGE_CENTS = 100_000; // $1.000 COP
export const MAX_RECHARGE_CENTS = 500_000_000; // $5.000.000 COP

export const RECHARGE_PAYMENT_METHODS = [
  'SIMULATED_PSE',
  'SIMULATED_CARD',
  'SIMULATED_CORRESPONSAL',
] as const;

export type RechargePaymentMethod = (typeof RECHARGE_PAYMENT_METHODS)[number];

/** Método que la app envía mientras el diseño no permita elegirlo. */
export const DEFAULT_RECHARGE_PAYMENT_METHOD: RechargePaymentMethod =
  'SIMULATED_PSE';

export interface RechargeDto {
  readonly rechargeId: string;
  readonly clientId: string;
  readonly amount: number;
  readonly amountCents: number;
  readonly currency: 'COP';
  readonly paymentMethod: string;
  readonly status: string;
  readonly ledgerOperationId: string;
  readonly timestamp: string;
}

export interface CreateRechargeInput {
  readonly amountCents: number;
  readonly paymentMethod?: RechargePaymentMethod;
}

export interface RechargeRequestOptions {
  readonly idempotencyKey: string;
  readonly signal?: AbortSignal;
}

export interface RechargesService {
  create(
    input: CreateRechargeInput,
    options: RechargeRequestOptions,
  ): Promise<RechargeDto>;
  list(options?: { readonly signal?: AbortSignal }): Promise<readonly RechargeDto[]>;
}

function parseRecharge(payload: unknown): RechargeDto {
  const dto = asRecord(payload, 'recharge');
  const currency = requireString(dto, 'currency');
  if (currency !== 'COP') {
    throw new ServiceContractError(
      'La recarga no está denominada en COP.',
      'currency',
    );
  }
  return {
    rechargeId: requireString(dto, 'rechargeId'),
    clientId: requireString(dto, 'clientId'),
    amount: requireFiniteNumber(dto, 'amount'),
    amountCents: requireSafeInteger(dto, 'amountCents', { min: 1 }),
    currency: 'COP',
    paymentMethod: requireString(dto, 'paymentMethod'),
    status: requireString(dto, 'status'),
    ledgerOperationId: requireString(dto, 'ledgerOperationId'),
    timestamp: requireString(dto, 'timestamp'),
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

function validateAmountCents(amountCents: number): number {
  if (!Number.isSafeInteger(amountCents)) {
    throw new Error('El monto debe ser un entero de centavos.');
  }
  if (amountCents < MIN_RECHARGE_CENTS || amountCents > MAX_RECHARGE_CENTS) {
    throw new Error('El monto debe estar entre $1.000 y $5.000.000 COP.');
  }
  return amountCents;
}

export function createRechargesService(http: HttpClient): RechargesService {
  if (!normalizeBaseUrl(http.baseUrl)) {
    throw new Error('createRechargesService: cliente HTTP sin URL base válida.');
  }

  return {
    async create(input, options) {
      const idempotencyKey = requireIdempotencyKey(options.idempotencyKey);
      const amountCents = validateAmountCents(input.amountCents);
      const paymentMethod =
        input.paymentMethod ?? DEFAULT_RECHARGE_PAYMENT_METHOD;
      if (!RECHARGE_PAYMENT_METHODS.includes(paymentMethod)) {
        throw new Error('Método de recarga simulada no soportado.');
      }

      const payload = await http.post<unknown>(
        '/v1/recharges',
        {
          amount: centsToCopAmount(amountCents),
          paymentMethod,
          currency: 'COP',
        },
        { idempotencyKey, signal: options.signal },
      );
      return parseRecharge(payload);
    },

    async list(options = {}) {
      const payload = await http.get<unknown>('/v1/recharges', {
        signal: options.signal,
      });
      if (!Array.isArray(payload)) {
        throw new ServiceContractError(
          'El historial de recargas no es una lista.',
          'recharges',
        );
      }
      return payload.map(parseRecharge);
    },
  };
}
