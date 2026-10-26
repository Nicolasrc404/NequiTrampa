// ============================================================
// Recharges_06 — Demasiados intentos (429)
// Fuente visual: Stitch screen 5bf918f80f3d475bb260844a57af5bd1
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Recharges06ScreenProps {
  readonly onDismiss?: () => void;
}

export const Recharges06Screen: React.FC<Recharges06ScreenProps> = ({
  onDismiss,
}) => {
  return (
    <TransferStatusScreen
      icon="clock"
      iconBackground={colors.rechargesWarningBg}
      iconColor={colors.rechargesWarningIcon}
      badge="429"
      badgeBackground={colors.rechargesWarningBadgeBg}
      badgeColor={colors.rechargesWarningBadgeText}
      title="Demasiados intentos"
      description="Espera 30 segundos antes de volver a recargar."
      primaryLabel="Entendido"
      onPrimary={onDismiss}
      demoHint="Estado DEMO · sin reintentos automáticos"
    />
  );
};

export default Recharges06Screen;
