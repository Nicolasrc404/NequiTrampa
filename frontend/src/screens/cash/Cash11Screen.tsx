// ============================================================
// Cash_11 — No pudimos guardar el registro (500)
// Fuente visual: Stitch screen 599399feb83c4f24a8edb307b9b61168
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Cash11ScreenProps {
  readonly onRetry?: () => void;
  readonly onCancel?: () => void;
}

export const Cash11Screen: React.FC<Cash11ScreenProps> = ({
  onRetry,
  onCancel,
}) => {
  return (
    <TransferStatusScreen
      icon="alert-triangle"
      iconBackground={colors.cashErrorCircleAlt}
      iconColor={colors.cashErrorIcon}
      badge="500"
      badgeBackground={colors.cashErrorBadgeSoft}
      badgeColor={colors.cashErrorBadgeSoftText}
      title="No pudimos guardar el registro"
      description="Ocurrió un problema en nuestros servidores. Intenta de nuevo en unos segundos."
      primaryLabel="Reintentar"
      onPrimary={onRetry}
      secondaryLabel="Cancelar"
      onSecondary={onCancel}
      demoHint="Estado DEMO · no se envió ninguna operación"
    />
  );
};

export default Cash11Screen;
