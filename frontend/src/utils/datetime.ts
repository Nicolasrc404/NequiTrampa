// ============================================================
// Fechas para la UI (Colombia, UTC-5 todo el año)
// ============================================================
// El backend entrega `occurredAt` / `timestamp` como ISO-8601 (UTC). La app
// muestra la hora de Colombia. No se usa `Intl` para evitar diferencias entre
// motores JS: Colombia no aplica horario de verano, el desplazamiento es fijo.

const MONTHS_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

const MONTHS_LONG_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const BOGOTA_OFFSET_MINUTES = -300;

interface BogotaParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hours: number;
  readonly minutes: number;
}

function toBogotaParts(date: Date): BogotaParts {
  const shifted = new Date(date.getTime() + BOGOTA_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

function twelveHour(hours: number): { hour: number; suffix: string } {
  if (hours === 0) return { hour: 12, suffix: 'a. m.' };
  if (hours < 12) return { hour: hours, suffix: 'a. m.' };
  if (hours === 12) return { hour: 12, suffix: 'p. m.' };
  return { hour: hours - 12, suffix: 'p. m.' };
}

export interface ParsedDate {
  readonly date: Date;
  readonly parts: BogotaParts;
}

/** Devuelve `null` si el valor no es una fecha ISO válida. */
export function parseApiDate(value: string | null | undefined): ParsedDate | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return { date, parts: toBogotaParts(date) };
}

/** Ejemplo: `8 oct 2026 · 9:02 a. m.` */
export function formatBogotaDateTime(value: string | null | undefined): string {
  const parsed = parseApiDate(value);
  if (!parsed) return value ?? '—';
  const { parts } = parsed;
  const { hour, suffix } = twelveHour(parts.hours);
  const minutes = parts.minutes.toString().padStart(2, '0');
  return `${parts.day} ${MONTHS_ES[parts.month]} ${parts.year} · ${hour}:${minutes} ${suffix}`;
}

/** Ejemplo: `9:02 a. m.` */
export function formatBogotaTime(value: string | null | undefined): string {
  const parsed = parseApiDate(value);
  if (!parsed) return value ?? '—';
  const { hour, suffix } = twelveHour(parsed.parts.hours);
  return `${hour}:${parsed.parts.minutes.toString().padStart(2, '0')} ${suffix}`;
}

/**
 * Etiqueta de un periodo mensual `AAAA-MM`. Ejemplo: `2026-10` → `octubre 2026`.
 * Devuelve el valor original si no cumple el formato.
 */
export function formatMonthPeriodLabel(period: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec((period ?? '').trim());
  if (!match) return period ?? '—';
  const month = Number(match[2]) - 1;
  return `${MONTHS_LONG_ES[month]} ${match[1]}`;
}

/**
 * Etiqueta larga de una fecha `AAAA-MM-DD`. Ejemplo: `2027-06-30` →
 * `30 de junio de 2027`. Devuelve el valor original si no cumple el formato.
 */
export function formatLongDateLabel(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((date ?? '').trim());
  if (!match) return date ?? '—';
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return date;
  return `${Number(match[3])} de ${MONTHS_LONG_ES[month]} de ${match[1]}`;
}

/** Etiqueta corta de una fecha `AAAA-MM-DD` para listas. Ejemplo: `8 oct 2026`. */
export function formatShortDateLabel(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((date ?? '').trim());
  if (!match) return date ?? '—';
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return date;
  return `${Number(match[3])} ${MONTHS_ES[month]} ${match[1]}`;
}

/** Fecha de hoy en Colombia como `AAAA-MM-DD` (para claves locales). */
export function bogotaDayKey(value: string | null | undefined): string | null {
  const parsed = parseApiDate(value);
  if (!parsed) return null;
  const { year, month, day } = parsed.parts;
  return `${year}-${(month + 1).toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
}
