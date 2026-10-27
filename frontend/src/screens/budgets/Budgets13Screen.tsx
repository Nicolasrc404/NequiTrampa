// ============================================================
// Budgets_13 — Tu sesión venció (401)
// Fuente visual: Stitch screen b58b8f95675c45e6b69027c382c3d5ab
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Budgets13ScreenProps {
  readonly onLogin?: () => void;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Budgets13Screen: React.FC<Budgets13ScreenProps> = ({ onLogin, demo = true }) => {
  return (
    <TransferStatusScreen
      icon="lock"
      iconBackground={colors.budgetsWarningCircle}
      iconColor={colors.budgetsWarningIcon}
      iconWrapperSize={90}
      badge="Error 401"
      badgeBackground={colors.budgetsWarningBadgeBg}
      badgeColor={colors.budgetsWarningBadgeText}
      title="Tu sesión venció"
      titleFontSize={24}
      description="Por seguridad cerramos tu sesión. Inicia sesión de nuevo para continuar con tus presupuestos."
      primaryLabel="Iniciar sesión"
      onPrimary={onLogin}
      demoHint={demo ? 'Estado DEMO · no se enviaron credenciales' : undefined}
    />
  );
};

export default Budgets13Screen;
