// ============================================================
// Transfers_01 — Enviar dinero
// Fuente visual: Stitch screen 5ba4d88fc8fa4219b5b9d9b2542d276b
// ============================================================
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import TransferActionButtons from '../../components/transfers/TransferActionButtons';
import {
  DEMO_TRANSFER_BALANCE_CENTS,
  DEMO_TRANSFER_LIMIT_CENTS,
  formatCopFromCents,
} from '../../data/demoTransfers';
import { TransferRecipient } from '../../types/transfers';

export interface Transfers01ScreenProps {
  readonly recipient: TransferRecipient;
  readonly amountCents: number;
  readonly message: string;
  readonly onMessageChange: (message: string) => void;
  readonly onBack?: () => void;
  readonly onSelectRecipient?: () => void;
  readonly onContinue?: () => void;
}

export const Transfers01Screen: React.FC<Transfers01ScreenProps> = ({
  recipient,
  amountCents,
  message,
  onMessageChange,
  onBack,
  onSelectRecipient,
  onContinue,
}) => {
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TransfersHeader title="Enviar dinero" onBack={onBack} />

        <View style={styles.amountCard}>
          <Text style={styles.amountQuestion}>¿Cuánto quieres enviar?</Text>
          <Text style={styles.amountValue}>
            {formatCopFromCents(amountCents)}
          </Text>
          <Text style={styles.amountMeta}>
            Disponible {formatCopFromCents(DEMO_TRANSFER_BALANCE_CENTS)} ·
            Límite por operación {formatCopFromCents(DEMO_TRANSFER_LIMIT_CENTS)}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Para</Text>
            <TouchableOpacity
              style={styles.fieldBox}
              activeOpacity={0.75}
              onPress={onSelectRecipient}
              accessibilityRole="button"
              accessibilityLabel={`Destinatario ${recipient.name}, ${recipient.code}`}
            >
              <Text style={styles.fieldValue}>
                {recipient.name} · {recipient.code}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mensaje (opcional)</Text>
            <View style={styles.fieldBox}>
              <TextInput
                style={styles.input}
                value={message}
                onChangeText={onMessageChange}
                placeholder="Escribe un mensaje"
                placeholderTextColor={colors.grayPlaceholder}
                maxLength={140}
                accessibilityLabel="Mensaje de la transferencia"
              />
            </View>
          </View>
        </View>

        <Text style={styles.demoHint}>
          Vista DEMO · no se enviará dinero ni se llamará al backend
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TransferActionButtons
          primaryLabel="Continuar"
          onPrimary={onContinue}
        />
      </View>
    </KeyboardAvoidingView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  amountCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
    shadowColor: colors.transfersShadow,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  amountQuestion: {
    fontSize: 15,
    color: colors.transfersMuted,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
    color: colors.transfersDark,
    letterSpacing: -1,
    marginBottom: 8,
  },
  amountMeta: {
    maxWidth: 290,
    fontSize: 13,
    lineHeight: 19,
    color: colors.transfersMuted,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 15,
    color: colors.transfersMuted,
    paddingLeft: 4,
  },
  fieldBox: {
    minHeight: 54,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.transfersBorder,
    paddingHorizontal: 16,
    justifyContent: 'center',
    shadowColor: colors.transfersShadow,
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.transfersDark,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.transfersDark,
    paddingVertical: 14,
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
    paddingTop: 10,
    paddingBottom: 28,
  },
});

export default Transfers01Screen;
