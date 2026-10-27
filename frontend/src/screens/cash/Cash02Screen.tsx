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
  TextInput,
  View,
} from 'react-native';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import CashFormField from '../../components/cash/CashFormField';
import CashActionButtons from '../../components/cash/CashActionButtons';
import OptionChips from '../../components/common/OptionChips';
import {
  DEMO_CASH_INCOME_DRAFT,
  formatCashAmount,
} from '../../data/demoCash';
import { MAX_CASH_AMOUNT_CENTS } from '../../services/cashService';
import { parseCopInput } from '../../utils/money';
import type { CategoryItem } from '../../types/categories';

export interface CashFormSubmit {
  readonly amountCents: number;
  readonly note: string;
  readonly categoryId: string | null;
  readonly categoryName: string;
}

export interface Cash02ScreenProps {
  readonly onBack?: () => void;
  readonly onSubmit?: (input: CashFormSubmit) => void;
  readonly onCancel?: () => void;
  /** Bloquea el formulario mientras el servidor confirma. */
  readonly submitting?: boolean;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
  /** Etiqueta de la fecha que aplicará el backend (por ejemplo «Hoy»). */
  readonly todayLabel?: string;
  /** Categorías reales del usuario. En DEMO puede omitirse. */
  readonly categories?: readonly CategoryItem[];
  readonly initialAmountText?: string;
  readonly initialNote?: string;
  readonly initialCategoryId?: string | null;
  readonly initialCategoryName?: string;
}

export const Cash02Screen: React.FC<Cash02ScreenProps> = ({
  onBack,
  onSubmit,
  onCancel,
  submitting = false,
  demo = true,
  todayLabel = demo ? DEMO_CASH_INCOME_DRAFT.dateLabel : 'Hoy',
  categories = [],
  initialAmountText,
  initialNote,
  initialCategoryId,
  initialCategoryName,
}) => {
  const [amountText, setAmountText] = useState(
    initialAmountText ??
      (demo ? formatCashAmount(DEMO_CASH_INCOME_DRAFT.amountCents) : ''),
  );
  const [note, setNote] = useState(initialNote ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(
    initialCategoryId ?? null,
  );
  const [touched, setTouched] = useState(false);

  const parsedAmount = parseCopInput(amountText);
  const amountValid =
    parsedAmount !== null &&
    parsedAmount >= 1 &&
    parsedAmount <= MAX_CASH_AMOUNT_CENTS;

  const selectedCategory = categories.find((item) => item.id === categoryId);
  const categoryLabel =
    selectedCategory?.name ||
    initialCategoryName ||
    (demo ? DEMO_CASH_INCOME_DRAFT.category : 'Sin categoría');

  const handleSubmit = () => {
    setTouched(true);
    if (submitting || !amountValid || parsedAmount === null) return;
    onSubmit?.({
      amountCents: parsedAmount,
      note: note.trim(),
      categoryId: categoryId ?? null,
      categoryName: selectedCategory?.name ?? categoryLabel,
    });
  };

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
          <TextInput
            style={[
              styles.amount,
              touched && !amountValid ? styles.amountError : null,
            ]}
            value={amountText}
            onChangeText={setAmountText}
            placeholder="$ 0"
            placeholderTextColor={colors.cashInputPlaceholder}
            keyboardType="numeric"
            editable={!submitting}
            accessibilityLabel="Monto del ingreso"
          />
          <Text style={styles.amountNote}>Efectivo que recibiste</Text>
          {touched && !amountValid ? (
            <Text style={styles.amountErrorText}>
              Ingresa un monto mayor a $ 0 COP.
            </Text>
          ) : null}
        </View>

        <View style={styles.form}>
          <View style={styles.categoryGroup}>
            <CashFormField
              label="Categoría"
              value={categoryLabel}
              readOnly
            />
            {categories.length > 0 ? (
              <OptionChips
                options={categories.map((category) => ({
                  id: category.id,
                  label: category.name,
                }))}
                selectedId={categoryId}
                onSelect={setCategoryId}
                accentColor={colors.cashMagenta}
                disabled={submitting}
              />
            ) : null}
          </View>
          <CashFormField label="Fecha" value={todayLabel} readOnly />
          <CashFormField
            label="Nota (opcional)"
            value={note}
            onChangeText={setNote}
            placeholder="Ej. Pago de un trabajo"
            maxLength={140}
          />
        </View>

        {demo ? (
          <Text style={styles.demoHint}>
            Registro DEMO · no se guardará en el servidor
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <CashActionButtons
          primaryLabel={submitting ? 'Guardando…' : 'Guardar ingreso'}
          onPrimary={submitting ? undefined : handleSubmit}
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
    minWidth: 160,
    textAlign: 'center',
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '800',
    color: colors.cashDark,
    letterSpacing: -1,
    marginBottom: 12,
    padding: 0,
  },
  amountError: {
    color: colors.cashErrorText,
  },
  amountNote: {
    fontSize: 13,
    color: colors.cashMutedAlt,
  },
  amountErrorText: {
    marginTop: 8,
    fontSize: 12.5,
    color: colors.cashErrorText,
  },
  form: {
    gap: 16,
  },
  categoryGroup: {
    gap: 10,
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
