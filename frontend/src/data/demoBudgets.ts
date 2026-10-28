// ============================================================
// DATOS DEMO — Módulo Presupuestos (Budgets)
// ⚠️ SOLO PARA PREVISUALIZACIÓN. No representan la cuenta real.
// No ejecutan operaciones ni llaman al backend.
// ============================================================

import {
  BudgetDetail,
  BudgetDraft,
  BudgetExpense,
  BudgetItem,
} from '../types/budgets';
import { formatCopFromCents } from './demoTransfers';

export const DEMO_BUDGET_MONTH = 'Octubre 2026';

export const DEMO_BUDGETS: BudgetItem[] = [
  {
    id: 'demo-budget-mercado',
    category: 'Mercado',
    spentCents: 32_000_000,
    limitCents: 40_000_000,
    percent: 80,
    health: 'warning',
  },
  {
    id: 'demo-budget-transporte',
    category: 'Transporte',
    spentCents: 11_200_000,
    limitCents: 25_000_000,
    percent: 45,
    health: 'on-track',
  },
  {
    id: 'demo-budget-ocio',
    category: 'Ocio',
    spentCents: 16_800_000,
    limitCents: 15_000_000,
    percent: 112,
    health: 'exceeded',
  },
  {
    id: 'demo-budget-salud',
    category: 'Salud',
    spentCents: 8_000_000,
    limitCents: 40_000_000,
    percent: 20,
    health: 'on-track',
  },
];

export const DEMO_BUDGET_EXPENSES: BudgetExpense[] = [
  {
    id: 'demo-budget-expense-1',
    merchant: 'Tienda del barrio',
    amountCents: 4_500_000,
    dateLabel: 'Hoy',
  },
  {
    id: 'demo-budget-expense-2',
    merchant: 'Supermercado',
    amountCents: 7_500_000,
    dateLabel: 'Lun',
  },
];

export const DEMO_BUDGET_DETAIL: BudgetDetail = {
  category: 'Mercado',
  periodLabel: 'octubre 2026',
  spentCents: 12_000_000,
  limitCents: 40_000_000,
  remainingCents: 28_000_000,
  percent: 30,
  daysRemaining: 23,
  dailySuggestedCents: 1_217_300,
  expenses: DEMO_BUDGET_EXPENSES,
};

export const DEMO_BUDGET_WARNING: BudgetDetail = {
  category: 'Mercado',
  periodLabel: 'octubre 2026',
  spentCents: 32_000_000,
  limitCents: 40_000_000,
  remainingCents: 8_000_000,
  percent: 80,
  daysRemaining: 23,
  dailySuggestedCents: 347_800,
  expenses: DEMO_BUDGET_EXPENSES,
};

export const DEMO_BUDGET_EXCEEDED: BudgetDetail = {
  category: 'Ocio',
  periodLabel: 'octubre 2026',
  spentCents: 16_800_000,
  limitCents: 15_000_000,
  remainingCents: -1_800_000,
  percent: 112,
  daysRemaining: 23,
  dailySuggestedCents: 0,
  expenses: [],
};

export const DEMO_BUDGET_CREATE_DRAFT: BudgetDraft = {
  category: 'Mercado',
  period: DEMO_BUDGET_MONTH,
  limitCents: 40_000_000,
};

export const DEMO_BUDGET_EDIT_DRAFT: BudgetDraft = {
  category: 'Mercado',
  period: DEMO_BUDGET_MONTH,
  limitCents: 45_000_000,
  previousLimitCents: 40_000_000,
};

export const getBudgetHealthLabel = (health: BudgetItem['health']): string => {
  if (health === 'exceeded') {
    return 'Superado';
  }
  if (health === 'warning') {
    return 'Cerca del límite';
  }
  return 'En orden';
};

export const formatBudgetAmount = (amountCents: number): string =>
  formatCopFromCents(amountCents);

export const formatBudgetExpenseAmount = (amountCents: number): string =>
  `- ${formatCopFromCents(amountCents)}`;

export const formatBudgetOverage = (amountCents: number): string =>
  `- ${formatCopFromCents(Math.abs(amountCents))}`;
