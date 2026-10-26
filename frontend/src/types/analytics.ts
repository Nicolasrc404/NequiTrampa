// ============================================================
// Tipos para el módulo Analytics (Analytics_01 a Analytics_10)
// ============================================================

export type AnalyticsState =
  | 'Analytics_01' // Resumen financiero
  | 'Analytics_02' // Periodo personalizado con error
  | 'Analytics_03' // Tu sesión venció (401 Resumen)
  | 'Analytics_04' // No pudimos cargar tu resumen (500)
  | 'Analytics_05' // Gastos por categoría
  | 'Analytics_06' // Tu sesión venció (401 Categorías)
  | 'Analytics_07' // No pudimos cargar tus categorías (500)
  | 'Analytics_08' // Tendencias de ingresos y gastos
  | 'Analytics_09' // Tu sesión venció (401 Tendencias)
  | 'Analytics_10'; // No pudimos cargar tus tendencias (500)

export type AnalyticsTab = 'resumen' | 'categorias' | 'tendencias';

export interface WeeklyBarData {
  week: string; // e.g. "S1", "S2", "S3", "S4"
  incomePct: number; // percentage of maximum for visual height (0..100)
  expensePct: number; // percentage of maximum for visual height (0..100)
  incomeAmountFormatted?: string;
  expenseAmountFormatted?: string;
}

export interface CategoryExpenseItem {
  id: string;
  name: string;
  amount: number;
  amountFormatted: string;
  percentage: number;
  color: string;
  /** `true` para el bucket agregado "Sin categoría" del backend. */
  isUncategorized?: boolean;
}

export interface AnalyticsSummaryData {
  period: string; // "Septiembre de 2026"
  currency: string; // "COP"
  differenceAmount: number;
  differenceFormatted: string; // "+$1.250.000"
  differenceNote: string; // "Ingresos menos gastos · no es tu saldo"
  statusPillText: string; // "Tu mes cerró en positivo"
  totalIncome: number;
  totalIncomeFormatted: string; // "$3.250.000"
  totalExpense: number;
  totalExpenseFormatted: string; // "$2.000.000"
  topExpenseCategory: string; // "Alimentación"
  topExpenseAmount: number;
  topExpenseFormatted: string; // "$800.000 · 40%"
  weeklyMovements: WeeklyBarData[];
  /** Advertencia cuando el desglose por categoría es parcial. */
  dataNote?: string;
}

export interface AnalyticsCategoryData {
  period: string; // "Septiembre de 2026"
  periodSubtitle: string; // "Septiembre de 2026 · pesos colombianos"
  totalExpenseFormatted: string; // "$2.000.000"
  currency: string; // "COP"
  categories: CategoryExpenseItem[];
  /** Monto agrupado por el backend en "Sin categoría". */
  uncategorizedFormatted?: string;
  /** Advertencia cuando el desglose por categoría es parcial. */
  dataNote?: string;
}

export interface AnalyticsTrendData {
  period: string; // "Septiembre de 2026"
  legendIncomeLabel: string; // "Ingresos"
  legendExpenseLabel: string; // "Gastos"
  currency: string; // "COP"
  weeklyTrends: WeeklyBarData[];
  insightTitle: string; // "Tus gastos bajaron un 9,1%"
  insightDescription: string; // "Frente a agosto: $2.200.000 → $2.000.000.\nVas gastando menos que el mes anterior."
  incomeComparisonLabel: string; // "Ingresos · +12,1% vs. agosto"
  incomeComparisonCurrentFormatted: string; // "$3.250.000"
  previousMonthLabel: string; // "Agosto · ingresos"
  previousMonthIncomeFormatted: string; // "$2.900.000"
  /** Advertencia cuando no hay movimientos confirmados en el periodo. */
  dataNote?: string;
}
