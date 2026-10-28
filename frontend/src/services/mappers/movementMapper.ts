// ============================================================
// Movimientos: DTO de API → view model
// ============================================================
// El backend no expone nombre ni referencia de contraparte. No se inventan:
// se muestran el tipo y la descripción tal como llegan. Los elementos sin
// identificador estable se descartan para no fabricar claves.

import type { MovementDto } from '../movementsService';
import type { MovementItem, MovementType } from '../../types/movements';
import { formatBogotaDateTime, formatBogotaTime } from '../../utils/datetime';

const TYPE_LABELS: Readonly<Record<MovementType, string>> = {
  TRANSFER_SENT: 'Transferencia enviada',
  TRANSFER_RECEIVED: 'Transferencia recibida',
  RECHARGE: 'Recarga',
  OTHER: 'Movimiento',
};

/**
 * Tipos de evento que emite el backend (`Nequi.Shared.Events.EventTypes`) y
 * tipos heredados de la proyección anterior. Para `TRANSFER_COMPLETED` la
 * dirección se deduce del signo: negativo = enviado, positivo = recibido.
 */
function mapType(type: string | null, amountCents: number): MovementType {
  switch ((type ?? '').trim().toUpperCase()) {
    case 'TRANSFER_COMPLETED':
      return amountCents < 0 ? 'TRANSFER_SENT' : 'TRANSFER_RECEIVED';
    case 'TRANSFER_SENT':
      return 'TRANSFER_SENT';
    case 'TRANSFER_RECEIVED':
      return 'TRANSFER_RECEIVED';
    case 'RECHARGE':
    case 'RECHARGE_COMPLETED':
      return 'RECHARGE';
    default:
      return 'OTHER';
  }
}

function typeLabel(type: MovementType, rawType: string | null): string {
  if (type === 'OTHER' && rawType && rawType.trim().length > 0) {
    return rawType.trim();
  }
  return TYPE_LABELS[type];
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

/** `null` cuando el backend no entrega ningún identificador estable. */
export function movementIdentifier(dto: MovementDto): string | null {
  return dto.operationId ?? dto.eventId;
}

export function mapMovement(dto: MovementDto): MovementItem | null {
  const id = movementIdentifier(dto);
  if (!id) return null;

  const description = dto.description?.trim() ?? '';
  const type = mapType(dto.type, dto.amountCents);
  const label = typeLabel(type, dto.type);
  const balanceAfterCents = dto.balanceAfterCents;

  return {
    id,
    reference: id,
    title: description.length > 0 ? description : label,
    type,
    categoryLabel: label,
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
