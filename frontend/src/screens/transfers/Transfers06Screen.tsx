// ============================================================
// Transfers_06 — Tu sesión venció (401)
// Fuente visual: Stitch screen 0d2e73f4a953458fbea5d03f501d10e8
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Transfers06ScreenProps {
  readonly onLogin?: () => void;
}

export const Transfers06Screen: React.FC<Transfers06ScreenProps> = ({
  onLogin,
}) => {
  return (
    <TransferStatusScreen
      icon="lock"
      iconBackground={colors.transfersWarningBg}
      iconColor={colors.transfersWarningIcon}
      badge="401"
      badgeBackground={colors.transfersWarningBadgeBg}
      badgeColor={colors.transfersWarningText}
      title="Tu sesión venció"
      description="Por seguridad, vuelve a iniciar sesión para continuar."
      primaryLabel="Iniciar sesión"
      onPrimary={onLogin}
      demoHint="Estado DEMO · no se envió ninguna solicitud"
    />
  );
};

export default Transfers06Screen;
