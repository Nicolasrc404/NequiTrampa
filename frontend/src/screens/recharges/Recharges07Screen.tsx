// ============================================================
// Recharges_07 — No pudimos hacer la recarga (500 / 503)
// Fuente visual: Stitch screen 183fdca7ad444f09956e2909cf832c40
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Recharges07ScreenProps {
  readonly onRetry?: () => void;
  readonly onGoHome?: () => void;
  /** `false` cuando el resultado viene de la API real. */
  readonly demoMode?: boolean;
}

export const Recharges07Screen: React.FC<Recharges07ScreenProps> = ({
  onRetry,
  onGoHome,
  demoMode = true,
}) => {
  return (
    <TransferStatusScreen
      icon="wifi-off"
      iconBackground={colors.rechargesErrorCircle}
      iconColor={colors.rechargesErrorIcon}
      badge="500 · 503"
      badgeBackground={colors.rechargesErrorBadgeBg}
      badgeColor={colors.rechargesErrorBadgeText}
      title="No pudimos hacer la recarga"
      description="Es un problema de nuestro lado. Revisa tu saldo antes de reintentar para no recargar dos veces."
      primaryLabel="Reintentar"
      onPrimary={onRetry}
      secondaryLabel="Volver al inicio"
      onSecondary={onGoHome}
      demoHint={
        demoMode ? 'Estado DEMO · sin reintentos automáticos' : undefined
      }
    />
  );
};

export default Recharges07Screen;
