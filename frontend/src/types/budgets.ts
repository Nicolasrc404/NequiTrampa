// ============================================================
// MÓDULO: Presupuestos (Budgets)
// Fuente visual: Stitch NequiTrampa Movements Screens Replicas
// Pantallas: Budgets_01 – Budgets_13
// ============================================================

export type BudgetsState =
  | 'Budgets_01' // Presupuestos
  | 'Budgets_02' // Sin presupuestos (Empty State)
  | 'Budgets_03' // Skeleton de carga
  | 'Budgets_04' // Crear presupuesto
  | 'Budgets_05' // Editar presupuesto
  | 'Budgets_06' // Detalle del presupuesto Mercado
  | 'Budgets_07' // Advertencia umbral 80%
  | 'Budgets_08' // Presupuesto Ocio superado
  | 'Budgets_09' // Presupuesto creado (201)
  | 'Budgets_10' // Ya tienes un presupuesto (409)
  | 'Budgets_11' // Revisa los campos marcados (422)
  | 'Budgets_12' // No pudimos guardar el presupuesto (500)
  | 'Budgets_13'; // Tu sesión venció (401)

export type BudgetHealth = 'on-track' | 'warning' | 'exceeded';

export interface BudgetItem {
  readonly id: string;
  readonly category: string;
  readonly spentCents: number;
  readonly limitCents: number;
  readonly percent: number;
  readonly health: BudgetHealth;
}

export interface BudgetExpense {
  readonly id: string;
  readonly merchant: string;
  /** Monto absoluto en centavos de COP. */
  readonly amountCents: number;
  readonly dateLabel: string;
}

export interface BudgetDetail {
  readonly category: string;
  readonly periodLabel: string;
  readonly spentCents: number;
  readonly limitCents: number;
  readonly remainingCents: number;
  readonly percent: number;
  readonly daysRemaining: number;
  readonly dailySuggestedCents: number;
  readonly expenses: readonly BudgetExpense[];
}

export interface BudgetDraft {
  readonly category: string;
  readonly period: string;
  /** Límite mensual en centavos de COP. */
  readonly limitCents: number;
  readonly previousLimitCents?: number;
}
