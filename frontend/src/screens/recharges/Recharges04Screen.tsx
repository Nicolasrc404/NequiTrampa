// ============================================================
// Recharges_04 — Tu sesión venció (401)
// Fuente visual: Stitch screen 53b2aa8c2d1f4b4494e0056bb5647950
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Recharges04ScreenProps {
  readonly onLogin?: () => void;
}

export const Recharges04Screen: React.FC<Recharges04ScreenProps> = ({
  onLogin,
}) => {
  return (
    <TransferStatusScreen
      icon="lock"
      iconBackground={colors.rechargesWarningBg}
      iconColor={colors.rechargesWarningIcon}
      badge="401"
      badgeBackground={colors.rechargesWarningBadgeBg}
      badgeColor={colors.rechargesWarningBadgeText}
      title="Tu sesión venció"
      description="Inicia sesión de nuevo para recargar. No se hizo ningún cobro."
      primaryLabel="Iniciar sesión"
      onPrimary={onLogin}
      demoHint="Estado DEMO · sin operaciones ni cobros reales"
    />
  );
};

export default Recharges04Screen;
