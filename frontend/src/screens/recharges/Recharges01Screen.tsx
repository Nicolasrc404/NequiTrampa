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
import { formatRechargeAmount } from '../../data/demoRecharges';
import { MAX_RECHARGE_CENTS, MIN_RECHARGE_CENTS } from '../../services/rechargesService';
import { parseCopInput } from '../../utils/money';

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
  const [amountText, setAmountText] = useState(
    amountCents > 0 ? String(Math.round(amountCents / 100)) : '',
  );
  const [touched, setTouched] = useState(false);

  const parsedAmountCents = parseCopInput(amountText);
  const amountValid =
    parsedAmountCents !== null &&
    parsedAmountCents >= MIN_RECHARGE_CENTS &&
    parsedAmountCents <= MAX_RECHARGE_CENTS;

  const handleChangeText = (text: string) => {
    setAmountText(text);
    const parsed = parseCopInput(text);
    if (
      parsed !== null &&
      parsed >= MIN_RECHARGE_CENTS &&
      parsed <= MAX_RECHARGE_CENTS
    ) {
      onAmountChange?.(parsed);
    }
  };

  const handleContinue = () => {
    setTouched(true);
    if (submitting || !amountValid) return;
    onContinue?.();
  };

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
        <View style={styles.header}>
          <TransfersHeader title="Recargar" onBack={onBack} titleSize={22} />
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.question}>¿Cuánto quieres recargar?</Text>
          <TextInput
            style={[
              styles.amountInput,
              touched && !amountValid ? styles.amountInputError : null,
            ]}
            value={amountText}
            onChangeText={handleChangeText}
            onBlur={() => setTouched(true)}
            placeholder="$ 0"
            placeholderTextColor={colors.rechargesSubtle}
            keyboardType="numeric"
            editable={!submitting}
            accessibilityLabel="Monto a recargar"
          />
          <Text style={styles.note}>
            Recarga simulada · entre {formatRechargeAmount(MIN_RECHARGE_CENTS)} y{' '}
            {formatRechargeAmount(MAX_RECHARGE_CENTS)}
          </Text>
          {touched && !amountValid ? (
            <Text style={styles.errorText}>
              Ingresa un monto entre {formatRechargeAmount(MIN_RECHARGE_CENTS)} y{' '}
              {formatRechargeAmount(MAX_RECHARGE_CENTS)}.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, submitting ? styles.primaryButtonBusy : null]}
          activeOpacity={0.85}
          onPress={handleContinue}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Continuar con la recarga"
          accessibilityState={{ disabled: submitting, busy: submitting }}
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
    paddingBottom: 20,
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
    marginBottom: 24,
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
  amountInput: {
    minWidth: 160,
    textAlign: 'center',
    fontSize: 38,
    lineHeight: 45,
    fontWeight: '800',
    color: colors.rechargesDark,
    letterSpacing: -1,
    marginBottom: 8,
    padding: 0,
  },
  amountInputError: {
    color: colors.rechargesError,
  },
  note: {
    fontSize: 13,
    color: colors.rechargesMuted,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12.5,
    color: colors.rechargesError,
    textAlign: 'center',
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
  primaryButtonBusy: {
    opacity: 0.6,
  },
});

export default Recharges01Screen;
