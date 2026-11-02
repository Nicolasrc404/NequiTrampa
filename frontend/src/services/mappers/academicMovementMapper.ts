import type { MovementDto } from '../movementsService';
import type { RechargeDto } from '../rechargesService';
import type { TransferDto } from '../transfersService';

/**
 * Adapta los historiales del backend académico al contrato común de Movimientos.
 * El modo académico no usa la proyección Finance/Firestore: Wallet ya conserva
 * estas operaciones en su store local y expone sus propios listados.
 */
export function buildAcademicMovementDtos(
  transfers: readonly TransferDto[],
  recharges: readonly RechargeDto[],
  ownClientId: string,
): MovementDto[] {
  const normalizedClientId = ownClientId.trim();
  if (normalizedClientId.length === 0) return [];

  const transferItems: MovementDto[] = transfers
    .filter(
      (transfer) =>
        transfer.originClientId === normalizedClientId ||
        transfer.destinationClientId === normalizedClientId,
    )
    .map((transfer) => ({
      eventId: transfer.transferId,
      operationId: transfer.ledgerOperationId,
      type:
        transfer.originClientId === normalizedClientId
          ? 'TRANSFER_SENT'
          : 'TRANSFER_RECEIVED',
      amountCents:
        transfer.originClientId === normalizedClientId
          ? -transfer.amountCents
          : transfer.amountCents,
      currency: transfer.currency,
      counterpartyClientId:
        transfer.originClientId === normalizedClientId
          ? transfer.destinationClientId
          : transfer.originClientId,
      description: transfer.description,
      balanceAfterCents: null,
      occurredAt: transfer.timestamp,
      syncStatus: 'LOCAL_ACADEMIC',
      status: transfer.status,
    }));

  const rechargeItems: MovementDto[] = recharges
    .filter((recharge) => recharge.clientId === normalizedClientId)
    .map((recharge) => ({
      eventId: recharge.rechargeId,
      operationId: recharge.ledgerOperationId,
      type: 'RECHARGE',
      amountCents: recharge.amountCents,
      currency: recharge.currency,
      counterpartyClientId: null,
      description: 'Recarga simulada',
      balanceAfterCents: null,
      occurredAt: recharge.timestamp,
      syncStatus: 'LOCAL_ACADEMIC',
      status: recharge.status,
    }));

  return [...transferItems, ...rechargeItems].sort((left, right) => {
    const leftTime = left.occurredAt ? Date.parse(left.occurredAt) : 0;
    const rightTime = right.occurredAt ? Date.parse(right.occurredAt) : 0;
    return rightTime - leftTime;
  });
}
