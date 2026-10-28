// ============================================================
// Transfers_05 — Error de validación (400)
// Fuente visual: Stitch screen e629763686f6486ab24bd5525c8aa34c
// ============================================================
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import TransferActionButtons from '../../components/transfers/TransferActionButtons';
import { DEMO_TRANSFER_DRAFT, formatCopFromCents } from '../../data/demoTransfers';

export interface Transfers05ScreenProps {
  readonly onBack?: () => void;
  readonly onContinue?: () => void;
}

export const Transfers05Screen: React.FC<Transfers05ScreenProps> = ({
  onBack,
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
        showsVerticalScrollIndicator={false}
      >
        <TransfersHeader title="Enviar dinero" onBack={onBack} />

        <View style={styles.banner}>
          <Feather
            name="alert-circle"
            size={20}
            color={colors.transfersError}
          />
          <Text style={styles.bannerText}>
            Revisa los datos marcados antes de continuar.
          </Text>
        </View>

        <View style={[styles.amountCard, styles.amountCardError]}>
          <Text style={styles.amountQuestion}>¿Cuánto quieres enviar?</Text>
          <Text style={styles.amountValue}>
            {formatCopFromCents(DEMO_TRANSFER_DRAFT.amountCents)}
          </Text>
          <Text style={styles.amountMeta}>Límite por operación $ 2.000.000</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Para</Text>
          <View style={[styles.fieldBox, styles.fieldError]}>
            <Text style={styles.errorValue}>
              Selecciona un destinatario
            </Text>
          </View>
          <Text style={styles.errorText}>
            El nombre del destinatario es obligatorio.
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Mensaje (opcional)</Text>
          <View style={styles.fieldBox}>
            <Text style={styles.fieldValue}>{DEMO_TRANSFER_DRAFT.message}</Text>
          </View>
        </View>

        <Text style={styles.demoHint}>
          Validación DEMO · el backend conserva la validación definitiva
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.transfersErrorBg,
    borderWidth: 1,
    borderColor: 'rgba(206, 52, 52, 0.15)',
  },
  bannerText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.transfersError,
    fontWeight: '500',
  },
  amountCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  amountCardError: {
    borderWidth: 1.5,
    borderColor: colors.transfersErrorBorder,
    backgroundColor: '#FFFBFB',
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
    fontSize: 13,
    color: colors.transfersMuted,
  },
  fieldGroup: {
    gap: 6,
    marginBottom: 16,
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
  },
  fieldError: {
    borderColor: colors.transfersErrorBorder,
    backgroundColor: colors.transfersErrorBg,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.transfersDark,
    paddingVertical: 14,
  },
  errorValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.transfersError,
    paddingVertical: 14,
  },
  errorText: {
    fontSize: 12.5,
    color: colors.transfersError,
    paddingLeft: 4,
  },
  demoHint: {
    marginTop: 4,
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

export default Transfers05Screen;
