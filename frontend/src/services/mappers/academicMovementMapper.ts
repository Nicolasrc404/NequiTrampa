import type { MovementDto } from '../movementsService';
import type { RechargeDto } from '../rechargesService';
import type { TransferDto } from '../transfersService';
import { ACADEMIC_DEMO_USERS } from '../academicCatalog';

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
    .map((transfer) => {
      const isSent = transfer.originClientId === normalizedClientId;
      const counterpartyClientId = isSent
        ? transfer.destinationClientId
        : transfer.originClientId;
      const counterparty = ACADEMIC_DEMO_USERS.find(
        (user) => user.uid === counterpartyClientId,
      );

      return {
      eventId: transfer.transferId,
      operationId: transfer.ledgerOperationId,
      type: isSent ? 'TRANSFER_SENT' : 'TRANSFER_RECEIVED',
      amountCents:
        isSent ? -transfer.amountCents : transfer.amountCents,
      currency: transfer.currency,
      counterpartyClientId,
      counterpartyName: counterparty?.displayName ?? null,
      counterpartyCode:
        counterparty?.transferCode ?? (isSent ? transfer.destinationTransferCode : null),
      description: transfer.description,
      balanceAfterCents: null,
      occurredAt: transfer.timestamp,
      syncStatus: 'LOCAL_ACADEMIC',
      status: transfer.status,
      };
    });

  const rechargeItems: MovementDto[] = recharges
    .filter((recharge) => recharge.clientId === normalizedClientId)
    .map((recharge) => ({
      eventId: recharge.rechargeId,
      operationId: recharge.ledgerOperationId,
      type: 'RECHARGE',
      amountCents: recharge.amountCents,
      currency: recharge.currency,
      counterpartyClientId: null,
      counterpartyName: null,
      counterpartyCode: null,
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
