// ============================================================
// Formato y etiquetas del backoffice
// ============================================================
// Dinero y fechas delegan en `money.ts` y `datetime.ts` (única fuente de
// formato de la app). Aquí solo viven las etiquetas en español de los valores
// del backend y el tono visual de cada estado.

import { formatCopCents } from './money';
import { formatBogotaDateTime, parseApiDate } from './datetime';

/** Centavos → "$850.000" (COP). `—` si no hay valor. */
export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—';
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${formatCopCents(Math.abs(cents), { withSymbol: false })}`;
}

/** ISO UTC → "9 oct 2026 · 10:24 a. m." (Colombia); con segundos, "10:24:05 a. m.". */
export function formatDateTime(iso: string | null | undefined, withSeconds = false): string {
  if (!withSeconds) return formatBogotaDateTime(iso);
  const parsed = parseApiDate(iso);
  if (!parsed) return iso ?? '—';
  const base = formatBogotaDateTime(iso);
  const seconds = String(parsed.date.getUTCSeconds()).padStart(2, '0');
  // "9 oct 2026 · 10:24 a. m." → "9 oct 2026 · 10:24:05 a. m."
  return base.replace(/(\d{1,2}:\d{2}) /, `$1:${seconds} `);
}

export const CASE_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En proceso',
  ESCALATED: 'Escalado',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

export const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export const USER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
  CLOSED: 'Cerrado',
};

export const OPERATION_TYPE_LABEL: Record<string, string> = {
  INTERNAL_TRANSFER: 'Transferencia',
  SIMULATED_RECHARGE: 'Recarga simulada',
  REVERSAL: 'Reverso',
  ADMIN_ADJUSTMENT: 'Ajuste administrativo',
};

export const TIMELINE_STEP_LABEL: Record<string, string> = {
  LEDGER_OPERATION_CREATED: 'Operación registrada',
  OUTBOX_EVENT_RECORDED: 'Evento registrado',
  EVENT_PUBLISHED: 'Evento publicado',
  PROJECTED_TO_FIRESTORE: 'Reflejado en el historial',
};

export const ROLE_INFO: Record<string, string> = {
  CLIENTE: 'Billetera y operaciones propias',
  SOPORTE: 'Consulta y atención de casos',
  OPERADOR_FINANCIERO: 'Gestión financiera autorizada',
  ADMIN: 'Configuración y gestión administrativa',
};

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'brand' | 'neutral';

export function toneForStatus(status: string): Tone {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
    case 'ACTIVE':
    case 'RESOLVED':
    case 'SYNCED':
      return 'ok';
    case 'PENDING':
    case 'PROCESSING':
    case 'IN_PROGRESS':
    case 'SUSPENDED':
    case 'MEDIUM':
      return 'warn';
    case 'FAILED':
    case 'HIGH':
    case 'URGENT':
    case 'CLOSED':
      return 'danger';
    case 'ESCALATED':
    case 'REVERSED':
    case 'LOW':
      return 'info';
    case 'OPEN':
      return 'brand';
    default:
      return 'neutral';
  }
}
