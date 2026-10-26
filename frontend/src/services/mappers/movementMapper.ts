// ============================================================
// Movimientos: DTO de API → view model
// ============================================================
// El backend no expone nombre ni referencia de contraparte. No se inventan:
// se muestran el tipo y la descripción tal como llegan. Los elementos sin
// identificador estable se descartan para no fabricar claves.

import type { MovementDto } from '../movementsService';
import type { MovementItem, MovementType } from '../../types/movements';
import { formatBogotaDateTime, formatBogotaTime } from '../../utils/datetime';

const TYPE_LABELS: Readonly<Record<string, string>> = {
  TRANSFER_SENT: 'Transferencia enviada',
  TRANSFER_RECEIVED: 'Transferencia recibida',
  RECHARGE: 'Recarga',
};

function mapType(type: string | null): MovementType {
  if (type === 'TRANSFER_SENT') return 'TRANSFER_SENT';
  if (type === 'TRANSFER_RECEIVED') return 'TRANSFER_RECEIVED';
  if (type === 'RECHARGE') return 'RECHARGE';
  return 'OTHER';
}

function mapStatus(status: string | null): MovementItem['status'] {
  const normalized = (status ?? '').trim().toUpperCase();
  if (['COMPLETED', 'COMPLETADA', 'SUCCESS', 'SUCCEEDED'].includes(normalized)) {
    return 'Completada';
  }
  if (['PENDING', 'PENDIENTE', 'PROCESSING', 'IN_PROGRESS'].includes(normalized)) {
    return 'Pendiente';
  }
  if (['FAILED', 'FALLIDA', 'REVERSED', 'REVERTIDA', 'REJECTED'].includes(normalized)) {
    return 'Fallida';
  }
  return 'Desconocido';
}

function typeLabel(type: string | null): string {
  if (!type) return 'Movimiento';
  return TYPE_LABELS[type] ?? type;
}

/** `null` cuando el backend no entrega ningún identificador estable. */
export function movementIdentifier(dto: MovementDto): string | null {
  return dto.operationId ?? dto.eventId;
}

export function mapMovement(dto: MovementDto): MovementItem | null {
  const id = movementIdentifier(dto);
  if (!id) return null;

  const description = dto.description?.trim() ?? '';
  const type = mapType(dto.type);
  const balanceAfterCents = dto.balanceAfterCents;

  return {
    id,
    reference: id,
    title: description.length > 0 ? description : typeLabel(dto.type),
    type,
    categoryLabel: typeLabel(dto.type),
    timestamp: formatBogotaTime(dto.occurredAt),
    formattedDate: formatBogotaDateTime(dto.occurredAt),
    amount: Math.trunc(dto.amountCents / 100),
    amountCents: dto.amountCents,
    balanceAfter:
      balanceAfterCents === null ? null : Math.trunc(balanceAfterCents / 100),
    balanceAfterCents,
    status: mapStatus(dto.status),
  };
}

export function mapMovements(items: readonly MovementDto[]): MovementItem[] {
  const result: MovementItem[] = [];
  for (const item of items) {
    const mapped = mapMovement(item);
    if (mapped) result.push(mapped);
  }
  return result;
}
