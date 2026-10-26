// ============================================================
// Efectivo: DTO de API → view model
// ============================================================
// El efectivo es un registro personal declarado. `balanceAfterCents` proviene
// del resumen autoritativo del backend; la UI nunca lo calcula por su cuenta.

import type {
  CashMovementCreatedDto,
  CashMovementDto,
} from '../cashService';
import type { CashResult, CashTransaction } from '../../types/cash';
import { formatShortDateLabel } from '../../utils/datetime';

export const CASH_UNCATEGORIZED_LABEL = 'Sin categoría';

function bogotaTodayKey(): string {
  const shifted = new Date(Date.now() - 300 * 60_000);
  const year = shifted.getUTCFullYear();
  const month = (shifted.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = shifted.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** `Hoy`, `Ayer` o la fecha corta (`8 oct 2026`). */
export function formatCashDayLabel(occurredOn: string): string {
  const date = (occurredOn ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date || '—';
  const today = bogotaTodayKey();
  if (date === today) return 'Hoy';
  const yesterdayDate = new Date(`${today}T00:00:00Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  if (date === yesterday) return 'Ayer';
  return formatShortDateLabel(date);
}

export function mapCashTransaction(dto: CashMovementDto): CashTransaction {
  const note = dto.note?.trim();
  return {
    id: dto.id,
    category: dto.categoryName?.trim() || CASH_UNCATEGORIZED_LABEL,
    direction: dto.direction,
    amountCents: dto.amountCents,
    dateLabel: formatCashDayLabel(dto.occurredOn),
    ...(note ? { note } : {}),
  };
}

export function mapCashTransactions(
  dtos: readonly CashMovementDto[],
): readonly CashTransaction[] {
  return dtos.map(mapCashTransaction);
}

export function mapCashResult(dto: CashMovementCreatedDto): CashResult {
  return {
    category:
      dto.movement.categoryName?.trim() || CASH_UNCATEGORIZED_LABEL,
    dateLabel: formatCashDayLabel(dto.movement.occurredOn),
    balanceAfterCents: dto.movement.balanceAfterCents,
    amountCents: dto.movement.amountCents,
    direction: dto.movement.direction,
  };
}
