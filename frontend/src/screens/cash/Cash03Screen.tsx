// ============================================================
// Cash_03 — Registrar gasto
// Fuente visual: Stitch screen 0ac5ae2263c0403a973aa4b1df0c452e
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
  DEMO_CASH_AVAILABLE_CENTS,
  DEMO_CASH_EXPENSE_DRAFT,
  formatCashAmount,
} from '../../data/demoCash';

export interface Cash03ScreenProps {
  readonly onBack?: () => void;
  readonly onSave?: () => void;
  readonly onCancel?: () => void;
}

export const Cash03Screen: React.FC<Cash03ScreenProps> = ({
  onBack,
  onSave,
  onCancel,
}) => {
  const [note, setNote] = useState(DEMO_CASH_EXPENSE_DRAFT.note);

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
            title="Registrar gasto"
            onBack={onBack}
            titleSize={25}
          />
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Monto del gasto</Text>
          <Text style={styles.amount}>
            {formatCashAmount(DEMO_CASH_EXPENSE_DRAFT.amountCents)}
          </Text>
          <Text style={styles.amountNote}>
            Disponible en efectivo: {formatCashAmount(DEMO_CASH_AVAILABLE_CENTS)}
          </Text>
        </View>

        <View style={styles.form}>
          <CashFormField
            label="Categoría"
            value={DEMO_CASH_EXPENSE_DRAFT.category}
            readOnly
            height={58}
          />
          <CashFormField
            label="Fecha"
            value={DEMO_CASH_EXPENSE_DRAFT.dateLabel}
            readOnly
            height={58}
          />
          <CashFormField
            label="Nota (opcional)"
            value={note}
            onChangeText={setNote}
            placeholder="Ej. Tienda del barrio"
            height={58}
          />
        </View>

        <Text style={styles.demoHint}>
          Registro DEMO · no se descontará efectivo real
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <CashActionButtons
          primaryLabel="Guardar gasto"
          onPrimary={onSave}
          secondaryLabel="Cancelar"
          onSecondary={onCancel}
          height={60}
          radius={20}
          secondaryBorderColor={colors.cashBorderCancel}
          primaryFontWeight="700"
          secondaryFontWeight="700"
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cashBgForm,
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
    borderRadius: 26,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.cashShadow,
    shadowOpacity: 0.02,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  amountLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.cashMutedStrong,
    marginBottom: 8,
  },
  amount: {
    fontSize: 40,
    lineHeight: 45,
    fontWeight: '800',
    color: colors.cashNavy,
    letterSpacing: -1,
    marginBottom: 12,
  },
  amountNote: {
    fontSize: 13.5,
    fontWeight: '500',
    color: colors.cashMutedStrong,
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
    paddingBottom: 34,
  },
});

export default Cash03Screen;
