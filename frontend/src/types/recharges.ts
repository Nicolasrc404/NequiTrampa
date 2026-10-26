// ============================================================
// MÓDULO: Recargas
// Fuente visual: Stitch NequiTrampa Movements Screens Replicas
// Pantallas: Recharges_01 – Recharges_10
// ============================================================

export type RechargesState =
  | 'Recharges_01' // Recargar
  | 'Recharges_02' // Recarga exitosa (201)
  | 'Recharges_03' // Error de validación (400)
  | 'Recharges_04' // Sesión vencida (401)
  | 'Recharges_05' // Límite de recarga superado (422)
  | 'Recharges_06' // Demasiados intentos (429)
  | 'Recharges_07' // Error al recargar (500 / 503)
  | 'Recharges_08' // Mis recargas
  | 'Recharges_09' // Aún no has recargado (con barra del sistema)
  | 'Recharges_10'; // Aún no has recargado

export interface RechargePreset {
  /** Monto en centavos de COP (entero). */
  readonly amountCents: number;
}

export interface RechargeItem {
  readonly id: string;
  readonly reference: string;
  /**
   * Monto en centavos de COP (int64 en el backend).
   * No usar punto flotante para operaciones financieras.
   */
  readonly amountCents: number;
  readonly occurredAtLabel: string;
  readonly statusLabel: string;
  /** Saldo después en centavos de COP. */
  readonly balanceAfterCents: number;
}

export interface RechargeDraft {
  /** Monto en centavos de COP. */
  amountCents: number;
}

export interface RechargeResult {
  readonly reference: string;
  readonly occurredAtLabel: string;
  readonly balanceAfterCents: number;
}
