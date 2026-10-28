// ============================================================
// Cash_09 — Categoría no encontrada (404)
// Fuente visual: Stitch screen f4c092221bb646159bc9402ccb74d647
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';
import { DEMO_CASH_EXPENSE_DRAFT } from '../../data/demoCash';

export interface Cash09ScreenProps {
  readonly onChooseCategory?: () => void;
  readonly onCreateCategory?: () => void;
  /** Nombre de la categoría rechazada por el backend. */
  readonly categoryName?: string;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Cash09Screen: React.FC<Cash09ScreenProps> = ({
  onChooseCategory,
  onCreateCategory,
  categoryName = DEMO_CASH_EXPENSE_DRAFT.category,
  demo = true,
}) => {
  return (
    <TransferStatusScreen
      icon="tag"
      iconBackground={colors.cashWarningCircle}
      iconColor={colors.cashWarningIconAlt}
      badge="404"
      badgeBackground={colors.cashWarningBadgeSoft}
      badgeColor={colors.cashWarningBadgeSoftText}
      title="Categoría no encontrada"
      description={`No encontramos la categoría "${categoryName}". Puede que se haya eliminado.`}
      primaryLabel="Elegir otra categoría"
      onPrimary={onChooseCategory}
      secondaryLabel="Crear categoría"
      onSecondary={onCreateCategory}
      demoHint={
        demo ? 'Estado DEMO · no se modificó ninguna categoría' : undefined
      }
    />
  );
};

export default Cash09Screen;
