// ============================================================
// DATOS DEMO — Módulo Transferencias
// ⚠️ SOLO PARA PREVISUALIZACIÓN. NO son datos reales.
// NO ejecutan operaciones financieras ni llaman al backend.
// Fuente visual: Stitch Transfers_01 – Transfers_22
// ============================================================

import { TransferDraft, TransferItem } from '../types/transfers';

// Montos en centavos de COP, siempre enteros (contrato amountCents).
export const DEMO_TRANSFER_AMOUNT_CENTS = 8_500_000; // $ 85.000
export const DEMO_TRANSFER_BALANCE_CENTS = 125_000_000; // $ 1.250.000
export const DEMO_TRANSFER_LIMIT_CENTS = 200_000_000; // $ 2.000.000
export const DEMO_TRANSFER_BALANCE_AFTER_CENTS = 116_500_000; // $ 1.165.000
export const DEMO_TRANSFER_DAILY_LIMIT_CENTS = 500_000_000; // $ 5.000.000

export const DEMO_TRANSFER_DRAFT: TransferDraft = {
  recipient: {
    id: 'demo-ben-001',
    name: 'Laura',
    code: 'LAUR-5120',
    initialLetter: 'L',
  },
  amountCents: DEMO_TRANSFER_AMOUNT_CENTS,
  message: 'Almuerzo del viernes',
};

export const DEMO_TRANSFER_RECIPIENTS = [
  { id: 'demo-ben-001', name: 'Laura', code: 'LAUR-5120', initialLetter: 'L' },
  { id: 'demo-ben-002', name: 'Sofía', code: 'SOFI-3307', initialLetter: 'S' },
  { id: 'demo-ben-003', name: 'Carlos', code: 'CARL-9941', initialLetter: 'C' },
];

export const DEMO_TRANSFER_HISTORY: TransferItem[] = [
  {
    id: 'demo-trf-001',
    reference: 'TRF-000184',
    direction: 'sent',
    counterpartyName: 'Laura',
    counterpartyCode: 'LAUR-5120',
    amountCents: 8_500_000,
    occurredAtLabel: 'Hoy · 2:14 p. m.',
    message: 'Almuerzo del viernes',
    statusLabel: 'Completada',
    balanceAfterCents: 116_500_000,
  },
  {
    id: 'demo-trf-002',
    reference: 'TRF-000179',
    direction: 'received',
    counterpartyName: 'Laura',
    counterpartyCode: 'LAUR-5120',
    amountCents: 4_000_000,
    occurredAtLabel: 'Ayer · 6:40 p. m.',
    message: 'Gracias',
    statusLabel: 'Completada',
    balanceAfterCents: 125_000_000,
  },
  {
    id: 'demo-trf-003',
    reference: 'TRF-000171',
    direction: 'sent',
    counterpartyName: 'Sofía',
    counterpartyCode: 'SOFI-3307',
    amountCents: 12_000_000,
    occurredAtLabel: 'Ayer · 11:20 a. m.',
    message: 'Arriendo',
    statusLabel: 'Completada',
    balanceAfterCents: 109_000_000,
  },
  {
    id: 'demo-trf-004',
    reference: 'TRF-000165',
    direction: 'sent',
    counterpartyName: 'Sofía',
    counterpartyCode: 'SOFI-3307',
    amountCents: 6_000_000,
    occurredAtLabel: 'Lun · 4:05 p. m.',
    message: 'Cena',
    statusLabel: 'Completada',
    balanceAfterCents: 121_000_000,
  },
  {
    id: 'demo-trf-005',
    reference: 'TRF-000160',
    direction: 'received',
    counterpartyName: 'Laura',
    counterpartyCode: 'LAUR-5120',
    amountCents: 2_500_000,
    occurredAtLabel: 'Lun · 10:30 a. m.',
    message: 'Transporte',
    statusLabel: 'Completada',
    balanceAfterCents: 127_000_000,
  },
  {
    id: 'demo-trf-006',
    reference: 'TRF-000154',
    direction: 'sent',
    counterpartyName: 'Carlos',
    counterpartyCode: 'CARL-9941',
    amountCents: 3_000_000,
    occurredAtLabel: 'Dom · 3:12 p. m.',
    message: 'Café',
    statusLabel: 'Completada',
    balanceAfterCents: 124_000_000,
  },
];

export const DEMO_TRANSFER_DETAIL: TransferItem = DEMO_TRANSFER_HISTORY[0];

// Formatea centavos enteros de COP sin aritmética de punto flotante.
export const formatCopFromCents = (amountCents: number): string => {
  const safeCents = Math.trunc(Math.abs(amountCents));
  const pesos = Math.trunc(safeCents / 100);
  const cents = safeCents % 100;
  const grouped = pesos.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centsLabel = cents > 0 ? `,${cents.toString().padStart(2, '0')}` : '';
  return `$ ${grouped}${centsLabel}`;
};

export const formatSignedCopFromCents = (
  amountCents: number,
  direction: 'sent' | 'received',
): string => {
  const sign = direction === 'sent' ? '- ' : '+ ';
  return `${sign}${formatCopFromCents(amountCents)}`;
};
