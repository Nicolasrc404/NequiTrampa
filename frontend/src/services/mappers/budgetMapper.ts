// ============================================================
// Presupuestos: DTO de API → view model
// ============================================================
// `financial_movements` proyecta `categoryId`, así que `spentCents` es el
// consumo confirmado de la categoría. Un presupuesto sin gastos devuelve 0.

import type { BudgetDetailDto, BudgetDto } from '../budgetsService';
import type { BudgetDetail, BudgetItem } from '../../types/budgets';
import { formatMonthPeriodLabel, formatShortDateLabel } from '../../utils/datetime';

export function mapBudget(dto: BudgetDto): BudgetItem {
  return {
    id: dto.id,
    category: dto.categoryName?.trim() || 'Sin categoría',
    categoryId: dto.categoryId,
    period: dto.period,
    spentCents: dto.spentCents,
    limitCents: dto.limitCents,
    percent: dto.percent,
    health: dto.health,
  };
}

export function mapBudgets(dtos: readonly BudgetDto[]): readonly BudgetItem[] {
  return dtos.map(mapBudget);
}

export function mapBudgetDetail(dto: BudgetDetailDto): BudgetDetail {
  return {
    category: dto.categoryName?.trim() || 'Sin categoría',
    periodLabel: formatMonthPeriodLabel(dto.period),
    spentCents: dto.spentCents,
    limitCents: dto.limitCents,
    remainingCents: dto.remainingCents,
    percent: dto.percent,
    daysRemaining: dto.daysRemaining,
    dailySuggestedCents: dto.dailySuggestedCents,
    expenses: dto.expenses.map((expense) => ({
      id: expense.id,
      merchant: expense.merchant?.trim() || 'Gasto sin comercio',
      amountCents: expense.amountCents,
      dateLabel: formatShortDateLabel(expense.occurredAt.slice(0, 10)),
    })),
  };
}
