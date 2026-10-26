// ============================================================
// Transfers_08 — Operación ya procesada (409)
// Fuente visual: Stitch screen b93912e7c52342b294b465f37b07d52a
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';
import TransferDetailCard from '../../components/transfers/TransferDetailCard';
import {
  DEMO_TRANSFER_DRAFT,
  DEMO_TRANSFER_HISTORY,
  formatCopFromCents,
} from '../../data/demoTransfers';

export interface Transfers08ScreenProps {
  readonly onViewReceipt?: () => void;
  readonly onGoHome?: () => void;
}

export const Transfers08Screen: React.FC<Transfers08ScreenProps> = ({
  onViewReceipt,
  onGoHome,
}) => {
  return (
    <TransferStatusScreen
      icon="copy"
      iconBackground={colors.transfersAvatarBg}
      iconColor={colors.transfersAvatarText}
      badge="409"
      badgeBackground={colors.transfersAvatarBg}
      badgeColor={colors.transfersAvatarText}
      title="Esta operación ya se procesó"
      description="Recibimos esta solicitud antes. No se descontó dinero dos veces."
      primaryLabel="Ver comprobante"
      onPrimary={onViewReceipt}
      secondaryLabel="Volver al inicio"
      onSecondary={onGoHome}
      demoHint="Estado DEMO · la idempotencia real vive en el backend"
    >
      <TransferDetailCard
        rows={[
          { label: 'Referencia', value: DEMO_TRANSFER_HISTORY[0].reference },
          {
            label: 'Monto',
            value: formatCopFromCents(DEMO_TRANSFER_DRAFT.amountCents),
          },
          { label: 'Destinatario', value: DEMO_TRANSFER_DRAFT.recipient.name },
        ]}
        caption="No reintentes ni vuelvas a enviar la misma operación."
      />
    </TransferStatusScreen>
  );
};

export default Transfers08Screen;
