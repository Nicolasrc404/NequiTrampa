import type { ApiServices } from '../services/factories';
import type { ApiResource } from './useApiResource';
import type { WalletBalanceDto, WalletDto } from '../types/wallet';
import { useApiResource } from './useApiResource';

function canLoad(services: ApiServices | null, enabled: boolean): boolean {
  return enabled && services !== null;
}

export function useWallet(
  services: ApiServices | null,
  enabled: boolean,
): ApiResource<WalletDto> {
  const active = canLoad(services, enabled);
  return useApiResource(
    active ? (signal) => services!.wallet.getWallet({ signal }) : null,
    [active, services],
  );
}

export function useWalletBalance(
  services: ApiServices | null,
  enabled: boolean,
): ApiResource<WalletBalanceDto> {
  const active = canLoad(services, enabled);
  return useApiResource(
    active ? (signal) => services!.wallet.getBalance({ signal }) : null,
    [active, services],
  );
}
