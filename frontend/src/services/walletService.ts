// ============================================================
// Servicio de billetera (Wallet)
// ============================================================
// Contrato verificado en `src/Nequi.Wallet/Controllers/WalletController.cs`:
//   GET /v1/wallet          -> WalletResponseDto
//   GET /v1/wallet/balance  -> WalletBalanceResponseDto
//
// La autoridad del saldo es el backend. `sourceAuthority` se conserva para que
// la UI pueda distinguir una proyección/caché de un saldo contable, pero este
// módulo nunca convierte una proyección en un saldo confirmado.

import type { HttpClient } from './http';
import {
  asRecord,
  optionalString,
  requireSafeInteger,
  requireString,
  ServiceContractError,
} from './contract';
import { normalizeBaseUrl } from '../utils/url';

export interface WalletDto {
  readonly walletId: string;
  readonly clientId: string;
  readonly phoneNumber: string;
  readonly status: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED' | string;
  readonly currency: 'COP';
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface WalletBalanceDto {
  readonly walletId: string;
  readonly clientId: string;
  /** Saldo decimal del backend (solo presentación). */
  readonly availableBalance: number;
  /** Saldo en centavos: única representación usada para operar. */
  readonly availableBalanceCents: number;
  readonly currency: 'COP';
  readonly asOfTimestamp: string | null;
  /** `MOCK_IN_MEMORY`, `SPANNER`, etc. No es un indicador de confianza por sí solo. */
  readonly sourceAuthority: string;
}

export interface WalletService {
  getWallet(options?: { readonly signal?: AbortSignal }): Promise<WalletDto>;
  getBalance(options?: { readonly signal?: AbortSignal }): Promise<WalletBalanceDto>;
}

function parseWallet(payload: unknown): WalletDto {
  const dto = asRecord(payload, 'wallet');
  const currency = requireString(dto, 'currency');
  if (currency !== 'COP') {
    throw new ServiceContractError("La billetera no está denominada en COP.", 'currency');
  }
  return {
    walletId: requireString(dto, 'walletId'),
    clientId: requireString(dto, 'clientId'),
    phoneNumber: optionalString(dto, 'phoneNumber') ?? '',
    status: requireString(dto, 'status'),
    currency: 'COP',
    createdAt: optionalString(dto, 'createdAt'),
    updatedAt: optionalString(dto, 'updatedAt'),
  };
}

function parseBalance(payload: unknown): WalletBalanceDto {
  const dto = asRecord(payload, 'balance');
  const currency = requireString(dto, 'currency');
  if (currency !== 'COP') {
    throw new ServiceContractError('El saldo no está denominado en COP.', 'currency');
  }
  // El backend devuelve enteros (int64). Un decimal aquí indicaría un contrato
  // distinto: no se redondea silenciosamente.
  const availableBalanceCents = requireSafeInteger(dto, 'availableBalanceCents', {
    min: 0,
  });
  const availableBalance = dto.availableBalance;
  if (typeof availableBalance !== 'number' || !Number.isFinite(availableBalance)) {
    throw new ServiceContractError(
      "El campo 'availableBalance' no es numérico.",
      'availableBalance',
    );
  }
  return {
    walletId: requireString(dto, 'walletId'),
    clientId: requireString(dto, 'clientId'),
    availableBalance,
    availableBalanceCents,
    currency: 'COP',
    asOfTimestamp: optionalString(dto, 'asOfTimestamp'),
    sourceAuthority: optionalString(dto, 'sourceAuthority') ?? 'UNKNOWN',
  };
}

export function createWalletService(http: HttpClient): WalletService {
  if (!normalizeBaseUrl(http.baseUrl)) {
    throw new Error('createWalletService: cliente HTTP sin URL base válida.');
  }
  return {
    async getWallet(options) {
      const payload = await http.get<unknown>('/v1/wallet', {
        signal: options?.signal,
      });
      return parseWallet(payload);
    },
    async getBalance(options) {
      const payload = await http.get<unknown>('/v1/wallet/balance', {
        signal: options?.signal,
      });
      return parseBalance(payload);
    },
  };
}
