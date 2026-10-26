/** Centavos → "$850.000" (COP, sin decimales salvo que existan centavos). */
export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—';
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const pesos = Math.floor(abs / 100);
  const rest = abs % 100;
  const grouped = String(pesos).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}$${grouped}${rest ? `,${String(rest).padStart(2, '0')}` : ''}`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** ISO UTC → "9 oct 2026 · 10:24 a. m." en hora de Colombia (UTC-5, sin DST). */
export function formatDateTime(iso: string | null | undefined, withSeconds = false): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const d = new Date(t - 5 * 3600 * 1000);
  const h24 = d.getUTCHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = withSeconds ? `:${String(d.getUTCSeconds()).padStart(2, '0')}` : '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${h12}:${mm}${ss} ${h24 < 12 ? 'a. m.' : 'p. m.'}`;
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
  TRANSFER: 'Transferencia',
  RECHARGE: 'Recarga',
  REVERSAL: 'Reverso',
  ADMIN_ADJUSTMENT: 'Ajuste administrativo',
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
    case 'LOW':
      return 'info';
    case 'OPEN':
      return 'brand';
    default:
      return 'neutral';
  }
}
