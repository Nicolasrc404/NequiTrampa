// ============================================================
// Cash_04 — Ingreso registrado (201)
// Fuente visual: Stitch screen 2c6039a833ab4969815d3b4ce0eb1c22
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';
import CashDetailCard from '../../components/cash/CashDetailCard';
import {
  DEMO_CASH_INCOME_RESULT,
  formatCashAmount,
} from '../../data/demoCash';
import { CashResult } from '../../types/cash';

export interface Cash04ScreenProps {
  readonly result?: CashResult;
  readonly onViewCash?: () => void;
  readonly onRegisterAnother?: () => void;
}

export const Cash04Screen: React.FC<Cash04ScreenProps> = ({
  result = DEMO_CASH_INCOME_RESULT,
  onViewCash,
  onRegisterAnother,
}) => {
  return (
    <TransferStatusScreen
      icon="check"
      iconBackground={colors.cashGreenIconBg}
      iconColor={colors.cashGreenIcon}
      badge="201"
      badgeBackground={colors.cashSuccessBadgeBg}
      badgeColor={colors.cashSuccessBadgeText}
      title="Ingreso registrado"
      description={`Sumamos ${formatCashAmount(result.amountCents)} a tu efectivo.`}
      primaryLabel="Ver efectivo"
      onPrimary={onViewCash}
      secondaryLabel="Registrar otro"
      onSecondary={onRegisterAnother}
      demoHint="Previsualización DEMO · no se guardó ningún registro"
    >
      <CashDetailCard
        rows={[
          { label: 'Categoría', value: result.category },
          { label: 'Fecha', value: result.dateLabel },
          {
            label: 'Efectivo después',
            value: formatCashAmount(result.balanceAfterCents),
            strong: true,
          },
        ]}
      />
    </TransferStatusScreen>
  );
};

export default Cash04Screen;
