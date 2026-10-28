// ============================================================
// Budgets_12 — No pudimos guardar el presupuesto (500)
// Fuente visual: Stitch screen 36a44aa5c436494c8ae8e395de3e5d61
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Budgets12ScreenProps {
  readonly onRetry?: () => void;
  readonly onCancel?: () => void;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
  /** Referencia de soporte (traceId) cuando exista. */
  readonly errorReference?: string | null;
}

export const Budgets12Screen: React.FC<Budgets12ScreenProps> = ({
  onRetry,
  onCancel,
  demo = true,
  errorReference,
}) => {
  const description = errorReference
    ? `Tuvimos un problema inesperado. Tus datos siguen aquí. Si vuelve a pasar, comparte la referencia ${errorReference}.`
    : 'Tuvimos un problema inesperado. Tus datos siguen aquí, intenta guardar de nuevo.';

  return (
    <TransferStatusScreen
      icon="alert-triangle"
      iconBackground={colors.budgetsErrorIconBg}
      iconColor={colors.budgetsErrorIcon}
      iconWrapperSize={92}
      badge="500"
      badgeBackground={colors.budgetsErrorBadgeBg}
      badgeColor={colors.budgetsErrorIcon}
      title="No pudimos guardar el presupuesto"
      titleFontSize={24}
      description={description}
      primaryLabel="Reintentar"
      onPrimary={onRetry}
      secondaryLabel="Cancelar"
      onSecondary={onCancel}
      demoHint={demo ? 'Estado DEMO · no se envió ninguna operación' : undefined}
    />
  );
};

export default Budgets12Screen;
