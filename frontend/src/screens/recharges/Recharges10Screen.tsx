// ============================================================
// Recharges_10 — Aún no has recargado
// Fuente visual: Stitch screen edafee615b8f46c9be5ccf79e8b86419
// ============================================================
import React from 'react';
import RechargeEmptyView from '../../components/recharges/RechargeEmptyView';

export interface Recharges10ScreenProps {
  readonly onBack?: () => void;
  readonly onStartRecharge?: () => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
}

export const Recharges10Screen: React.FC<Recharges10ScreenProps> = ({
  onBack,
  onStartRecharge,
  onTabPress,
}) => {
  return (
    <RechargeEmptyView
      onBack={onBack}
      onStartRecharge={onStartRecharge}
      onTabPress={onTabPress}
    />
  );
};

export default Recharges10Screen;
