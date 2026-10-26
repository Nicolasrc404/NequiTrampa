// ============================================================
// Transfers_13 — Algo salió mal (500)
// Fuente visual: Stitch screen 4d2b6ce6a7094cf786d6f00f638f26ff
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Transfers13ScreenProps {
  readonly onViewMovements?: () => void;
  readonly onRetry?: () => void;
}

export const Transfers13Screen: React.FC<Transfers13ScreenProps> = ({
  onViewMovements,
  onRetry,
}) => {
  return (
    <TransferStatusScreen
      icon="alert-triangle"
      iconBackground={colors.transfersDangerBg}
      iconColor={colors.transfersDangerIcon}
      badge="500"
      badgeBackground={colors.transfersDangerBg}
      badgeColor={colors.transfersError}
      title="Algo salió mal"
      description="No pudimos completar la transferencia. No se descontó dinero."
      primaryLabel="Ver movimientos"
      onPrimary={onViewMovements}
      secondaryLabel="Reintentar"
      onSecondary={onRetry}
      demoHint="Estado DEMO · verifica el resultado antes de reintentar"
    />
  );
};

export default Transfers13Screen;
