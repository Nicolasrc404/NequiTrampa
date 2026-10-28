// ============================================================
// Budgets_04 — Crear presupuesto
// Fuente visual: Stitch screen 45dae96c32044afb86a682d6ce0210a0
// ============================================================
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import BudgetsHeader from '../../components/budgets/BudgetsHeader';
import BudgetsSummaryCard from '../../components/budgets/BudgetsSummaryCard';
import BudgetFormField from '../../components/budgets/BudgetFormField';
import BudgetsActionButtons from '../../components/budgets/BudgetsActionButtons';
import OptionChips from '../../components/common/OptionChips';
import {
  DEMO_BUDGET_CREATE_DRAFT,
  formatBudgetAmount,
} from '../../data/demoBudgets';
import { MAX_BUDGET_LIMIT_CENTS } from '../../services/budgetsService';
import { formatMonthPeriodLabel } from '../../utils/datetime';
import { parseCopInput } from '../../utils/money';
import type { CategoryItem } from '../../types/categories';

export interface BudgetFormSubmit {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly period: string;
  readonly limitCents: number;
}

export interface Budgets04ScreenProps {
  readonly onBack?: () => void;
  readonly onCreate?: (input: BudgetFormSubmit) => void;
  readonly onCancel?: () => void;
  /** Bloquea el formulario mientras el servidor confirma. */
  readonly submitting?: boolean;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
  /** Categorías de gasto del usuario. */
  readonly categories?: readonly CategoryItem[];
  /** Periodo que se enviará al backend (`AAAA-MM`). */
  readonly period?: string;
  readonly initialCategoryId?: string | null;
  readonly initialLimitText?: string;
}

export const Budgets04Screen: React.FC<Budgets04ScreenProps> = ({
  onBack,
  onCreate,
  onCancel,
  submitting = false,
  demo = true,
  categories = [],
  period = '2026-10',
  initialCategoryId,
  initialLimitText,
}) => {
  const [categoryId, setCategoryId] = useState<string | null>(
    initialCategoryId ?? null,
  );
  const [limitText, setLimitText] = useState(
    initialLimitText ??
      (demo ? formatBudgetAmount(DEMO_BUDGET_CREATE_DRAFT.limitCents) : ''),
  );
  const [touched, setTouched] = useState(false);

  const parsedLimit = parseCopInput(limitText);
  const limitValid =
    parsedLimit !== null &&
    parsedLimit >= 1 &&
    parsedLimit <= MAX_BUDGET_LIMIT_CENTS;
  const selectedCategory = categories.find((item) => item.id === categoryId);
  const categoryValid = selectedCategory !== undefined;

  const handleSubmit = () => {
    setTouched(true);
    if (
      submitting ||
      selectedCategory === undefined ||
      !limitValid ||
      parsedLimit === null
    ) {
      return;
    }
    onCreate?.({
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      period,
      limitCents: parsedLimit,
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BudgetsHeader
          title="Crear presupuesto"
          onBack={onBack}
          titleSize={22}
        />

        <View style={styles.summary}>
          <BudgetsSummaryCard
            label="Límite mensual"
            amount={
              limitValid && parsedLimit !== null
                ? formatBudgetAmount(parsedLimit)
                : '$ 0'
            }
            meta="Te avisamos al llegar al 80%"
            amountSize={34}
          />
        </View>

        <View style={styles.form}>
          <View style={styles.categoryGroup}>
            <BudgetFormField
              label="Categoría"
              value={selectedCategory?.name ?? ''}
              placeholder="Elige una categoría de gasto"
              error={touched && !categoryValid}
              helper={touched && !categoryValid ? 'Elige una categoría' : undefined}
            />
            <OptionChips
              options={categories.map((category) => ({
                id: category.id,
                label: category.name,
              }))}
              selectedId={categoryId}
              onSelect={setCategoryId}
              accentColor={colors.cashMagenta}
              disabled={submitting}
              emptyLabel={
                demo
                  ? 'Sin categorías DEMO disponibles'
                  : 'No tienes categorías de gasto. Crea una primero.'
              }
            />
          </View>
          <BudgetFormField
            label="Periodo"
            value={formatMonthPeriodLabel(period)}
          />
          <BudgetFormField
            label="Límite mensual (COP)"
            value={limitText}
            placeholder="$ 0"
            onChangeText={setLimitText}
            readOnly={false}
            keyboardType="numeric"
            error={touched && !limitValid}
            helper={
              touched && !limitValid
                ? 'Ingresa un límite mayor a $ 0 COP'
                : undefined
            }
          />
        </View>

        <Text style={styles.demoHint}>
          {demo
            ? 'Presupuesto DEMO · no se guardará en el servidor'
            : 'El backend valida el límite y la categoría'}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <BudgetsActionButtons
          primaryLabel={submitting ? 'Creando…' : 'Crear presupuesto'}
          onPrimary={submitting ? undefined : handleSubmit}
          secondaryLabel="Cancelar"
          onSecondary={onCancel}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.budgetsBg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
  },
  summary: {
    marginTop: 24,
    marginBottom: 24,
  },
  form: {
    gap: 20,
  },
  categoryGroup: {
    gap: 10,
  },
  demoHint: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.budgetsMuted,
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
});

export default Budgets04Screen;
