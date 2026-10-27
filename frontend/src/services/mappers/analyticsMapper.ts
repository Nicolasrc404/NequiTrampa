// ============================================================
// Analítica: DTO de API → view model
// ============================================================
// Solo se agregan movimientos CONFIRMADOS. Los porcentajes de las barras son
// relativos al máximo del periodo (para altura visual), no porcentajes
// financieros. `uncategorizedCents` agrupa movimientos sin categoría (por
// ejemplo, eventos anteriores a la categorización).

import type {
  AnalyticsCategoriesDto,
  AnalyticsSummaryDto,
  AnalyticsTrendsDto,
} from '../analyticsService';
import type {
  AnalyticsCategoryData,
  AnalyticsSummaryData,
  AnalyticsTrendData,
  CategoryExpenseItem,
  WeeklyBarData,
} from '../../types/analytics';
import colors from '../../theme/colors';
import { formatCopCents } from '../../utils/money';

const CATEGORY_COLORS = [
  colors.analyticsMagentaAlt,
  colors.analyticsPurple,
  colors.analyticsOchre,
  colors.analyticsTeal,
  colors.analyticsGreen,
  colors.analyticsMuted,
] as const;

export const UNCATEGORIZED_DATA_NOTE =
  'Parte de los gastos del periodo no tiene categoría asignada y se agrupa en «Sin categoría».';

function signedCop(cents: number): string {
  const label = formatCopCents(Math.abs(cents));
  if (cents > 0) return `+${label}`;
  if (cents < 0) return `-${label}`;
  return label;
}

function percentChangeLabel(change: number | null): string | null {
  if (change === null) return null;
  if (change === 0) return '0%';
  return `${change > 0 ? '+' : ''}${change}%`;
}

function buildWeeks(
  weeks: readonly { week: number; label: string; incomeCents: number; expenseCents: number }[],
): WeeklyBarData[] {
  const maximum = weeks.reduce(
    (max, week) => Math.max(max, week.incomeCents, week.expenseCents),
    0,
  );
  const scale = (value: number): number =>
    maximum === 0 ? 0 : Math.round((value / maximum) * 100);
  return weeks.map((week) => ({
    week: week.label || `S${week.week}`,
    incomePct: scale(week.incomeCents),
    expensePct: scale(week.expenseCents),
    incomeAmountFormatted: formatCopCents(week.incomeCents),
    expenseAmountFormatted: formatCopCents(week.expenseCents),
  }));
}

export function mapAnalyticsSummary(
  dto: AnalyticsSummaryDto,
  categories?: AnalyticsCategoriesDto | null,
  trends?: AnalyticsTrendsDto | null,
): AnalyticsSummaryData {
  const topCategory = categories?.categories[0] ?? null;
  const statusPillText =
    dto.netCents > 0
      ? 'Tu mes cerró en positivo'
      : dto.netCents < 0
        ? 'Tu mes cerró en negativo'
        : 'Tu mes cerró en equilibrio';

  return {
    period: dto.periodLabel,
    currency: dto.currency,
    differenceAmount: dto.netCents,
    differenceFormatted: signedCop(dto.netCents),
    differenceNote: 'Ingresos menos gastos · no es tu saldo',
    statusPillText,
    totalIncome: dto.incomeCents,
    totalIncomeFormatted: formatCopCents(dto.incomeCents),
    totalExpense: dto.expenseCents,
    totalExpenseFormatted: formatCopCents(dto.expenseCents),
    topExpenseCategory: topCategory?.name ?? 'Sin datos',
    topExpenseAmount: topCategory?.amountCents ?? 0,
    topExpenseFormatted: topCategory
      ? `${formatCopCents(topCategory.amountCents)} · ${topCategory.percent}%`
      : 'Sin gastos clasificados',
    weeklyMovements: trends ? buildWeeks(trends.weeks) : [],
    ...(categories && categories.uncategorizedCents > 0
      ? { dataNote: UNCATEGORIZED_DATA_NOTE }
      : {}),
  };
}

export function mapAnalyticsCategoryItem(
  category: AnalyticsCategoriesDto['categories'][number],
  index: number,
): CategoryExpenseItem {
  const isUncategorized = category.categoryId === null;
  return {
    id: category.categoryId ?? `uncategorized-${index}`,
    name: category.name,
    amount: category.amountCents,
    amountFormatted: formatCopCents(category.amountCents),
    percentage: category.percent,
    color: isUncategorized
      ? colors.analyticsMuted
      : CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    isUncategorized,
  };
}

export function mapAnalyticsCategories(
  dto: AnalyticsCategoriesDto,
): AnalyticsCategoryData {
  const categories = dto.categories.map(mapAnalyticsCategoryItem);
  return {
    period: dto.periodLabel,
    periodSubtitle: `${dto.periodLabel} · pesos colombianos`,
    totalExpenseFormatted: formatCopCents(dto.totalExpenseCents),
    currency: dto.currency,
    categories,
    ...(dto.uncategorizedCents > 0
      ? {
          uncategorizedFormatted: formatCopCents(dto.uncategorizedCents),
          dataNote: UNCATEGORIZED_DATA_NOTE,
        }
      : {}),
  };
}

export function mapAnalyticsTrends(
  dto: AnalyticsTrendsDto,
  summary?: AnalyticsSummaryDto | null,
): AnalyticsTrendData {
  const expenseChange = summary?.expenseChangePercent ?? null;
  const incomeChange = summary?.incomeChangePercent ?? null;
  const expansion =
    expenseChange === null
      ? null
      : expenseChange < 0
        ? `bajaron un ${Math.abs(expenseChange)}%`
        : expenseChange > 0
          ? `subieron un ${expenseChange}%`
          : 'se mantuvieron';

  const insightTitle =
    expansion === null
      ? `Tendencias de ${dto.periodLabel}`
      : `Tus gastos ${expansion}`;

  const previousLabel = summary?.previousPeriodLabel ?? '';
  const insightDescription =
    summary && expenseChange !== null
      ? `Frente a ${previousLabel}: ${formatCopCents(
          summary.previousExpenseCents,
        )} → ${formatCopCents(summary.expenseCents)}.\n${
          expenseChange < 0
            ? 'Vas gastando menos que el mes anterior.'
            : expenseChange > 0
              ? 'Vas gastando más que el mes anterior.'
              : 'Gastaste lo mismo que el mes anterior.'
        }`
      : 'Compara tus ingresos y gastos por semana del periodo seleccionado.';

  const incomeChangeText = percentChangeLabel(incomeChange);

  return {
    period: dto.periodLabel,
    legendIncomeLabel: 'Ingresos',
    legendExpenseLabel: 'Gastos',
    currency: dto.currency,
    weeklyTrends: buildWeeks(dto.weeks),
    insightTitle,
    insightDescription,
    incomeComparisonLabel: incomeChangeText
      ? `Ingresos · ${incomeChangeText} vs. ${previousLabel || 'mes anterior'}`
      : 'Ingresos del periodo',
    incomeComparisonCurrentFormatted: formatCopCents(
      summary?.incomeCents ?? 0,
    ),
    previousMonthLabel: previousLabel
      ? `${previousLabel} · ingresos`
      : 'Mes anterior · ingresos',
    previousMonthIncomeFormatted: formatCopCents(
      summary?.previousIncomeCents ?? 0,
    ),
    ...(summary && summary.movementCount === 0
      ? { dataNote: 'No hay movimientos confirmados en este periodo.' }
      : {}),
  };
}
