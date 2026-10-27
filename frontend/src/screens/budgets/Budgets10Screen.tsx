// ============================================================
// Budgets_10 — Ya tienes un presupuesto (409)
// Fuente visual: Stitch screen 941358c477c844cf9b7acd4b04c24cb6
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Budgets10ScreenProps {
  readonly onEditExisting?: () => void;
  readonly onCancel?: () => void;
  /** Categoría que ya tenía presupuesto para el periodo. */
  readonly categoryName?: string;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Budgets10Screen: React.FC<Budgets10ScreenProps> = ({
  onEditExisting,
  onCancel,
  categoryName = 'Mercado',
  demo = true,
}) => {
  return (
    <TransferStatusScreen
      icon="copy"
      iconBackground={colors.budgetsLavender}
      iconColor={colors.budgetsLavenderIcon}
      iconWrapperSize={80}
      badge="409"
      badgeBackground={colors.budgetsLavenderBadge}
      badgeColor={colors.budgetsLavenderBadgeText}
      title={`Ya tienes un presupuesto\npara ${categoryName}`}
      titleFontSize={22}
      description="Solo puede haber un presupuesto por categoría y mes. Puedes editar el que ya existe."
      primaryLabel="Editar el existente"
      onPrimary={onEditExisting}
      secondaryLabel="Cancelar"
      onSecondary={onCancel}
      demoHint={
        demo ? 'Estado DEMO · no se modificó ningún presupuesto' : undefined
      }
    />
  );
};

export default Budgets10Screen;
