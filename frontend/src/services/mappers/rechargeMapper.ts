// ============================================================
// Recargas: DTO de API → view model
// ============================================================
// `RechargeResponseDto` no incluye el saldo posterior. Para la pantalla de
// éxito se usa el saldo autoritativo consultado después de la confirmación;
// si esa consulta falla, se muestra `null` en lugar de inventar un saldo.

import type { RechargeDto } from '../rechargesService';
import type { RechargeItem, RechargeResult } from '../../types/recharges';
import { formatBogotaDateTime } from '../../utils/datetime';

const STATUS_LABELS: Readonly<Record<string, string>> = {
  COMPLETED: 'Recarga completada',
  PENDING: 'Recarga pendiente',
  FAILED: 'Recarga fallida',
};

export function mapRechargeStatus(status: string): string {
  const normalized = status.trim().toUpperCase();
  return STATUS_LABELS[normalized] ?? status;
}

export function mapRecharge(dto: RechargeDto): RechargeItem {
  return {
    id: dto.rechargeId,
    reference: dto.rechargeId,
    amountCents: dto.amountCents,
    occurredAtLabel: formatBogotaDateTime(dto.timestamp),
    statusLabel: mapRechargeStatus(dto.status),
    balanceAfterCents: null,
  };
}

export function mapRecharges(items: readonly RechargeDto[]): RechargeItem[] {
  return items.map(mapRecharge);
}

export function mapRechargeResult(
  dto: RechargeDto,
  balanceAfterCents: number | null,
): RechargeResult {
  return {
    reference: dto.rechargeId,
    occurredAtLabel: formatBogotaDateTime(dto.timestamp),
    balanceAfterCents,
  };
}
