// ============================================================
// Servicio de analítica financiera (solo lectura)
// ============================================================
// Contrato verificado en `src/Nequi.Finance/Analytics/AnalyticsController.cs`:
//   GET /v1/analytics/summary?period=YYYY-MM
//   GET /v1/analytics/categories?period=YYYY-MM
//   GET /v1/analytics/trends?period=YYYY-MM
//
// Los periodos son meses calendario (YYYY-MM); sin `period` el backend usa el
// mes en curso. Solo se agregan movimientos CONFIRMADOS: la analítica nunca
// mezcla pendientes.
//
// El backend proyecta `categoryId` (outbox → Workers → financial_movements) y
// agrupa por categoría. Los movimientos sin categoría —por ejemplo eventos
// anteriores a la categorización— se devuelven en `uncategorizedCents`, que la
// UI muestra como "Sin categoría" y no como una clasificación completa.

import type { HttpClient } from './http';
import {
  asRecord,
  optionalSafeInteger,
  optionalString,
  requireSafeInteger,
  requireString,
  ServiceContractError,
} from './contract';
import { normalizeBaseUrl } from '../utils/url';

export const ANALYTICS_PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
export const UNCATEGORIZED_LABEL = 'Sin categoría';

export interface AnalyticsSummaryDto {
  readonly period: string;
  readonly periodLabel: string;
  readonly currency: 'COP';
  readonly incomeCents: number;
  readonly expenseCents: number;
  readonly netCents: number;
  readonly movementCount: number;
  readonly averageDailyExpenseCents: number;
  readonly previousPeriod: string;
  readonly previousPeriodLabel: string;
  readonly previousIncomeCents: number;
  readonly previousExpenseCents: number;
  readonly incomeChangePercent: number | null;
  readonly expenseChangePercent: number | null;
  readonly generatedAt: string;
}

export interface AnalyticsCategoryDto {
  readonly categoryId: string | null;
  readonly name: string;
  readonly amountCents: number;
  readonly percent: number;
  readonly movementCount: number;
}

export interface AnalyticsCategoriesDto {
  readonly period: string;
  readonly periodLabel: string;
  readonly currency: 'COP';
  readonly totalExpenseCents: number;
  readonly uncategorizedCents: number;
  readonly categories: readonly AnalyticsCategoryDto[];
}

export interface AnalyticsTrendWeekDto {
  readonly week: number;
  readonly label: string;
  readonly incomeCents: number;
  readonly expenseCents: number;
}

export interface AnalyticsTrendsDto {
  readonly period: string;
  readonly periodLabel: string;
  readonly currency: 'COP';
  readonly weeks: readonly AnalyticsTrendWeekDto[];
}

export interface AnalyticsRequestOptions {
  readonly signal?: AbortSignal;
}

export interface AnalyticsService {
  summary(
    period?: string | null,
    options?: AnalyticsRequestOptions,
  ): Promise<AnalyticsSummaryDto>;
  categories(
    period?: string | null,
    options?: AnalyticsRequestOptions,
  ): Promise<AnalyticsCategoriesDto>;
  trends(
    period?: string | null,
    options?: AnalyticsRequestOptions,
  ): Promise<AnalyticsTrendsDto>;
}

export function isValidAnalyticsPeriod(value: string): boolean {
  return ANALYTICS_PERIOD_PATTERN.test(value);
}

function normalizePeriod(period: string | null | undefined): string | undefined {
  if (period === undefined || period === null) return undefined;
  const value = period.trim();
  if (value.length === 0) return undefined;
  if (!isValidAnalyticsPeriod(value)) {
    throw new Error('El periodo debe tener el formato YYYY-MM.');
  }
  return value;
}

function requireCurrency(dto: ReturnType<typeof asRecord>): 'COP' {
  const currency = requireString(dto, 'currency');
  if (currency !== 'COP') {
    throw new ServiceContractError(
      'La analítica no está denominada en COP.',
      'currency',
    );
  }
  return 'COP';
}

function parseSummary(payload: unknown): AnalyticsSummaryDto {
  const dto = asRecord(payload, 'analyticsSummary');
  return {
    period: requireString(dto, 'period'),
    periodLabel: requireString(dto, 'periodLabel'),
    currency: requireCurrency(dto),
    incomeCents: requireSafeInteger(dto, 'incomeCents', { min: 0 }),
    expenseCents: requireSafeInteger(dto, 'expenseCents', { min: 0 }),
    netCents: requireSafeInteger(dto, 'netCents'),
    movementCount: requireSafeInteger(dto, 'movementCount', { min: 0 }),
    averageDailyExpenseCents: requireSafeInteger(dto, 'averageDailyExpenseCents', {
      min: 0,
    }),
    previousPeriod: requireString(dto, 'previousPeriod'),
    previousPeriodLabel: requireString(dto, 'previousPeriodLabel'),
    previousIncomeCents: requireSafeInteger(dto, 'previousIncomeCents', {
      min: 0,
    }),
    previousExpenseCents: requireSafeInteger(dto, 'previousExpenseCents', {
      min: 0,
    }),
    incomeChangePercent: optionalSafeInteger(dto, 'incomeChangePercent'),
    expenseChangePercent: optionalSafeInteger(dto, 'expenseChangePercent'),
    generatedAt: requireString(dto, 'generatedAt'),
  };
}

function parseCategory(payload: unknown): AnalyticsCategoryDto {
  const dto = asRecord(payload, 'analyticsCategory');
  return {
    categoryId: optionalString(dto, 'categoryId'),
    name: requireString(dto, 'name'),
    amountCents: requireSafeInteger(dto, 'amountCents', { min: 0 }),
    percent: requireSafeInteger(dto, 'percent', { min: 0, max: 100 }),
    movementCount: requireSafeInteger(dto, 'movementCount', { min: 0 }),
  };
}

function parseCategories(payload: unknown): AnalyticsCategoriesDto {
  const dto = asRecord(payload, 'analyticsCategories');
  if (!Array.isArray(dto.categories)) {
    throw new ServiceContractError(
      'La analítica de categorías no incluye una lista.',
      'categories',
    );
  }
  return {
    period: requireString(dto, 'period'),
    periodLabel: requireString(dto, 'periodLabel'),
    currency: requireCurrency(dto),
    totalExpenseCents: requireSafeInteger(dto, 'totalExpenseCents', { min: 0 }),
    uncategorizedCents: requireSafeInteger(dto, 'uncategorizedCents', {
      min: 0,
    }),
    categories: dto.categories.map(parseCategory),
  };
}

function parseWeek(payload: unknown): AnalyticsTrendWeekDto {
  const dto = asRecord(payload, 'analyticsTrendWeek');
  return {
    week: requireSafeInteger(dto, 'week', { min: 1 }),
    label: requireString(dto, 'label'),
    incomeCents: requireSafeInteger(dto, 'incomeCents', { min: 0 }),
    expenseCents: requireSafeInteger(dto, 'expenseCents', { min: 0 }),
  };
}

function parseTrends(payload: unknown): AnalyticsTrendsDto {
  const dto = asRecord(payload, 'analyticsTrends');
  if (!Array.isArray(dto.weeks)) {
    throw new ServiceContractError(
      'La analítica de tendencias no incluye una lista de semanas.',
      'weeks',
    );
  }
  return {
    period: requireString(dto, 'period'),
    periodLabel: requireString(dto, 'periodLabel'),
    currency: requireCurrency(dto),
    weeks: dto.weeks.map(parseWeek),
  };
}

export function createAnalyticsService(http: HttpClient): AnalyticsService {
  if (!normalizeBaseUrl(http.baseUrl)) {
    throw new Error('createAnalyticsService: cliente HTTP sin URL base válida.');
  }

  return {
    async summary(period, options = {}) {
      const query = normalizePeriod(period);
      const payload = await http.get<unknown>('/v1/analytics/summary', {
        query: query ? { period: query } : undefined,
        signal: options.signal,
      });
      return parseSummary(payload);
    },

    async categories(period, options = {}) {
      const query = normalizePeriod(period);
      const payload = await http.get<unknown>('/v1/analytics/categories', {
        query: query ? { period: query } : undefined,
        signal: options.signal,
      });
      return parseCategories(payload);
    },

    async trends(period, options = {}) {
      const query = normalizePeriod(period);
      const payload = await http.get<unknown>('/v1/analytics/trends', {
        query: query ? { period: query } : undefined,
        signal: options.signal,
      });
      return parseTrends(payload);
    },
  };
}
