// ============================================================
// Transfers_19 — Detalle de transferencia
// Fuente visual: Stitch screen f8b3845303744fe1b7b0996632534284
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import TransferActionButtons from '../../components/transfers/TransferActionButtons';
import {
  DEMO_TRANSFER_DETAIL,
  formatCopFromCents,
} from '../../data/demoTransfers';
import { TransferItem } from '../../types/transfers';

export interface Transfers19ScreenProps {
  readonly transfer?: TransferItem;
  readonly onBack?: () => void;
  readonly onViewReceipt?: () => void;
  /** `false` cuando los datos provienen de la API real. */
  readonly demoMode?: boolean;
}

export const Transfers19Screen: React.FC<Transfers19ScreenProps> = ({
  transfer = DEMO_TRANSFER_DETAIL,
  onBack,
  onViewReceipt,
  demoMode = true,
}) => {
  const isSent = transfer.direction === 'sent';
  const balanceAfterCents = transfer.balanceAfterCents;
  const rows = [
    { label: 'Referencia', value: transfer.reference },
    { label: 'Fecha', value: transfer.occurredAtLabel },
    { label: 'Mensaje', value: transfer.message || '—' },
    { label: 'Estado', value: transfer.statusLabel },
    // El contrato no expone saldo posterior: se omite en lugar de inventarlo.
    ...(typeof balanceAfterCents === 'number'
      ? [
          {
            label: 'Saldo después',
            value: formatCopFromCents(balanceAfterCents),
          },
        ]
      : []),
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TransfersHeader
          title="Detalle de transferencia"
          onBack={onBack}
          titleSize={22}
        />

        <View style={styles.amountCard}>
          <Text style={styles.counterparty}>
            {isSent ? 'Enviaste a' : 'Recibiste de'}{' '}
            {transfer.counterpartyName}
          </Text>
          <Text style={styles.amount}>
            {isSent ? '- ' : '+ '}
            {formatCopFromCents(transfer.amountCents)}
          </Text>
          <Text style={styles.status}>{transfer.statusLabel}</Text>
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
            Detalle DEMO · no corresponde a una operación real
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TransferActionButtons
          primaryLabel="Ver comprobante"
          onPrimary={onViewReceipt}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.transfersBg,
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
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: colors.transfersShadow,
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  counterparty: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.transfersMuted,
    marginBottom: 8,
  },
  amount: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    color: colors.transfersDark,
    letterSpacing: -1,
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.transfersMuted,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 22,
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
    paddingTop: 8,
    paddingBottom: 28,
  },
});

export default Transfers19Screen;
