// ============================================================
// Transfers_20 — Transferencia no encontrada (404)
// Fuente visual: Stitch screen 16d5b64ab38144358016f41a5a7081cc
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';

export interface Transfers20ScreenProps {
  readonly onBack?: () => void;
  readonly onViewTransfers?: () => void;
}

export const Transfers20Screen: React.FC<Transfers20ScreenProps> = ({
  onBack,
  onViewTransfers,
}) => {
  return (
    <TransferStatusScreen
      icon="search"
      iconBackground={colors.transfersWarningBg}
      iconColor={colors.status404Text}
      badge="404"
      badgeBackground={colors.transfersWarningBadgeBg}
      badgeColor={colors.transfersWarningText}
      title="Transferencia no encontrada"
      description="No encontramos esta operación. Puede que el enlace sea antiguo."
      headerTitle="Detalle de transferencia"
      onBack={onBack}
      primaryLabel="Ver mis transferencias"
      onPrimary={onViewTransfers}
      demoHint="Estado DEMO · el recurso real lo resuelve el backend"
    />
  );
};

export default Transfers20Screen;
