// ============================================================
// Transfers_22 — Comprobante de transferencia
// Fuente visual: Stitch screen e898982f61464dcc816b00943f5bd020
// ============================================================
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import TransferActionButtons from '../../components/transfers/TransferActionButtons';
import {
  DEMO_TRANSFER_DETAIL,
  DEMO_TRANSFER_DRAFT,
  formatCopFromCents,
} from '../../data/demoTransfers';
import { TransferItem } from '../../types/transfers';
import type { TransferReceiptDto } from '../../services/transfersService';
import { mapTransferStatus } from '../../services/mappers/transferMapper';
import { formatBogotaDateTime } from '../../utils/datetime';

export interface Transfers22ScreenProps {
  readonly transfer?: TransferItem;
  /** Comprobante autoritativo de `GET /v1/transfers/{id}/receipt`. */
  readonly receipt?: TransferReceiptDto | null;
  readonly onBack?: () => void;
  /** `false` cuando los datos provienen de la API real. */
  readonly demoMode?: boolean;
}

export const Transfers22Screen: React.FC<Transfers22ScreenProps> = ({
  transfer = DEMO_TRANSFER_DETAIL,
  receipt = null,
  onBack,
  demoMode = true,
}) => {
  const showUnavailable = (action: string) => {
    if (demoMode) {
      Alert.alert(
        `${action} · DEMO`,
        'Esta acción se habilitará cuando el comprobante se conecte al backend. No se generó ni compartió ningún archivo real.',
        [{ text: 'Entendido' }],
      );
      return;
    }
    Alert.alert(
      `${action} no disponible`,
      'La descarga y el envío del comprobante aún no están habilitados en esta versión.',
      [{ text: 'Entendido' }],
    );
  };

  const rows = receipt
    ? [
        { label: 'Comprobante', value: receipt.receiptNumber },
        { label: 'Código origen', value: receipt.originMaskedTransferCode },
        {
          label: 'Código destino',
          value: receipt.destinationMaskedTransferCode,
        },
        { label: 'Fecha', value: formatBogotaDateTime(receipt.completedAt) },
        { label: 'Autorización', value: receipt.authorizationCode },
        { label: 'Estado', value: mapTransferStatus(receipt.status) },
      ]
    : [
        {
          label: 'Para',
          value: `${transfer.counterpartyName} · ${transfer.counterpartyCode}`,
        },
        { label: 'Mensaje', value: transfer.message || '—' },
        { label: 'Referencia', value: transfer.reference },
        { label: 'Estado', value: transfer.statusLabel },
        // El contrato no expone saldo posterior: se omite en lugar de inventarlo.
        ...(typeof transfer.balanceAfterCents === 'number'
          ? [
              {
                label: 'Saldo después',
                value: formatCopFromCents(transfer.balanceAfterCents),
              },
            ]
          : []),
      ];

  const amountCents =
    receipt?.amountCents ?? (transfer.amountCents || DEMO_TRANSFER_DRAFT.amountCents);
  const occurredAtLabel = receipt
    ? formatBogotaDateTime(receipt.completedAt)
    : transfer.occurredAtLabel;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TransfersHeader title="Comprobante" onBack={onBack} titleSize={26} />

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Transferencia exitosa</Text>
          <Text style={styles.amount}>
            {formatCopFromCents(amountCents)}
          </Text>
          <Text style={styles.date}>{occurredAtLabel}</Text>
        </View>

        <View style={styles.detailCard}>
          {rows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.detailRow,
                index < rows.length - 1 ? styles.detailRowBorder : null,
              ]}
            >
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {demoMode ? (
          <Text style={styles.demoHint}>
            Comprobante DEMO · no es un documento fiscal ni una operación real
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TransferActionButtons
          primaryLabel="Descargar comprobante"
          onPrimary={() => showUnavailable('Descargar comprobante')}
          secondaryLabel="Compartir"
          onSecondary={() => showUnavailable('Compartir')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.transfersReceiptBg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 16,
  },
  amountCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 26,
    shadowColor: colors.transfersShadow,
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  amountLabel: {
    fontSize: 15,
    color: colors.transfersMuted,
    marginBottom: 8,
  },
  amount: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
    color: colors.transfersDark,
    letterSpacing: -1,
    marginBottom: 10,
  },
  date: {
    fontSize: 13,
    color: colors.transfersMuted,
    letterSpacing: 0.2,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 4,
    marginTop: 16,
    shadowColor: colors.transfersShadow,
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    gap: 16,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.transfersDivider,
  },
  detailLabel: {
    fontSize: 15,
    color: colors.transfersMuted,
  },
  detailValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.transfersDark,
    textAlign: 'right',
  },
  demoHint: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.transfersNavInactive,
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
});

export default Transfers22Screen;
