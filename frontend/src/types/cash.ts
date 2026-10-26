// ============================================================
// MÓDULO: Efectivo (Cash)
// Fuente visual: Stitch NequiTrampa Movements Screens Replicas
// Pantallas: Cash_01 – Cash_12
// ============================================================

export type CashState =
  | 'Cash_01' // Efectivo disponible
  | 'Cash_02' // Registrar ingreso
  | 'Cash_03' // Registrar gasto
  | 'Cash_04' // Ingreso registrado (201)
  | 'Cash_05' // Gasto registrado (201)
  | 'Cash_06' // Error de validación (400)
  | 'Cash_07' // El gasto supera tu efectivo (422)
  | 'Cash_08' // Sesión vencida (401)
  | 'Cash_09' // Categoría no encontrada (404)
  | 'Cash_10' // Este registro ya existe (409)
  | 'Cash_11' // No pudimos guardar el registro (500)
  | 'Cash_12'; // Historial de efectivo

export type CashDirection = 'income' | 'expense';
export type CashFilter = 'all' | CashDirection;

export interface CashTransaction {
  readonly id: string;
  readonly category: string;
  readonly direction: CashDirection;
  /** Monto absoluto en centavos de COP (entero). */
  readonly amountCents: number;
  readonly dateLabel: string;
  readonly note?: string;
}

export interface CashFormDraft {
  readonly categoryId?: string;
  readonly category: string;
  readonly dateLabel: string;
  readonly note: string;
  /** Monto en centavos de COP. */
  readonly amountCents: number;
  readonly direction: CashDirection;
}

export interface CashResult {
  readonly category: string;
  readonly dateLabel: string;
  /** Saldo de efectivo después en centavos de COP. */
  readonly balanceAfterCents: number;
  /** Monto en centavos de COP. */
  readonly amountCents: number;
  readonly direction: CashDirection;
}
