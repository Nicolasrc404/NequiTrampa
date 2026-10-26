// ============================================================
// Recharges_09 — Aún no has recargado (variante con base)
// Fuente visual: Stitch screen 48f80c458776400b9515bec43e6f8c38
// ============================================================
import React from 'react';
import RechargeEmptyView from '../../components/recharges/RechargeEmptyView';

export interface Recharges09ScreenProps {
  readonly onBack?: () => void;
  readonly onStartRecharge?: () => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
}

export const Recharges09Screen: React.FC<Recharges09ScreenProps> = ({
  onBack,
  onStartRecharge,
  onTabPress,
}) => {
  return (
    <RechargeEmptyView
      onBack={onBack}
      onStartRecharge={onStartRecharge}
      onTabPress={onTabPress}
      withSystemBar
    />
  );
};

export default Recharges09Screen;
