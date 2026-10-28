// ============================================================
// DATOS DEMO — Módulo Recargas
// ⚠️ SOLO PARA PREVISUALIZACIÓN. NO son datos reales.
// NO ejecutan operaciones financieras ni llaman al backend.
// Fuente visual: Stitch Recharges_01 – Recharges_10
// ============================================================

import {
  RechargeDraft,
  RechargeItem,
  RechargePreset,
  RechargeResult,
} from '../types/recharges';
import { formatCopFromCents } from './demoTransfers';

// Montos en centavos de COP, siempre enteros (contrato amountCents).
export const DEMO_RECHARGE_AMOUNT_CENTS = 30_000_000; // $ 300.000
export const DEMO_RECHARGE_MAX_CENTS = 100_000_000; // $ 1.000.000
export const DEMO_RECHARGE_BALANCE_AFTER_CENTS = 125_000_000; // $ 1.250.000

export const DEMO_RECHARGE_DRAFT: RechargeDraft = {
  amountCents: DEMO_RECHARGE_AMOUNT_CENTS,
};

export const DEMO_RECHARGE_PRESETS: RechargePreset[] = [
  { amountCents: 5_000_000 }, // $ 50.000
  { amountCents: 10_000_000 }, // $ 100.000
  { amountCents: 30_000_000 }, // $ 300.000
  { amountCents: 50_000_000 }, // $ 500.000
];

export const DEMO_RECHARGE_RESULT: RechargeResult = {
  reference: 'REC-000071',
  occurredAtLabel: '8 oct 2026 · 9:02 a. m.',
  balanceAfterCents: DEMO_RECHARGE_BALANCE_AFTER_CENTS,
};

export const DEMO_RECHARGE_HISTORY: RechargeItem[] = [
  {
    id: 'demo-rec-001',
    reference: 'REC-000071',
    amountCents: 30_000_000,
    occurredAtLabel: 'Hoy · 9:02 a. m.',
    statusLabel: 'Recarga simulada',
    balanceAfterCents: 125_000_000,
  },
  {
    id: 'demo-rec-002',
    reference: 'REC-000069',
    amountCents: 20_000_000,
    occurredAtLabel: 'Ayer · 8:15 a. m.',
    statusLabel: 'Recarga simulada',
    balanceAfterCents: 95_000_000,
  },
  {
    id: 'demo-rec-003',
    reference: 'REC-000064',
    amountCents: 10_000_000,
    occurredAtLabel: 'Lun · 7:50 a. m.',
    statusLabel: 'Recarga simulada',
    balanceAfterCents: 75_000_000,
  },
  {
    id: 'demo-rec-004',
    reference: 'REC-000058',
    amountCents: 5_000_000,
    occurredAtLabel: 'Dom · 6:30 p. m.',
    statusLabel: 'Recarga simulada',
    balanceAfterCents: 65_000_000,
  },
];

export const formatRechargeAmount = (amountCents: number): string =>
  formatCopFromCents(amountCents);
