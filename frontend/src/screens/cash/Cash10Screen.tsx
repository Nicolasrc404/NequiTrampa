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
import { CashResult } from '../../types/cash';

export interface Cash10ScreenProps {
  readonly onViewCash?: () => void;
  readonly onRegisterAnother?: () => void;
  /** Registro que el backend ya había guardado con la misma clave. */
  readonly result?: CashResult;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Cash10Screen: React.FC<Cash10ScreenProps> = ({
  onViewCash,
  onRegisterAnother,
  result,
  demo = true,
}) => {
  // En modo real no se conoce el registro existente: se omite la tarjeta en
  // lugar de mostrar cifras DEMO.
  const shownResult = result ?? (demo ? DEMO_CASH_EXPENSE_RESULT : null);

  return (
    <TransferStatusScreen
      icon="copy"
      iconBackground={colors.cashLavender}
      iconColor={colors.cashLavenderIcon}
      badge="409"
      badgeBackground={colors.cashLavender}
      badgeColor={colors.cashLavenderIcon}
      title="Este registro ya existe"
      description="Ya habíamos guardado este registro. No lo duplicamos."
      primaryLabel="Ver efectivo"
      onPrimary={onViewCash}
      secondaryLabel="Registrar otro"
      onSecondary={onRegisterAnother}
      demoHint={
        demo
          ? 'Previsualización DEMO · no se guardó ningún registro'
          : undefined
      }
    >
      {shownResult ? (
        <CashDetailCard
          rows={[
            { label: 'Categoría', value: shownResult.category },
            {
              label: 'Monto',
              value: formatCashAmount(shownResult.amountCents),
            },
            { label: 'Fecha', value: shownResult.dateLabel },
          ]}
        />
      ) : null}
    </TransferStatusScreen>
  );
};

export default Cash10Screen;
