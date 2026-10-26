// ============================================================
// Recharges_05 — Límite de recarga superado (422)
// Fuente visual: Stitch screen 6381952160924234aa916f61ef35380d
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Recharges05ScreenProps {
  readonly onChangeAmount?: () => void;
  readonly onCancel?: () => void;
}

export const Recharges05Screen: React.FC<Recharges05ScreenProps> = ({
  onChangeAmount,
  onCancel,
}) => {
  return (
    <TransferStatusScreen
      icon="shield"
      iconBackground={colors.rechargesWarningBadgeBg}
      iconColor={colors.rechargesWarningShield}
      badge="422"
      badgeBackground={colors.rechargesWarningBadgeBg}
      badgeColor={colors.rechargesWarningBadgeText}
      title="Superaste el límite de recarga"
      description="El máximo por recarga es $ 1.000.000. Elige un monto menor."
      primaryLabel="Cambiar monto"
      onPrimary={onChangeAmount}
      secondaryLabel="Cancelar"
      onSecondary={onCancel}
      demoHint="Validación DEMO · el backend conserva el límite definitivo"
    />
  );
};

export default Recharges05Screen;
