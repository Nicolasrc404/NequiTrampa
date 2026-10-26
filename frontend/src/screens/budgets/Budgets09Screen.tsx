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

export interface Budgets09ScreenProps {
  readonly onViewBudgets?: () => void;
  readonly onCreateAnother?: () => void;
}

export const Budgets09Screen: React.FC<Budgets09ScreenProps> = ({
  onViewBudgets,
  onCreateAnother,
}) => {
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
      description={`Te avisaremos cuando llegues al 80% de ${formatBudgetAmount(DEMO_BUDGET_CREATE_DRAFT.limitCents)} en ${DEMO_BUDGET_CREATE_DRAFT.category}.`}
      primaryLabel="Ver presupuestos"
      onPrimary={onViewBudgets}
      secondaryLabel="Crear otro"
      onSecondary={onCreateAnother}
      demoHint="Previsualización DEMO · no se guardó ningún presupuesto"
    />
  );
};

export default Budgets09Screen;
