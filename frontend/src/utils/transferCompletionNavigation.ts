export type TransferCompletionAction = 'home' | 'movements' | 'back';
export type TransferCompletionTarget = 'Wallet_01' | 'Movements_01';

/** Destinos seguros después de una transferencia ya confirmada. */
export function resolveTransferCompletionTarget(
  action: TransferCompletionAction,
): TransferCompletionTarget {
  return action === 'home' ? 'Wallet_01' : 'Movements_01';
}
