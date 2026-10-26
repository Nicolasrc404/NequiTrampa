// ============================================================
// Transfers_09 — Saldo insuficiente (422)
// Fuente visual: Stitch screen c60258a7d08040f7939f7687613ed14f
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Transfers09ScreenProps {
  readonly onReload?: () => void;
  readonly onChangeAmount?: () => void;
}

export const Transfers09Screen: React.FC<Transfers09ScreenProps> = ({
  onReload,
  onChangeAmount,
}) => {
  return (
    <TransferStatusScreen
      icon="dollar-sign"
      iconBackground={colors.transfersDangerBg}
      iconColor={colors.transfersDangerIcon}
      badge="422"
      badgeBackground={colors.transfersDangerBg}
      badgeColor={colors.transfersError}
      title="Saldo insuficiente"
      description="Tienes $ 40.000 y quieres enviar $ 85.000. Te faltan $ 45.000."
      primaryLabel="Recargar"
      onPrimary={onReload}
      secondaryLabel="Cambiar monto"
      onSecondary={onChangeAmount}
      demoHint="Estado DEMO · el saldo real lo valida el backend"
    />
  );
};

export default Transfers09Screen;
