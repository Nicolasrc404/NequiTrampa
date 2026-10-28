// ============================================================
// Transfers_11 — Superaste el límite (422)
// Fuente visual: Stitch screen a9b4d8ee0c4a4d70b5d471b52e2d33cf
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Transfers11ScreenProps {
  readonly onChangeAmount?: () => void;
  readonly onCancel?: () => void;
}

export const Transfers11Screen: React.FC<Transfers11ScreenProps> = ({
  onChangeAmount,
  onCancel,
}) => {
  return (
    <TransferStatusScreen
      icon="shield"
      iconBackground={colors.transfersWarningBg}
      iconColor={colors.transfersWarningIcon}
      badge="422"
      badgeBackground={colors.transfersWarningBadgeBg}
      badgeColor={colors.transfersWarningText}
      title="Superaste el límite"
      description="El máximo por transferencia es $ 2.000.000. Ajusta el monto para continuar."
      primaryLabel="Cambiar monto"
      onPrimary={onChangeAmount}
      secondaryLabel="Cancelar"
      onSecondary={onCancel}
      demoHint="Estado DEMO · el límite definitivo lo aplica el backend"
    />
  );
};

export default Transfers11Screen;
