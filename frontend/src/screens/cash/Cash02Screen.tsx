// ============================================================
// Cash_02 — Registrar ingreso
// Fuente visual: Stitch screen 527c11ac2cb54fc188345b42e0491d16
// ============================================================
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import CashFormField from '../../components/cash/CashFormField';
import CashActionButtons from '../../components/cash/CashActionButtons';
import {
  DEMO_CASH_INCOME_DRAFT,
  formatCashAmount,
} from '../../data/demoCash';

export interface Cash02ScreenProps {
  readonly onBack?: () => void;
  readonly onSave?: () => void;
  readonly onCancel?: () => void;
}

export const Cash02Screen: React.FC<Cash02ScreenProps> = ({
  onBack,
  onSave,
  onCancel,
}) => {
  const [note, setNote] = useState(DEMO_CASH_INCOME_DRAFT.note);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TransfersHeader
            title="Registrar ingreso"
            onBack={onBack}
            titleSize={22}
          />
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Monto del ingreso</Text>
          <Text style={styles.amount}>
            {formatCashAmount(DEMO_CASH_INCOME_DRAFT.amountCents)}
          </Text>
          <Text style={styles.amountNote}>Efectivo que recibiste</Text>
        </View>

        <View style={styles.form}>
          <CashFormField
            label="Categoría"
            value={DEMO_CASH_INCOME_DRAFT.category}
            readOnly
          />
          <CashFormField
            label="Fecha"
            value={DEMO_CASH_INCOME_DRAFT.dateLabel}
            readOnly
          />
          <CashFormField
            label="Nota (opcional)"
            value={note}
            onChangeText={setNote}
            placeholder="Ej. Pago de un trabajo"
          />
        </View>

        <Text style={styles.demoHint}>
          Registro DEMO · no se guardará en el servidor
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <CashActionButtons
          primaryLabel="Guardar ingreso"
          onPrimary={onSave}
          secondaryLabel="Cancelar"
          onSecondary={onCancel}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cashBg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 24,
  },
  amountCard: {
    backgroundColor: colors.cashWhite,
    borderRadius: 28,
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.cashShadow,
    shadowOpacity: 0.02,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  amountLabel: {
    fontSize: 14,
    color: colors.cashMutedAlt,
    marginBottom: 8,
  },
  amount: {
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '800',
    color: colors.cashDark,
    letterSpacing: -1,
    marginBottom: 12,
  },
  amountNote: {
    fontSize: 13,
    color: colors.cashMutedAlt,
  },
  form: {
    gap: 16,
  },
  demoHint: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.cashSubtle,
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
});

export default Cash02Screen;
