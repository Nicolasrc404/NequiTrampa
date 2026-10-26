// ============================================================
// Cash_07 — El gasto supera tu efectivo (422)
// Fuente visual: Stitch screen 023efd9acda24df28dfd844042671c62
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';
import {
  DEMO_CASH_AVAILABLE_CENTS,
  DEMO_CASH_EXCEEDED_CENTS,
  formatCashAmount,
} from '../../data/demoCash';

export interface Cash07ScreenProps {
  readonly onFixAmount?: () => void;
  readonly onRegisterIncome?: () => void;
}

export const Cash07Screen: React.FC<Cash07ScreenProps> = ({
  onFixAmount,
  onRegisterIncome,
}) => {
  return (
    <TransferStatusScreen
      icon="dollar-sign"
      iconBackground={colors.cashErrorCircle}
      iconColor={colors.cashError}
      badge="422"
      badgeBackground={colors.cashErrorBadgeBg}
      badgeColor={colors.cashErrorBadgeText}
      title="El gasto supera tu efectivo"
      description={`Tu gasto de ${formatCashAmount(DEMO_CASH_EXCEEDED_CENTS)} supera tu efectivo disponible de ${formatCashAmount(DEMO_CASH_AVAILABLE_CENTS)}.`}
      primaryLabel="Corregir monto"
      onPrimary={onFixAmount}
      secondaryLabel="Registrar ingreso"
      onSecondary={onRegisterIncome}
      demoHint="Validación DEMO · el backend conserva la validación definitiva"
    />
  );
};

export default Cash07Screen;
