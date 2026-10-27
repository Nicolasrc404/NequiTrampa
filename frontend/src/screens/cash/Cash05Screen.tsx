// ============================================================
// Cash_05 — Gasto registrado (201)
// Fuente visual: Stitch screen e3682b45f0534ddaacd2512185d0ee67
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';
import CashDetailCard from '../../components/cash/CashDetailCard';
import {
  DEMO_CASH_EXPENSE_RESULT,
  formatCashAmount,
} from '../../data/demoCash';
import { CashResult } from '../../types/cash';

export interface Cash05ScreenProps {
  readonly result?: CashResult;
  readonly onViewCash?: () => void;
  readonly onRegisterAnother?: () => void;
  readonly demo?: boolean;
}

export const Cash05Screen: React.FC<Cash05ScreenProps> = ({
  result = DEMO_CASH_EXPENSE_RESULT,
  onViewCash,
  onRegisterAnother,
  demo = true,
}) => {
  return (
    <TransferStatusScreen
      icon="check"
      iconBackground={colors.cashSuccessBg}
      iconColor={colors.cashSuccessText}
      badge="201"
      badgeBackground={colors.cashSuccessBadgeSoft}
      badgeColor={colors.cashSuccessText}
      title="Gasto registrado"
      description={`Descontamos ${formatCashAmount(result.amountCents)} de tu efectivo.`}
      primaryLabel="Ver efectivo"
      onPrimary={onViewCash}
      secondaryLabel="Registrar otro"
      onSecondary={onRegisterAnother}
      demoHint={demo ? 'Previsualización DEMO · no se descontó efectivo real' : undefined}
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

export default Cash05Screen;
