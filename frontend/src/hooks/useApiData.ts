// ============================================================
// Hooks de lectura por dominio
// ============================================================
// Cada hook entrega un view model o un `ApiError` clasificado. No navega ni
// decide estados de pantalla: eso permanece en App.tsx.

import type { ApiServices } from '../services/factories';
import type {
  WalletBalanceDto,
  WalletDto,
} from '../services/walletService';
import type { MovementItem } from '../types/movements';
import type { TransferItem } from '../types/transfers';
import type { RechargeItem } from '../types/recharges';
import type { ProfileDto } from '../services/profileService';
import type {
  AssistantChatDto,
  AssistantSummaryDto,
} from '../services/assistantService';
import type { TransferDto, TransferReceiptDto } from '../services/transfersService';
import { MOVEMENTS_DEFAULT_LIMIT } from '../services/movementsService';
import { mapMovements } from '../services/mappers/movementMapper';
import { mapTransfers } from '../services/mappers/transferMapper';
import {
  mapRecharges,
  mapRechargeResult,
} from '../services/mappers/rechargeMapper';
import type { RechargeResult } from '../types/recharges';
import type { BeneficiaryItem } from '../types/beneficiaries';
import type { CategoryItem } from '../types/categories';
import type { BudgetDetail, BudgetItem } from '../types/budgets';
import type { GoalItem } from '../types/goals';
import type {
  AnalyticsCategoryData,
  AnalyticsSummaryData,
  AnalyticsTrendData,
} from '../types/analytics';
import type { CashBalanceDto } from '../services/cashService';
import type { CashTransaction } from '../types/cash';
import { mapBeneficiaries } from '../services/mappers/beneficiaryMapper';
import { mapCategories } from '../services/mappers/categoryMapper';
import {
  mapCashTransactions,
} from '../services/mappers/cashMapper';
import { mapBudgetDetail, mapBudgets } from '../services/mappers/budgetMapper';
import { mapGoal, mapGoals } from '../services/mappers/goalMapper';
import {
  mapAnalyticsCategories,
  mapAnalyticsSummary,
  mapAnalyticsTrends,
} from '../services/mappers/analyticsMapper';
import { useApiResource, type ApiResource } from './useApiResource';

/** `true` solo cuando hay servicios y la sesión está lista. */
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

export interface MovementsResource {
  readonly status: ApiResource<readonly MovementItem[]>['status'];
  readonly items: readonly MovementItem[];
  readonly error: ApiResource<readonly MovementItem[]>['error'];
  readonly reload: () => void;
}

export function useMovements(
  services: ApiServices | null,
  enabled: boolean,
  limit: number = MOVEMENTS_DEFAULT_LIMIT,
): MovementsResource {
  const active = canLoad(services, enabled);
  const resource = useApiResource<readonly MovementItem[]>(
    active
      ? async (signal) => {
          const page = await services!.movements.list({ limit, signal });
          return mapMovements(page.items);
        }
      : null,
    [active, services, limit],
  );
  return {
    status: resource.status,
    items: resource.data ?? [],
    error: resource.error,
    reload: resource.reload,
  };
}

export function useTransfers(
  services: ApiServices | null,
  enabled: boolean,
  ownClientId: string | null,
): ApiResource<readonly TransferItem[]> {
  const active = canLoad(services, enabled) && Boolean(ownClientId);
  return useApiResource(
    active
      ? async (signal) => {
          const page = await services!.transfers.list({ signal });
          return mapTransfers(page, { ownClientId: ownClientId as string });
        }
      : null,
    [active, services, ownClientId],
  );
}

export function useTransferDetail(
  services: ApiServices | null,
  enabled: boolean,
  transferId: string | null,
): ApiResource<TransferDto> {
  const active = canLoad(services, enabled) && Boolean(transferId);
  return useApiResource(
    active
      ? (signal) =>
          services!.transfers.getById(transferId as string, { signal })
      : null,
    [active, services, transferId],
  );
}

export function useTransferReceipt(
  services: ApiServices | null,
  enabled: boolean,
  transferId: string | null,
): ApiResource<TransferReceiptDto> {
  const active = canLoad(services, enabled) && Boolean(transferId);
  return useApiResource(
    active
      ? (signal) =>
          services!.transfers.getReceipt(transferId as string, { signal })
      : null,
    [active, services, transferId],
  );
}

export function useRecharges(
  services: ApiServices | null,
  enabled: boolean,
): ApiResource<readonly RechargeItem[]> {
  const active = canLoad(services, enabled);
  return useApiResource(
    active
      ? async (signal) => {
          const items = await services!.recharges.list({ signal });
          return mapRecharges(items);
        }
      : null,
    [active, services],
  );
}

export function useProfile(
  services: ApiServices | null,
  enabled: boolean,
): ApiResource<ProfileDto> {
  const active = canLoad(services, enabled);
  return useApiResource(
    active ? (signal) => services!.profile.get({ signal }) : null,
    [active, services],
  );
}

export function useAssistantSummary(
  services: ApiServices | null,
  enabled: boolean,
): ApiResource<AssistantSummaryDto> {
  const active = canLoad(services, enabled);
  return useApiResource(
    active ? (signal) => services!.assistant.getSummary({ signal }) : null,
    [active, services],
  );
}

/**
 * Envía una pregunta al asistente (solo lectura). No hay estado global ni
 * operación financiera: cada llamada es independiente.
 */
export async function askAssistant(
  services: ApiServices,
  message: string,
  signal?: AbortSignal,
): Promise<AssistantChatDto> {
  return services.assistant.chat(message, { signal });
}

/** Construye el resultado de éxito de una recarga con el saldo confirmado. */
export function buildRechargeResult(
  recharge: Parameters<typeof mapRechargeResult>[0],
  balanceAfterCents: number | null,
): RechargeResult {
  return mapRechargeResult(recharge, balanceAfterCents);
}

// ── Fase 5: Beneficiaries ─────────────────────────────────────

export function useBeneficiaries(
  services: ApiServices | null,
  enabled: boolean,
): ApiResource<readonly BeneficiaryItem[]> {
  const active = canLoad(services, enabled);
  return useApiResource(
    active
      ? async (signal) => mapBeneficiaries(await services!.beneficiaries.list({ signal }))
      : null,
    [active, services],
  );
}

// ── Fase 5: Categories ────────────────────────────────────────

export function useCategories(
  services: ApiServices | null,
  enabled: boolean,
  includeInactive: boolean = false,
): ApiResource<readonly CategoryItem[]> {
  const active = canLoad(services, enabled);
  return useApiResource(
    active
      ? async (signal) =>
          mapCategories(
            await services!.categories.list({ includeInactive, signal }),
          )
      : null,
    [active, services, includeInactive],
  );
}

// ── Fase 5: Cash ──────────────────────────────────────────────

export interface CashRegisterResource {
  readonly status: ApiResource<null>['status'];
  readonly balance: CashBalanceDto | null;
  readonly transactions: readonly CashTransaction[];
  readonly error: ApiResource<null>['error'];
  readonly reload: () => void;
}

export function useCashRegister(
  services: ApiServices | null,
  enabled: boolean,
  limit: number = 100,
): CashRegisterResource {
  const active = canLoad(services, enabled);
  const resource = useApiResource<{
    balance: CashBalanceDto;
    transactions: readonly CashTransaction[];
  }>(
    active
      ? async (signal) => {
          const [balance, movements] = await Promise.all([
            services!.cash.getBalance({ signal }),
            services!.cash.listMovements({ limit, signal }),
          ]);
          return {
            balance,
            transactions: mapCashTransactions(movements),
          };
        }
      : null,
    [active, services, limit],
  );
  return {
    status: resource.status,
    balance: resource.data?.balance ?? null,
    transactions: resource.data?.transactions ?? [],
    error: resource.error,
    reload: resource.reload,
  };
}

// ── Fase 5: Budgets ───────────────────────────────────────────

export function useBudgets(
  services: ApiServices | null,
  enabled: boolean,
  period?: string,
): ApiResource<readonly BudgetItem[]> {
  const active = canLoad(services, enabled);
  return useApiResource(
    active
      ? async (signal) =>
          mapBudgets(await services!.budgets.list({ period, signal }))
      : null,
    [active, services, period],
  );
}

export function useBudgetDetail(
  services: ApiServices | null,
  enabled: boolean,
  budgetId: string | null,
): ApiResource<BudgetDetail> {
  const active = canLoad(services, enabled) && Boolean(budgetId);
  return useApiResource(
    active
      ? async (signal) =>
          mapBudgetDetail(
            await services!.budgets.getById(budgetId as string, { signal }),
          )
      : null,
    [active, services, budgetId],
  );
}

// ── Fase 5: Goals ─────────────────────────────────────────────

export function useGoals(
  services: ApiServices | null,
  enabled: boolean,
): ApiResource<readonly GoalItem[]> {
  const active = canLoad(services, enabled);
  return useApiResource(
    active
      ? async (signal) => mapGoals(await services!.goals.list({ signal }))
      : null,
    [active, services],
  );
}

export function useGoalDetail(
  services: ApiServices | null,
  enabled: boolean,
  goalId: string | null,
): ApiResource<GoalItem> {
  const active = canLoad(services, enabled) && Boolean(goalId);
  return useApiResource(
    active
      ? async (signal) =>
          mapGoal(await services!.goals.getById(goalId as string, { signal }))
      : null,
    [active, services, goalId],
  );
}

// ── Fase 5: Analytics ─────────────────────────────────────────

export interface AnalyticsResource {
  readonly status: ApiResource<null>['status'];
  readonly summary: AnalyticsSummaryData | null;
  readonly categories: AnalyticsCategoryData | null;
  readonly trends: AnalyticsTrendData | null;
  readonly error: ApiResource<null>['error'];
  readonly reload: () => void;
}

/**
 * Carga las tres consultas del periodo en paralelo para que resumen,
 * categorías y tendencias compartan periodo y estado. Si una falla, el bloque
 * completo se presenta como error: nunca se mezcla un periodo con otro.
 */
export function useAnalytics(
  services: ApiServices | null,
  enabled: boolean,
  period?: string,
): AnalyticsResource {
  const active = canLoad(services, enabled);
  const resource = useApiResource<{
    summary: AnalyticsSummaryData;
    categories: AnalyticsCategoryData;
    trends: AnalyticsTrendData;
  }>(
    active
      ? async (signal) => {
          const [summaryDto, categoriesDto, trendsDto] = await Promise.all([
            services!.analytics.summary(period, { signal }),
            services!.analytics.categories(period, { signal }),
            services!.analytics.trends(period, { signal }),
          ]);
          return {
            summary: mapAnalyticsSummary(summaryDto, categoriesDto, trendsDto),
            categories: mapAnalyticsCategories(categoriesDto),
            trends: mapAnalyticsTrends(trendsDto, summaryDto),
          };
        }
      : null,
    [active, services, period],
  );
  return {
    status: resource.status,
    summary: resource.data?.summary ?? null,
    categories: resource.data?.categories ?? null,
    trends: resource.data?.trends ?? null,
    error: resource.error,
    reload: resource.reload,
  };
}
