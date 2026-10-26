// ============================================================
// Transfers_07 — Destinatario no encontrado (404)
// Fuente visual: Stitch screen 5b80de3ff8364bdebe5e8eda72d0ed2f
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Transfers07ScreenProps {
  readonly onCorrectRecipient?: () => void;
  readonly onCancel?: () => void;
}

export const Transfers07Screen: React.FC<Transfers07ScreenProps> = ({
  onCorrectRecipient,
  onCancel,
}) => {
  return (
    <TransferStatusScreen
      icon="search"
      iconBackground={colors.transfersWarningBg}
      iconColor={colors.transfersWarningIcon}
      badge="404"
      badgeBackground={colors.transfersWarningBadgeBg}
      badgeColor={colors.transfersWarningText}
      title="Destinatario no encontrado"
      description="No encontramos una cuenta con ese código. Revisa e intenta de nuevo."
      primaryLabel="Corregir destinatario"
      onPrimary={onCorrectRecipient}
      secondaryLabel="Cancelar"
      onSecondary={onCancel}
      demoHint="Estado DEMO · validación final a cargo del backend"
    />
  );
};

export default Transfers07Screen;
