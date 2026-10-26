// ============================================================
// MÓDULO: Transferencias
// Fuente visual: Stitch NequiTrampa Movements Screens Replicas
// Pantallas: Transfers_01 – Transfers_22
// ============================================================

export type TransfersState =
  | 'Transfers_01' // Enviar dinero
  | 'Transfers_02' // ¿Para quién?
  | 'Transfers_03' // Enviando tu dinero
  | 'Transfers_04' // Transferencia realizada (201)
  | 'Transfers_05' // Error de validación (400)
  | 'Transfers_06' // Tu sesión venció (401)
  | 'Transfers_07' // Destinatario no encontrado (404)
  | 'Transfers_08' // Operación ya procesada (409)
  | 'Transfers_09' // Saldo insuficiente (422)
  | 'Transfers_10' // Límite en modal/bottom (422)
  | 'Transfers_11' // Superaste el límite (422)
  | 'Transfers_12' // Demasiados intentos (429)
  | 'Transfers_13' // Algo salió mal (500)
  | 'Transfers_14' // Servicio no disponible (503)
  | 'Transfers_15' // Mis transferencias
  | 'Transfers_16' // Sin transferencias (Empty State)
  | 'Transfers_17' // Skeleton de carga
  | 'Transfers_18' // Error al cargar historial (503)
  | 'Transfers_19' // Detalle de transferencia
  | 'Transfers_20' // Transferencia no encontrada (404)
  | 'Transfers_21' // No puedes ver esta transferencia (403)
  | 'Transfers_22'; // Comprobante de transferencia

export type TransferDirection = 'sent' | 'received';
export type TransferFilter = 'all' | 'sent' | 'received';

export interface TransferRecipient {
  id: string;
  name: string;
  code: string;
  initialLetter: string;
}

export interface TransferItem {
  id: string;
  reference: string;
  direction: TransferDirection;
  counterpartyName: string;
  counterpartyCode: string;
  /**
   * Monto absoluto en centavos de COP (int64 en el backend).
   * No usar punto flotante para operaciones financieras.
   */
  amountCents: number;
  occurredAtLabel: string;
  message: string;
  statusLabel: string;
  /** Saldo después en centavos de COP; `null` si el contrato no lo expone. */
  balanceAfterCents: number | null;
}

export interface TransferDraft {
  recipient: TransferRecipient;
  /** Monto en centavos de COP. */
  amountCents: number;
  message: string;
}
