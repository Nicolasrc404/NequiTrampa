// ============================================================
// Servicio de presupuestos mensuales
// ============================================================
// Contrato verificado en `src/Nequi.Finance/Budgets/BudgetsController.cs`:
//   GET   /v1/budgets?period                  -> BudgetDto[]
//   GET   /v1/budgets/{id}                    -> BudgetDetailDto
//   POST  /v1/budgets                         -> 201 BudgetDto
//   PATCH /v1/budgets/{id}                    -> BudgetDto
//
// NO existe DELETE: los presupuestos no se eliminan por API.
//
// `financial_movements` proyecta `categoryId`, por lo que `spentCents` refleja
// el consumo real de la categoría y un valor 0 significa que no hubo gastos, no
// que el dato falte.

import type { HttpClient } from './http';
import {
  asRecord,
  optionalString,
  requireBoolean,
  requireOneOf,
  requireSafeInteger,
  requireString,
  ServiceContractError,
} from './contract';
import { normalizeBaseUrl } from '../utils/url';

export const MAX_BUDGET_LIMIT_CENTS = 1_000_000_000_000;
export const BUDGET_HEALTH_VALUES = ['on-track', 'warning', 'exceeded'] as const;
export const BUDGET_WARNING_THRESHOLD_PERCENT = 80;

export type BudgetHealthDto = (typeof BUDGET_HEALTH_VALUES)[number];

export interface BudgetExpenseDto {
  readonly id: string;
  readonly merchant: string | null;
  readonly amountCents: number;
  readonly occurredAt: string;
}

export interface BudgetDto {
  readonly id: string;
  readonly categoryId: string;
  readonly categoryName: string | null;
  readonly period: string;
  readonly limitCents: number;
  readonly spentCents: number;
  readonly remainingCents: number;
  readonly percent: number;
  readonly health: BudgetHealthDto;
  readonly currency: 'COP';
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BudgetDetailDto extends BudgetDto {
  readonly daysRemaining: number;
  readonly dailySuggestedCents: number;
  readonly expenses: readonly BudgetExpenseDto[];
}

export interface CreateBudgetInput {
  readonly categoryId: string;
  readonly period: string;
  readonly limitCents: number;
}

export interface UpdateBudgetInput {
  readonly limitCents: number;
}

export interface BudgetRequestOptions {
  readonly signal?: AbortSignal;
}

export interface ListBudgetsOptions extends BudgetRequestOptions {
  readonly period?: string;
}

export interface BudgetsService {
  list(options?: ListBudgetsOptions): Promise<readonly BudgetDto[]>;
  getById(id: string, options?: BudgetRequestOptions): Promise<BudgetDetailDto>;
  create(
    input: CreateBudgetInput,
    options?: BudgetRequestOptions,
  ): Promise<BudgetDto>;
  update(
    id: string,
    input: UpdateBudgetInput,
    options?: BudgetRequestOptions,
  ): Promise<BudgetDto>;
}

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidBudgetPeriod(value: string): boolean {
  return PERIOD_PATTERN.test(value);
}

function requirePeriod(value: string): string {
  const period = (value ?? '').trim();
  if (!isValidBudgetPeriod(period)) {
    throw new Error('El periodo debe tener el formato YYYY-MM.');
  }
  return period;
}

function requireLimitCents(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_BUDGET_LIMIT_CENTS) {
    throw new Error('El límite debe ser un valor positivo en centavos de COP.');
  }
  return value;
}

function requireIdentifier(value: string, label: string): string {
  const reference = (value ?? '').trim();
  if (reference.length === 0 || reference.length > 64) {
    throw new Error(`El identificador de ${label} no es válido.`);
  }
  return reference;
}

function parseBudget(payload: unknown): BudgetDto {
  const dto = asRecord(payload, 'budget');
  const currency = requireString(dto, 'currency');
  if (currency !== 'COP') {
    throw new ServiceContractError(
      'El presupuesto no está denominado en COP.',
      'currency',
    );
  }
  return {
    id: requireString(dto, 'id'),
    categoryId: requireString(dto, 'categoryId'),
    categoryName: optionalString(dto, 'categoryName'),
    period: requireString(dto, 'period'),
    limitCents: requireSafeInteger(dto, 'limitCents', { min: 1 }),
    spentCents: requireSafeInteger(dto, 'spentCents', { min: 0 }),
    remainingCents: requireSafeInteger(dto, 'remainingCents'),
    percent: requireSafeInteger(dto, 'percent', { min: 0 }),
    health: requireOneOf(dto, 'health', BUDGET_HEALTH_VALUES),
    currency: 'COP',
    active: requireBoolean(dto, 'active'),
    createdAt: requireString(dto, 'createdAt'),
    updatedAt: requireString(dto, 'updatedAt'),
  };
}

function parseExpense(payload: unknown): BudgetExpenseDto {
  const dto = asRecord(payload, 'budgetExpense');
  return {
    id: requireString(dto, 'id'),
    merchant: optionalString(dto, 'merchant'),
    amountCents: requireSafeInteger(dto, 'amountCents', { min: 1 }),
    occurredAt: requireString(dto, 'occurredAt'),
  };
}

function parseDetail(payload: unknown): BudgetDetailDto {
  const dto = asRecord(payload, 'budgetDetail');
  const base = parseBudget(dto);
  if (!Array.isArray(dto.expenses)) {
    throw new ServiceContractError(
      'El detalle del presupuesto no incluye una lista de gastos.',
      'expenses',
    );
  }
  return {
    ...base,
    daysRemaining: requireSafeInteger(dto, 'daysRemaining', { min: 0 }),
    dailySuggestedCents: requireSafeInteger(dto, 'dailySuggestedCents', {
      min: 0,
    }),
    expenses: dto.expenses.map(parseExpense),
  };
}

export function createBudgetsService(http: HttpClient): BudgetsService {
  if (!normalizeBaseUrl(http.baseUrl)) {
    throw new Error('createBudgetsService: cliente HTTP sin URL base válida.');
  }

  return {
    async list(options = {}) {
      const period =
        options.period === undefined ? undefined : requirePeriod(options.period);
      const payload = await http.get<unknown>('/v1/budgets', {
        query: period ? { period } : undefined,
        signal: options.signal,
      });
      if (!Array.isArray(payload)) {
        throw new ServiceContractError(
          'El listado de presupuestos no es una lista.',
          'budgets',
        );
      }
      return payload.map(parseBudget);
    },

    async getById(id, options) {
      const reference = requireIdentifier(id, 'presupuesto');
      const payload = await http.get<unknown>(
        `/v1/budgets/${encodeURIComponent(reference)}`,
        { signal: options?.signal },
      );
      return parseDetail(payload);
    },

    async create(input, options) {
      const categoryId = requireIdentifier(input.categoryId, 'categoría');
      const period = requirePeriod(input.period);
      const limitCents = requireLimitCents(input.limitCents);
      const payload = await http.post<unknown>(
        '/v1/budgets',
        { categoryId, period, limitCents },
        { signal: options?.signal },
      );
      return parseBudget(payload);
    },

    async update(id, input, options) {
      const reference = requireIdentifier(id, 'presupuesto');
      const limitCents = requireLimitCents(input.limitCents);
      const payload = await http.patch<unknown>(
        `/v1/budgets/${encodeURIComponent(reference)}`,
        { limitCents },
        { signal: options?.signal },
      );
      return parseBudget(payload);
    },
  };
}
