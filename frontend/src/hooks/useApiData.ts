// ============================================================
// Hooks de lectura por dominio
// ============================================================
// Cada hook entrega un view model o un `ApiError` clasificado. No navega ni
// decide estados de pantalla: eso permanece en App.tsx.

import { useCallback, useEffect, useRef, useState } from 'react';
import { asApiError, type ApiError } from '../services/http';
import type { ApiServices } from '../services/factories';
import type { MovementItem } from '../types/movements';
import type { TransferItem } from '../types/transfers';
import type { RechargeItem } from '../types/recharges';
import type {
  AssistantChatDto,
  AssistantSummaryDto,
} from '../services/assistantService';
import type { TransferDto, TransferReceiptDto } from '../services/transfersService';
import { MOVEMENTS_DEFAULT_LIMIT } from '../services/movementsService';
import { mapMovements } from '../services/mappers/movementMapper';
import { loadAcademicMovementDtos } from '../services/academicMovementsService';
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
import { useApiResource, type ApiResource, type ApiResourceStatus } from './useApiResource';

/** `true` solo cuando hay servicios y la sesión está lista. */
function canLoad(services: ApiServices | null, enabled: boolean): boolean {
  return enabled && services !== null;
}

export interface MovementsResource {
  readonly status: ApiResourceStatus;
  readonly items: readonly MovementItem[];
  readonly error: ApiError | null;
  readonly reload: () => void;
  /** `true` mientras el backend devuelve un cursor para la página siguiente. */
  readonly hasMore: boolean;
  readonly loadingMore: boolean;
  readonly loadMore: () => void;
}

function dedupeMovements(list: readonly MovementItem[]): MovementItem[] {
  const seen = new Set<string>();
  const result: MovementItem[] = [];
  for (const item of list) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

export function useMovements(
  services: ApiServices | null,
  enabled: boolean,
  limit: number = MOVEMENTS_DEFAULT_LIMIT,
  academicMode: boolean = false,
  ownClientId: string | null = null,
): MovementsResource {
  const active = canLoad(services, enabled);
  const [status, setStatus] = useState<ApiResourceStatus>('idle');
  const [items, setItems] = useState<readonly MovementItem[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  // Identifica la carga vigente: descarta respuestas de una sesión/página anterior.
  const generation = useRef(0);
  const moreController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!active) {
      generation.current += 1;
      moreController.current?.abort();
      setStatus('idle');
      setItems([]);
      setError(null);
      setCursor(null);
      setLoadingMore(false);
      return;
    }

    const controller = new AbortController();
    const current = ++generation.current;
    moreController.current?.abort();
    setStatus('loading');
    setError(null);
    setLoadingMore(false);

    const loadPage = academicMode
      ? loadAcademicMovementDtos(
          {
            wallet: services!.wallet,
            transfers: services!.transfers,
            recharges: services!.recharges,
          },
          ownClientId,
          controller.signal,
        ).then((items) => ({
          items: items.slice(0, limit),
          nextCursor: null,
        }))
      : services!.movements.list({ limit, signal: controller.signal });

    void loadPage
      .then((page) => {
        if (current !== generation.current) return;
        setItems(dedupeMovements(mapMovements(page.items)));
        setCursor(page.nextCursor);
        setStatus('success');
      })
      .catch((cause: unknown) => {
        if (current !== generation.current) return;
        const failure = asApiError(cause);
        if (failure.kind === 'aborted') return;
        setItems([]);
        setCursor(null);
        setError(failure);
        setStatus('error');
      });

    return () => controller.abort();
  }, [active, services, limit, reloadToken, academicMode, ownClientId]);

  useEffect(() => () => moreController.current?.abort(), []);

  const loadMore = useCallback(() => {
    if (academicMode || !active || cursor === null || loadingMore) return;
    const controller = new AbortController();
    moreController.current?.abort();
    moreController.current = controller;
    const current = generation.current;
    setLoadingMore(true);

    void services!.movements
      .list({ limit, cursor, signal: controller.signal })
      .then((page) => {
        if (current !== generation.current) return;
        // Evita duplicados si una página se solapa con la anterior.
        setItems((previous) => dedupeMovements([...previous, ...mapMovements(page.items)]));
        setCursor(page.nextCursor);
      })
      .catch((cause: unknown) => {
        if (current !== generation.current) return;
        const failure = asApiError(cause);
        if (failure.kind === 'aborted') return;
        // Conserva las páginas ya cargadas; solo reporta el fallo de "cargar más".
        setError(failure);
      })
      .finally(() => {
        if (current === generation.current) setLoadingMore(false);
      });
  }, [active, services, limit, cursor, loadingMore, academicMode]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return {
    status,
    items,
    error,
    reload,
    hasMore: cursor !== null,
    loadingMore,
    loadMore,
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
  readonly status: ApiResourceStatus;
  readonly balance: CashBalanceDto | null;
  readonly transactions: readonly CashTransaction[];
  readonly error: ApiError | null;
  readonly reload: () => void;
  readonly hasMore: boolean;
  readonly loadingMore: boolean;
  readonly loadMore: () => void;
}

function dedupeCashTransactions(list: readonly CashTransaction[]): CashTransaction[] {
  const seen = new Set<string>();
  const result: CashTransaction[] = [];
  for (const item of list) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

export function useCashRegister(
  services: ApiServices | null,
  enabled: boolean,
  limit: number = 100,
): CashRegisterResource {
  const active = canLoad(services, enabled);
  const [status, setStatus] = useState<ApiResourceStatus>('idle');
  const [balance, setBalance] = useState<CashBalanceDto | null>(null);
  const [transactions, setTransactions] = useState<readonly CashTransaction[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const generation = useRef(0);
  const moreController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!active) {
      generation.current += 1;
      moreController.current?.abort();
      setStatus('idle');
      setBalance(null);
      setTransactions([]);
      setError(null);
      setCursor(null);
      setLoadingMore(false);
      return;
    }

    const controller = new AbortController();
    const current = ++generation.current;
    moreController.current?.abort();
    setStatus('loading');
    setError(null);
    setLoadingMore(false);

    const balancePromise = services!.cash.getBalance({ signal: controller.signal });
    const pagePromise = services!.cash.listMovementsPage({ limit, signal: controller.signal });

    void Promise.all([balancePromise, pagePromise])
      .then(([bal, page]) => {
        if (current !== generation.current) return;
        setBalance(bal);
        setTransactions(dedupeCashTransactions(mapCashTransactions(page.items)));
        setCursor(page.nextCursor);
        setStatus('success');
      })
      .catch((cause: unknown) => {
        if (current !== generation.current) return;
        const failure = asApiError(cause);
        if (failure.kind === 'aborted') return;
        setBalance(null);
        setTransactions([]);
        setCursor(null);
        setError(failure);
        setStatus('error');
      });

    return () => controller.abort();
  }, [active, services, limit, reloadToken]);

  useEffect(() => () => moreController.current?.abort(), []);

  const loadMore = useCallback(() => {
    if (!active || cursor === null || loadingMore || !services) return;
    const controller = new AbortController();
    moreController.current?.abort();
    moreController.current = controller;
    const current = generation.current;
    setLoadingMore(true);

    const fetcher = services.cash.listMovementsPage({ limit, cursor, signal: controller.signal });

    void fetcher
      .then((page) => {
        if (current !== generation.current) return;
        setTransactions((prev) => dedupeCashTransactions([...prev, ...mapCashTransactions(page.items)]));
        setCursor(page.nextCursor);
      })
      .catch((cause: unknown) => {
        if (current !== generation.current) return;
        const failure = asApiError(cause);
        if (failure.kind === 'aborted') return;
        setError(failure);
      })
      .finally(() => {
        if (current === generation.current) setLoadingMore(false);
      });
  }, [active, cursor, loadingMore, services, limit]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  return {
    status,
    balance,
    transactions,
    error,
    reload,
    hasMore: cursor !== null,
    loadingMore,
    loadMore,
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
