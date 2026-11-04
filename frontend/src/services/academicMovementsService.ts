import type { WalletBalanceDto } from '../types/wallet';
import type { RechargeDto, RechargesService } from './rechargesService';
import type { TransferDto, TransfersService } from './transfersService';
import { buildAcademicMovementDtos } from './mappers/academicMovementMapper';
import type { MovementDto } from './movementsService';

function diagnostic(event: string, details: Readonly<Record<string, unknown>>): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.debug(`[academic-movements] ${event}`, details);
  }
}

export interface AcademicMovementDependencies {
  readonly wallet: {
    getBalance(options?: { readonly signal?: AbortSignal }): Promise<WalletBalanceDto>;
  };
  readonly transfers: Pick<TransfersService, 'list'>;
  readonly recharges: Pick<RechargesService, 'list'>;
}

/** Carga el historial académico completo desde los listados de Wallet. */
export async function loadAcademicMovementDtos(
  dependencies: AcademicMovementDependencies,
  ownClientId: string | null,
  signal?: AbortSignal,
): Promise<MovementDto[]> {
  const startedAt = Date.now();
  diagnostic('start', {
    hasClientId: Boolean(ownClientId?.trim()),
    methods: ['GET /v1/wallet/balance', 'GET /v1/transfers', 'GET /v1/recharges'],
  });
  try {
    const clientId =
      ownClientId?.trim() ||
      (await dependencies.wallet.getBalance({ signal })).clientId;
    const transfers: TransferDto[] = [];
    for (let page = 1; ; page += 1) {
      const batch = await dependencies.transfers.list({ page, pageSize: 100, signal });
      transfers.push(...batch);
      if (batch.length < 100) break;
    }
    const recharges = await dependencies.recharges.list({ signal });
    const items = buildAcademicMovementDtos(transfers, recharges, clientId);
    diagnostic('success', {
      durationMs: Date.now() - startedAt,
      transfers: transfers.length,
      recharges: recharges.length,
      movements: items.length,
    });
    return items;
  } catch (error) {
    diagnostic('failure', {
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.name : 'unknown',
    });
    throw error;
  }
}
