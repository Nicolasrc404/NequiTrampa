// ============================================================
// DATOS DEMO — Módulo Efectivo (Cash)
// ⚠️ SOLO PARA PREVISUALIZACIÓN. NO son datos reales.
// NO ejecutan operaciones financieras ni llaman al backend.
// El efectivo es independiente del saldo bancario.
// ============================================================

import {
  CashFormDraft,
  CashResult,
  CashTransaction,
} from '../types/cash';
import { formatCopFromCents } from './demoTransfers';

// Montos en centavos de COP, siempre enteros.
export const DEMO_CASH_AVAILABLE_CENTS = 18_000_000; // $ 180.000
export const DEMO_CASH_INCOME_CENTS = 15_000_000; // $ 150.000
export const DEMO_CASH_EXPENSE_CENTS = 4_500_000; // $ 45.000
export const DEMO_CASH_EXCEEDED_CENTS = 25_000_000; // $ 250.000
export const DEMO_CASH_INCOME_AFTER_CENTS = 33_000_000; // $ 330.000
export const DEMO_CASH_EXPENSE_AFTER_CENTS = 13_500_000; // $ 135.000

export const DEMO_CASH_INCOME_DRAFT: CashFormDraft = {
  category: 'Salario extra',
  dateLabel: '8 oct 2026',
  note: '',
  amountCents: DEMO_CASH_INCOME_CENTS,
  direction: 'income',
};

export const DEMO_CASH_EXPENSE_DRAFT: CashFormDraft = {
  category: 'Mercado',
  dateLabel: '8 oct 2026',
  note: '',
  amountCents: DEMO_CASH_EXPENSE_CENTS,
  direction: 'expense',
};

export const DEMO_CASH_INCOME_RESULT: CashResult = {
  category: DEMO_CASH_INCOME_DRAFT.category,
  dateLabel: DEMO_CASH_INCOME_DRAFT.dateLabel,
  balanceAfterCents: DEMO_CASH_INCOME_AFTER_CENTS,
  amountCents: DEMO_CASH_INCOME_CENTS,
  direction: 'income',
};

export const DEMO_CASH_EXPENSE_RESULT: CashResult = {
  category: DEMO_CASH_EXPENSE_DRAFT.category,
  dateLabel: DEMO_CASH_EXPENSE_DRAFT.dateLabel,
  balanceAfterCents: DEMO_CASH_EXPENSE_AFTER_CENTS,
  amountCents: DEMO_CASH_EXPENSE_CENTS,
  direction: 'expense',
};

export const DEMO_CASH_HISTORY: CashTransaction[] = [
  {
    id: 'demo-cash-001',
    category: 'Mercado',
    direction: 'expense',
    amountCents: 4_500_000,
    dateLabel: 'Hoy',
  },
  {
    id: 'demo-cash-002',
    category: 'Salario extra',
    direction: 'income',
    amountCents: 15_000_000,
    dateLabel: 'Ayer',
  },
  {
    id: 'demo-cash-003',
    category: 'Transporte',
    direction: 'expense',
    amountCents: 1_200_000,
    dateLabel: 'Lun',
  },
  {
    id: 'demo-cash-004',
    category: 'Almuerzo',
    direction: 'expense',
    amountCents: 1_800_000,
    dateLabel: 'Dom',
  },
  {
    id: 'demo-cash-005',
    category: 'Venta usados',
    direction: 'income',
    amountCents: 6_000_000,
    dateLabel: 'Sáb',
  },
];

export const DEMO_CASH_RECENT = DEMO_CASH_HISTORY.slice(0, 3);

export const formatCashAmount = (amountCents: number): string =>
  formatCopFromCents(amountCents);

export const formatSignedCashAmount = (
  amountCents: number,
  direction: CashTransaction['direction'],
): string => {
  const sign = direction === 'income' ? '+ ' : '- ';
  return `${sign}${formatCashAmount(amountCents)}`;
};

export const getCashDirectionLabel = (
  direction: CashTransaction['direction'],
): string => (direction === 'income' ? 'Ingreso' : 'Gasto');
