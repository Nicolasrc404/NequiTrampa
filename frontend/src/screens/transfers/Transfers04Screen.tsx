// ============================================================
// Transfers_04 — Transferencia realizada (201)
// Fuente visual: Stitch screen 7be1a9024eb44e18b662474695bdb2d8
// ============================================================
import React from 'react';
import colors from '../../theme/colors';
import TransferStatusScreen from '../../components/transfers/TransferStatusScreen';
import TransferDetailCard from '../../components/transfers/TransferDetailCard';
import {
  DEMO_TRANSFER_BALANCE_AFTER_CENTS,
  DEMO_TRANSFER_DRAFT,
  DEMO_TRANSFER_HISTORY,
  formatCopFromCents,
} from '../../data/demoTransfers';
import { TransferRecipient } from '../../types/transfers';

export interface Transfers04ScreenProps {
  readonly recipient?: TransferRecipient;
  readonly amountCents?: number;
  readonly reference?: string;
  readonly onViewReceipt?: () => void;
  readonly onGoHome?: () => void;
}

export const Transfers04Screen: React.FC<Transfers04ScreenProps> = ({
  recipient = DEMO_TRANSFER_DRAFT.recipient,
  amountCents = DEMO_TRANSFER_DRAFT.amountCents,
  reference = DEMO_TRANSFER_HISTORY[0].reference,
  onViewReceipt,
  onGoHome,
}) => {
  return (
    <TransferStatusScreen
      icon="check"
      iconBackground={colors.transfersSuccessBg}
      iconColor={colors.transfersSuccessIcon}
      badge="201"
      badgeBackground={colors.transfersSuccessBadgeBg}
      badgeColor={colors.transfersSuccessBadgeText}
      title="Transferencia realizada"
      description={`${recipient.name} recibió ${formatCopFromCents(amountCents)} al instante.`}
      primaryLabel="Ver comprobante"
      onPrimary={onViewReceipt}
      secondaryLabel="Volver al inicio"
      onSecondary={onGoHome}
      demoHint="Previsualización DEMO · no se procesó una transacción"
    >
      <TransferDetailCard
        rows={[
          { label: 'Para', value: `${recipient.name} · ${recipient.code}` },
          { label: 'Referencia', value: reference },
          {
            label: 'Saldo después',
            value: formatCopFromCents(DEMO_TRANSFER_BALANCE_AFTER_CENTS),
            strong: true,
          },
        ]}
      />
    </TransferStatusScreen>
  );
};

export default Transfers04Screen;
