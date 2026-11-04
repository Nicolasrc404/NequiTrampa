// ============================================================
// Recharges_01 — Recargar
// Fuente visual: Stitch screen d461575caee4428886a0331bb24dc92e
// ============================================================
import React, { useState } from 'react';
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
import RechargeAmountPills from '../../components/recharges/RechargeAmountPills';
import { formatRechargeAmount } from '../../data/demoRecharges';
import {
  MIN_RECHARGE_CENTS,
  MAX_RECHARGE_CENTS,
} from '../../services/rechargesService';

export interface Recharges01ScreenProps {
  readonly amountCents: number;
  readonly onAmountChange?: (amountCents: number) => void;
  readonly onBack?: () => void;
  readonly onContinue?: () => void;
  /** Bloquea el envío mientras el backend confirma la recarga. */
  readonly submitting?: boolean;
}

export const Recharges01Screen: React.FC<Recharges01ScreenProps> = ({
  amountCents,
  onAmountChange,
  onBack,
  onContinue,
  submitting = false,
}) => {
  const [customText, setCustomText] = useState('');

  const handleCustomChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    setCustomText(digits);
    const cop = digits.length > 0 ? parseInt(digits, 10) : 0;
    onAmountChange?.(cop * 100);
  };

  const handlePillSelect = (presetCents: number) => {
    setCustomText('');
    onAmountChange?.(presetCents);
  };

  const isValidAmount =
    Number.isSafeInteger(amountCents) &&
    amountCents >= MIN_RECHARGE_CENTS &&
    amountCents <= MAX_RECHARGE_CENTS;

  let validationError: string | null = null;
  if (amountCents > 0) {
    if (amountCents < MIN_RECHARGE_CENTS) {
      validationError = `El monto mínimo es ${formatRechargeAmount(MIN_RECHARGE_CENTS)}.`;
    } else if (amountCents > MAX_RECHARGE_CENTS) {
      validationError = `El monto máximo es ${formatRechargeAmount(MAX_RECHARGE_CENTS)}.`;
    }
  } else {
    validationError = 'Ingresa un monto para continuar.';
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TransfersHeader title="Recargar" onBack={onBack} titleSize={22} />
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.question}>¿Cuánto quieres recargar?</Text>
          <Text style={styles.amount}>
            {formatRechargeAmount(amountCents)}
          </Text>
          <Text style={styles.note}>
            Mínimo {formatRechargeAmount(MIN_RECHARGE_CENTS)} · Máximo {formatRechargeAmount(MAX_RECHARGE_CENTS)}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Montos sugeridos</Text>
        </View>

        <RechargeAmountPills
          selectedAmountCents={customText.length > 0 ? 0 : amountCents}
          onChange={handlePillSelect}
        />

        <View style={styles.customCard}>
          <Text style={styles.customLabel}>O escribe otro valor en COP</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencyPrefix}>$</Text>
            <TextInput
              style={styles.customInput}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.rechargesMuted}
              value={customText}
              onChangeText={handleCustomChange}
              accessibilityLabel="Monto personalizado en COP"
              maxLength={10}
            />
          </View>
          {validationError ? (
            <Text style={styles.errorText}>{validationError}</Text>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            submitting || !isValidAmount ? styles.primaryButtonDisabled : null,
          ]}
          activeOpacity={0.85}
          onPress={onContinue}
          disabled={submitting || !isValidAmount}
          accessibilityRole="button"
          accessibilityLabel="Continuar con la recarga"
          accessibilityState={{ disabled: submitting || !isValidAmount, busy: submitting }}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Procesando…' : 'Continuar'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.rechargesBgForm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
  },
  amountCard: {
    backgroundColor: colors.rechargesWhite,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.rechargesShadow,
    shadowOpacity: 0.02,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  question: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.rechargesMuted,
    marginBottom: 8,
    textAlign: 'center',
  },
  amount: {
    fontSize: 38,
    lineHeight: 45,
    fontWeight: '800',
    color: colors.rechargesDark,
    letterSpacing: -1,
    marginBottom: 8,
    textAlign: 'center',
  },
  note: {
    fontSize: 13,
    color: colors.rechargesMuted,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.rechargesMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customCard: {
    backgroundColor: colors.rechargesWhite,
    borderRadius: 20,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.grayBorder,
  },
  customLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
    marginRight: 6,
  },
  customInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.navy,
    padding: 0,
  },
  errorText: {
    color: '#C83232',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  primaryButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.rechargesMagentaAlt,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.rechargesMagenta,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryButtonText: {
    color: colors.rechargesWhite,
    fontSize: 17,
    fontWeight: '600',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
});

export default Recharges01Screen;
