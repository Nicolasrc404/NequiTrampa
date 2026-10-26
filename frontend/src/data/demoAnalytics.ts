// ============================================================
// Datos DEMO de prueba para el módulo Analytics
// Valores coherentes con los diseños de Google Stitch
// Moneda única: COP simulada
// ============================================================
import colors from '../theme/colors';
import {
  AnalyticsCategoryData,
  AnalyticsSummaryData,
  AnalyticsTrendData,
  CategoryExpenseItem,
  WeeklyBarData,
} from '../types/analytics';

export const DEMO_ANALYTICS_PERIOD = 'Septiembre de 2026';
export const DEMO_ANALYTICS_DISCLAIMER =
  'Solo consulta · tus saldos no cambian';

export const DEMO_WEEKLY_MOVEMENTS: WeeklyBarData[] = [
  {
    week: 'S1',
    incomePct: 55,
    expensePct: 40,
    incomeAmountFormatted: '$650.000',
    expenseAmountFormatted: '$400.000',
  },
  {
    week: 'S2',
    incomePct: 68,
    expensePct: 52,
    incomeAmountFormatted: '$800.000',
    expenseAmountFormatted: '$520.000',
  },
  {
    week: 'S3',
    incomePct: 62,
    expensePct: 46,
    incomeAmountFormatted: '$750.000',
    expenseAmountFormatted: '$460.000',
  },
  {
    week: 'S4',
    incomePct: 88,
    expensePct: 56,
    incomeAmountFormatted: '$1.050.000',
    expenseAmountFormatted: '$620.000',
  },
];

export const DEMO_SUMMARY_DATA: AnalyticsSummaryData = {
  period: DEMO_ANALYTICS_PERIOD,
  currency: 'COP',
  differenceAmount: 1250000,
  differenceFormatted: '+$1.250.000',
  differenceNote: 'Ingresos menos gastos · no es tu saldo',
  statusPillText: 'Tu mes cerró en positivo',
  totalIncome: 3250000,
  totalIncomeFormatted: '$3.250.000',
  totalExpense: 2000000,
  totalExpenseFormatted: '$2.000.000',
  topExpenseCategory: 'Alimentación',
  topExpenseAmount: 800000,
  topExpenseFormatted: '$800.000 · 40%',
  weeklyMovements: DEMO_WEEKLY_MOVEMENTS,
};

export const DEMO_CATEGORY_EXPENSES: CategoryExpenseItem[] = [
  {
    id: 'cat_food',
    name: 'Alimentación',
    amount: 800000,
    amountFormatted: '$800.000',
    percentage: 40,
    color: '#C2185B',
  },
  {
    id: 'cat_transport',
    name: 'Transporte',
    amount: 400000,
    amountFormatted: '$400.000',
    percentage: 20,
    color: '#8468DB',
  },
  {
    id: 'cat_entertainment',
    name: 'Entretenimiento',
    amount: 300000,
    amountFormatted: '$300.000',
    percentage: 15,
    color: '#D68932',
  },
  {
    id: 'cat_services',
    name: 'Servicios',
    amount: 500000,
    amountFormatted: '$500.000',
    percentage: 25,
    color: '#2A9D8F',
  },
];

export const DEMO_CATEGORY_DATA: AnalyticsCategoryData = {
  period: DEMO_ANALYTICS_PERIOD,
  periodSubtitle: 'Septiembre de 2026 · pesos colombianos',
  totalExpenseFormatted: '$2.000.000',
  currency: 'COP',
  categories: DEMO_CATEGORY_EXPENSES,
};

export const DEMO_WEEKLY_TRENDS: WeeklyBarData[] = [
  {
    week: 'S1',
    incomePct: 60,
    expensePct: 40,
    incomeAmountFormatted: '$600.000',
    expenseAmountFormatted: '$400.000',
  },
  {
    week: 'S2',
    incomePct: 70,
    expensePct: 48,
    incomeAmountFormatted: '$700.000',
    expenseAmountFormatted: '$480.000',
  },
  {
    week: 'S3',
    incomePct: 65,
    expensePct: 38,
    incomeAmountFormatted: '$650.000',
    expenseAmountFormatted: '$380.000',
  },
  {
    week: 'S4',
    incomePct: 92,
    expensePct: 52,
    incomeAmountFormatted: '$920.000',
    expenseAmountFormatted: '$520.000',
  },
];

export const DEMO_TREND_DATA: AnalyticsTrendData = {
  period: DEMO_ANALYTICS_PERIOD,
  legendIncomeLabel: 'Ingresos',
  legendExpenseLabel: 'Gastos',
  currency: 'COP',
  weeklyTrends: DEMO_WEEKLY_TRENDS,
  insightTitle: 'Tus gastos bajaron un 9,1%',
  insightDescription:
    'Frente a agosto: $2.200.000 → $2.000.000.\nVas gastando menos que el mes anterior.',
  incomeComparisonLabel: 'Ingresos · +12,1% vs. agosto',
  incomeComparisonCurrentFormatted: '$3.250.000',
  previousMonthLabel: 'Agosto · ingresos',
  previousMonthIncomeFormatted: '$2.900.000',
};
