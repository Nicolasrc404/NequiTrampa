// ============================================================
// Presupuestos: DTO de API → view model
// ============================================================
// Límite de datos: `financial_movements` no proyecta `categoryId`, por lo que
// el backend puede devolver `spentCents = 0` aunque existan gastos. El mapper
// marca `spentDataAvailable = false` en ese caso y la UI muestra "sin dato
// confiable" en lugar de presentar $0 como consumo confirmado.

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
    spentDataAvailable: dto.spentCents > 0,
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
    spentDataAvailable: dto.spentCents > 0,
    expenses: dto.expenses.map((expense) => ({
      id: expense.id,
      merchant: expense.merchant?.trim() || 'Gasto sin comercio',
      amountCents: expense.amountCents,
      dateLabel: formatShortDateLabel(expense.occurredAt.slice(0, 10)),
    })),
  };
}
