// ============================================================
// Recharges_02 — Recarga exitosa (201)
// Fuente visual: Stitch screen 463fa500f41c43c7ada745ca43e4bcfb
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';
import RechargeSuccessCard from '../../components/recharges/RechargeSuccessCard';
import {
  DEMO_RECHARGE_RESULT,
  formatRechargeAmount,
} from '../../data/demoRecharges';
import { RechargeResult } from '../../types/recharges';

export interface Recharges02ScreenProps {
  readonly amountCents: number;
  readonly result?: RechargeResult;
  readonly onGoHome?: () => void;
  readonly onViewHistory?: () => void;
  /** `false` cuando la recarga fue confirmada por el backend. */
  readonly demoMode?: boolean;
}

export const Recharges02Screen: React.FC<Recharges02ScreenProps> = ({
  amountCents,
  result = DEMO_RECHARGE_RESULT,
  onGoHome,
  onViewHistory,
  demoMode = true,
}) => {
  return (
    <TransferStatusScreen
      icon="check"
      iconBackground={colors.rechargesSuccessBg}
      iconColor={colors.rechargesSuccessIcon}
      iconWrapperSize={96}
      badge="201"
      badgeBackground={colors.rechargesSuccessBadgeBg}
      badgeColor={colors.rechargesSuccessBadgeText}
      title="Recarga exitosa"
      titleFontSize={28}
      description={`Ya tienes ${formatRechargeAmount(amountCents)} más en tu saldo.`}
      primaryLabel="Volver al inicio"
      onPrimary={onGoHome}
      secondaryLabel="Ver mis recargas"
      onSecondary={onViewHistory}
      demoHint={
        demoMode
          ? 'Previsualización DEMO · no se procesó una recarga'
          : undefined
      }
    >
      <RechargeSuccessCard result={result} />
    </TransferStatusScreen>
  );
};

export default Recharges02Screen;
