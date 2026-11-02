// ============================================================
// Transfers_03 — Enviando tu dinero
// Fuente visual: Stitch screen 3f7e4ba535b249dd88e5207e5a2b0e4a
// ============================================================
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { TransferRecipient } from '../../types/transfers';
import { formatCopCents } from '../../utils/money';
import { isTransferAmountValid, MAX_TRANSFER_CENTS } from '../../services/transfersService';

export interface Transfers03ScreenProps {
  readonly onShowDemoResult?: () => void;
  readonly recipient?: TransferRecipient;
  readonly amountCents?: number;
  readonly availableBalanceCents?: number | null;
  readonly onConfirm?: () => void;
  readonly onCancel?: () => void;
  readonly submitting?: boolean;
}
export const Transfers03Screen: React.FC<Transfers03ScreenProps> = ({
  onShowDemoResult,
  recipient,
  amountCents = 0,
  availableBalanceCents = null,
  onConfirm,
  onCancel,
  submitting = false,
}) => {
  if (onConfirm && !submitting) {
    const amountValid = isTransferAmountValid(amountCents, availableBalanceCents);
    const recipientValid = Boolean(recipient?.code.trim());
    const canConfirm = amountValid && recipientValid;
    const validationMessage = !recipientValid
      ? 'Selecciona un destinatario válido.'
      : !amountValid
        ? amountCents > (availableBalanceCents ?? Number.MAX_SAFE_INTEGER)
          ? 'El monto supera tu saldo disponible.'
          : amountCents > MAX_TRANSFER_CENTS
            ? 'El monto supera el límite académico.'
            : 'El monto debe ser mayor que cero.'
        : null;
    return (
      <View style={styles.root}>
        <View style={styles.confirmBody}>
          <Text style={styles.confirmEyebrow}>CONFIRMA TU TRANSFERENCIA</Text>
          <Text style={styles.title}>Revisa los datos</Text>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmLabel}>Destinatario</Text>
            <Text style={styles.confirmValue}>{recipient?.name || 'Destinatario'} · {recipient?.code}</Text>
            <Text style={styles.confirmLabel}>Importe</Text>
            <Text style={styles.confirmAmount}>{formatCopCents(amountCents)}</Text>
            {typeof availableBalanceCents === 'number' ? <Text style={styles.confirmMeta}>Saldo disponible: {formatCopCents(availableBalanceCents)}</Text> : null}
            {validationMessage ? <Text style={styles.validationMessage}>{validationMessage}</Text> : null}
          </View>
          <Text style={styles.description}>El saldo solo cambiará después de confirmar la operación.</Text>
        </View>
        <View style={styles.confirmFooter}>
          <TouchableOpacity style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]} onPress={onConfirm} disabled={!canConfirm} accessibilityRole="button" accessibilityLabel="Confirmar transferencia">
            <Text style={styles.confirmButtonText}>Confirmar transferencia</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancelar transferencia">
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Feather name="clock" size={40} color={colors.transfersAvatarText} />
        </View>

        <Text style={styles.title}>Enviando tu dinero</Text>
        <Text style={styles.description}>
          No cierres la app. Esto toma unos segundos.
        </Text>
        <Text style={styles.note}>
          Si algo falla puedes reintentar: no se cobra dos veces.
        </Text>
      </View>

      {onShowDemoResult ? (
        <TouchableOpacity
          style={styles.demoButton}
          activeOpacity={0.7}
          onPress={onShowDemoResult}
          accessibilityRole="button"
          accessibilityLabel="Ver resultado DEMO"
        >
          <Text style={styles.demoButtonText}>Ver resultado DEMO (201)</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.transfersBg,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 96,
  },
  confirmBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  confirmEyebrow: {
    color: colors.transfersMagenta,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  confirmCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 22,
    marginTop: 28,
    gap: 8,
  },
  confirmLabel: {
    color: colors.transfersMuted,
    fontSize: 13,
    marginTop: 6,
  },
  confirmValue: {
    color: colors.transfersDark,
    fontSize: 17,
    fontWeight: '700',
  },
  confirmAmount: {
    color: colors.transfersDark,
    fontSize: 30,
    fontWeight: '800',
  },
  confirmMeta: {
    color: colors.transfersMuted,
    fontSize: 13,
    marginTop: 8,
  },
  confirmFooter: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    gap: 12,
  },
  confirmButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.transfersMagenta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  validationMessage: {
    color: colors.transfersMagenta,
    fontSize: 13,
    marginTop: 8,
  },
  cancelButton: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.transfersInputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.transfersMagenta,
    fontSize: 16,
    fontWeight: '600',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.transfersAvatarBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    color: colors.transfersDark,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  description: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.transfersMuted,
    textAlign: 'center',
  },
  note: {
    maxWidth: 310,
    fontSize: 14,
    lineHeight: 21,
    color: colors.transfersMuted,
    textAlign: 'center',
    marginTop: 14,
  },
  demoButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 32,
  },
  demoButtonText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.transfersNavInactive,
    textTransform: 'uppercase',
  },
});

export default Transfers03Screen;
