// ============================================================
// Transferencias: DTO de API → view model
// ============================================================
// Límites del contrato:
//   - `TransferResponseDto` no incluye nombre de la contraparte.
//   - En una transferencia recibida no se expone el código de origen.
//   - No incluye `balanceAfterCents`.
// Por eso la UI muestra el código público cuando está disponible y evita
// presentar un saldo posterior que el backend no confirmó.

import type { TransferDto } from '../transfersService';
import type { TransferItem } from '../../types/transfers';
import { formatBogotaDateTime } from '../../utils/datetime';

export interface MapTransferContext {
  /** `clientId` del perfil/billetera autenticados. Necesario para la dirección. */
  readonly ownClientId: string;
}

const STATUS_LABELS: Readonly<Record<string, string>> = {
  COMPLETED: 'Completada',
  REVERSED: 'Reversada',
};

export function mapTransferStatus(status: string): string {
  const normalized = status.trim().toUpperCase();
  return STATUS_LABELS[normalized] ?? status;
}

export function transferDirection(
  dto: TransferDto,
  ownClientId: string,
): 'sent' | 'received' {
  if (dto.originClientId === ownClientId) return 'sent';
  if (dto.destinationClientId === ownClientId) return 'received';
  throw new Error(
    'La transferencia no pertenece al cliente autenticado; no se puede mostrar.',
  );
}

/**
 * @throws si `ownClientId` no coincide con origen ni destino. Es una defensa
 * adicional: el backend ya aplica autorización por recurso.
 */
export function mapTransfer(
  dto: TransferDto,
  context: MapTransferContext,
): TransferItem {
  const ownClientId = context.ownClientId.trim();
  if (ownClientId.length === 0) {
    throw new Error('Falta el clientId autenticado para interpretar la transferencia.');
  }
  const direction = transferDirection(dto, ownClientId);
  const isSent = direction === 'sent';
  const destinationCode = dto.destinationTransferCode;

  return {
    id: dto.transferId,
    reference: dto.transferId,
    direction,
    // Enviada: el único identificador disponible es el código público destino.
    // Recibida: el contrato no expone el código de origen.
    counterpartyName: isSent ? destinationCode : 'Origen no disponible',
    counterpartyCode: isSent ? destinationCode : '',
    amountCents: dto.amountCents,
    occurredAtLabel: formatBogotaDateTime(dto.timestamp),
    message: dto.description ?? '',
    statusLabel: mapTransferStatus(dto.status),
    balanceAfterCents: null,
  };
}

export function mapTransfers(
  items: readonly TransferDto[],
  context: MapTransferContext,
): TransferItem[] {
  return items.map((item) => mapTransfer(item, context));
}
