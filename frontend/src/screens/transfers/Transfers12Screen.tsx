// ============================================================
// Transfers_12 — Demasiados intentos (429)
// Fuente visual: Stitch screen f71499c5204a45ca89465c06724b6b33
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Transfers12ScreenProps {
  readonly onDismiss?: () => void;
}

export const Transfers12Screen: React.FC<Transfers12ScreenProps> = ({
  onDismiss,
}) => {
  return (
    <TransferStatusScreen
      icon="clock"
      iconBackground={colors.transfersWarningBg}
      iconColor={colors.transfersWarningIcon}
      badge="429"
      badgeBackground={colors.transfersWarningBadgeBg}
      badgeColor={colors.transfersWarningText}
      title="Demasiados intentos"
      description="Por seguridad, espera un momento antes de volver a intentarlo."
      primaryLabel="Entendido"
      onPrimary={onDismiss}
      demoHint="Estado DEMO · sin reintentos automáticos"
    />
  );
};

export default Transfers12Screen;
