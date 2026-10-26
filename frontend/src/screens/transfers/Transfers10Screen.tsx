// ============================================================
// Transfers_10 — Superaste el límite modal/bottom (422)
// Fuente visual: Stitch screen fde10299c201435bad1d06bbb85925e2
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Transfers10ScreenProps {
  readonly onChangeAmount?: () => void;
  readonly onCancel?: () => void;
}

export const Transfers10Screen: React.FC<Transfers10ScreenProps> = ({
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
      description="El máximo por transferencia es $ 2.000.000. Envía un monto menor o divídelo en varias operaciones."
      primaryLabel="Cambiar monto"
      onPrimary={onChangeAmount}
      secondaryLabel="Cancelar"
      onSecondary={onCancel}
      systemBar
      demoHint="Estado DEMO · el límite definitivo lo aplica el backend"
    />
  );
};

export default Transfers10Screen;
