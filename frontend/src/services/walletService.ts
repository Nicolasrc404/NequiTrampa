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
import type { WalletBalanceDto, WalletDto } from '../types/wallet';

// Compatibilidad para consumidores que aún importan tipos desde el servicio.
export type { WalletBalanceDto, WalletDto } from '../types/wallet';

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
