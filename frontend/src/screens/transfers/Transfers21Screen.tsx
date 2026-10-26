// ============================================================
// Transfers_21 — No puedes ver esta transferencia (403)
// Fuente visual: Stitch screen 4e8b0fd515ee415e903756626169bda3
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Transfers21ScreenProps {
  readonly onBack?: () => void;
  readonly onViewTransfers?: () => void;
}

export const Transfers21Screen: React.FC<Transfers21ScreenProps> = ({
  onBack,
  onViewTransfers,
}) => {
  return (
    <TransferStatusScreen
      icon="shield"
      iconBackground={colors.transfersDangerBg}
      iconColor={colors.transfersDangerIcon}
      badge="403"
      badgeBackground={colors.transfersErrorBg}
      badgeColor={colors.transfersError}
      title="No puedes ver esta transferencia"
      description="Esta operación pertenece a otra cuenta."
      headerTitle="Detalle de transferencia"
      onBack={onBack}
      primaryLabel="Ver mis transferencias"
      onPrimary={onViewTransfers}
      demoHint="Estado DEMO · la autorización real la valida el backend"
    />
  );
};

export default Transfers21Screen;
