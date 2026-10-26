// ============================================================
// Transfers_14 — Servicio no disponible (503)
// Fuente visual: Stitch screen 6d3db70ddbf54e88bf03438646c9fbab
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Transfers14ScreenProps {
  readonly onRetry?: () => void;
  readonly onGoHome?: () => void;
}

export const Transfers14Screen: React.FC<Transfers14ScreenProps> = ({
  onRetry,
  onGoHome,
}) => {
  return (
    <TransferStatusScreen
      icon="wifi-off"
      iconBackground={colors.transfersDangerBg}
      iconColor={colors.transfersDangerIcon}
      badge="503"
      badgeBackground={colors.transfersDangerBg}
      badgeColor={colors.transfersError}
      title="Servicio no disponible"
      description="Estamos teniendo problemas técnicos. Intenta de nuevo en unos minutos."
      primaryLabel="Reintentar"
      onPrimary={onRetry}
      secondaryLabel="Volver al inicio"
      onSecondary={onGoHome}
      demoHint="Estado DEMO · sin llamadas reales al backend"
    />
  );
};

export default Transfers14Screen;
