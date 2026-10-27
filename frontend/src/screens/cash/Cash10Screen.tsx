// ============================================================
// Cash_10 — Este registro ya existe (409)
// Fuente visual: Stitch screen 097f7faf8f2a4f728df063dbf10b3932
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';
import CashDetailCard from '../../components/cash/CashDetailCard';
import {
  DEMO_CASH_EXPENSE_RESULT,
  formatCashAmount,
} from '../../data/demoCash';

export interface Cash10ScreenProps {
  readonly onViewCash?: () => void;
  readonly onRegisterAnother?: () => void;
  readonly demo?: boolean;
}

export const Cash10Screen: React.FC<Cash10ScreenProps> = ({
  onViewCash,
  onRegisterAnother,
  demo = true,
}) => {
  return (
    <TransferStatusScreen
      icon="copy"
      iconBackground={colors.cashLavender}
      iconColor={colors.cashLavenderIcon}
      badge="409"
      badgeBackground={colors.cashLavender}
      badgeColor={colors.cashLavenderIcon}
      title="Este registro ya existe"
      description="Ya habías guardado este gasto. No lo duplicamos."
      primaryLabel="Ver efectivo"
      onPrimary={onViewCash}
      secondaryLabel="Registrar otro"
      onSecondary={onRegisterAnother}
      demoHint={demo ? 'Previsualización DEMO · no se guardó ningún registro' : undefined}
    >
      <CashDetailCard
        rows={[
          { label: 'Categoría', value: DEMO_CASH_EXPENSE_RESULT.category },
          {
            label: 'Monto',
            value: formatCashAmount(DEMO_CASH_EXPENSE_RESULT.amountCents),
          },
          { label: 'Fecha', value: DEMO_CASH_EXPENSE_RESULT.dateLabel },
        ]}
      />
    </TransferStatusScreen>
  );
};

export default Cash10Screen;
