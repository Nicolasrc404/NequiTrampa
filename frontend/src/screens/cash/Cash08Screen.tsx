// ============================================================
// Cash_08 — Sesión vencida (401)
// Fuente visual: Stitch screen 12f387cab3e64b3cacf18d282c509ead
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Cash08ScreenProps {
  readonly onLogin?: () => void;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Cash08Screen: React.FC<Cash08ScreenProps> = ({ onLogin, demo = true }) => {
  return (
    <TransferStatusScreen
      icon="lock"
      iconBackground={colors.cashWarningBg}
      iconColor={colors.cashWarningIcon}
      badge="401"
      badgeBackground={colors.cashWarningBadgeBg}
      badgeColor={colors.cashWarningBadgeText}
      title="Sesión vencida"
      description="Tu sesión terminó por seguridad. Inicia sesión para consultar tu efectivo."
      primaryLabel="Iniciar sesión"
      onPrimary={onLogin}
      demoHint={demo ? 'Estado DEMO · no se enviaron credenciales' : undefined}
    />
  );
};

export default Cash08Screen;
