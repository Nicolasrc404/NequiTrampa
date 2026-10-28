// ============================================================
// Budgets_09 — Presupuesto creado (201)
// Fuente visual: Stitch screen 2743d19eb6f2421a9288863d37c7ca23
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';
import {
  DEMO_BUDGET_CREATE_DRAFT,
  formatBudgetAmount,
} from '../../data/demoBudgets';
import type { BudgetItem } from '../../types/budgets';

export interface Budgets09ScreenProps {
  readonly onViewBudgets?: () => void;
  readonly onCreateAnother?: () => void;
  /** Presupuesto confirmado por el backend. */
  readonly budget?: BudgetItem;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Budgets09Screen: React.FC<Budgets09ScreenProps> = ({
  onViewBudgets,
  onCreateAnother,
  budget,
  demo = true,
}) => {
  const categoryName = budget?.category ?? DEMO_BUDGET_CREATE_DRAFT.category;
  const limitCents = budget?.limitCents ?? DEMO_BUDGET_CREATE_DRAFT.limitCents;

  return (
    <TransferStatusScreen
      icon="check"
      iconBackground={colors.budgetsSuccessCircle}
      iconColor={colors.budgetsSuccessIcon}
      iconWrapperSize={88}
      badge="201"
      badgeBackground={colors.budgetsSuccessBadgeBg}
      badgeColor={colors.budgetsSuccessBadgeText}
      title="Presupuesto creado"
      description={`Te avisaremos cuando llegues al 80% de ${formatBudgetAmount(limitCents)} en ${categoryName}.`}
      primaryLabel="Ver presupuestos"
      onPrimary={onViewBudgets}
      secondaryLabel="Crear otro"
      onSecondary={onCreateAnother}
      demoHint={
        demo
          ? 'Previsualización DEMO · no se guardó ningún presupuesto'
          : undefined
      }
    />
  );
};

export default Budgets09Screen;
