// ============================================================
// Budgets_05 — Editar presupuesto
// Fuente visual: Stitch screen cfc2f2da5cf74539ace456c098e71143
// ============================================================
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import BudgetsHeader from '../../components/budgets/BudgetsHeader';
import BudgetsSummaryCard from '../../components/budgets/BudgetsSummaryCard';
import BudgetFormField from '../../components/budgets/BudgetFormField';
import BudgetsActionButtons from '../../components/budgets/BudgetsActionButtons';
import {
  DEMO_BUDGET_EDIT_DRAFT,
  formatBudgetAmount,
} from '../../data/demoBudgets';
import { MAX_BUDGET_LIMIT_CENTS } from '../../services/budgetsService';
import { formatMonthPeriodLabel } from '../../utils/datetime';
import { parseCopInput } from '../../utils/money';
import type { BudgetItem } from '../../types/budgets';

export interface BudgetUpdateSubmit {
  readonly limitCents: number;
}

export interface Budgets05ScreenProps {
  readonly onBack?: () => void;
  readonly onSave?: (input: BudgetUpdateSubmit) => void;
  readonly onDelete?: () => void;
  readonly onCancel?: () => void;
  /** Presupuesto seleccionado en la lista. */
  readonly budget?: BudgetItem;
  /** Bloquea el formulario mientras el servidor confirma. */
  readonly submitting?: boolean;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
  readonly initialLimitText?: string;
}

export const Budgets05Screen: React.FC<Budgets05ScreenProps> = ({
  onBack,
  onSave,
  onDelete,
  onCancel,
  budget,
  submitting = false,
  demo = true,
  initialLimitText,
}) => {
  const categoryName = budget?.category ?? DEMO_BUDGET_EDIT_DRAFT.category;
  const periodLabel =
    budget?.period !== undefined
      ? formatMonthPeriodLabel(budget.period)
      : DEMO_BUDGET_EDIT_DRAFT.period;
  const previousLimitCents =
    budget?.limitCents ?? DEMO_BUDGET_EDIT_DRAFT.previousLimitCents ?? 0;

  const [limitText, setLimitText] = useState(
    initialLimitText ??
      (budget
        ? formatBudgetAmount(budget.limitCents)
        : demo
          ? formatBudgetAmount(DEMO_BUDGET_EDIT_DRAFT.limitCents)
          : ''),
  );
  const [touched, setTouched] = useState(false);

  const parsedLimit = parseCopInput(limitText);
  const limitValid =
    parsedLimit !== null &&
    parsedLimit >= 1 &&
    parsedLimit <= MAX_BUDGET_LIMIT_CENTS;

  const handleSubmit = () => {
    setTouched(true);
    if (submitting || !limitValid || parsedLimit === null) return;
    onSave?.({ limitCents: parsedLimit });
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
          title="Editar presupuesto"
          onBack={onBack}
          titleSize={21}
          rightLabel={onDelete ? 'Eliminar' : undefined}
          onRight={onDelete}
        />

        <View style={styles.summary}>
          <BudgetsSummaryCard
            label="Límite mensual"
            amount={
              limitValid && parsedLimit !== null
                ? formatBudgetAmount(parsedLimit)
                : formatBudgetAmount(0)
            }
            meta={`Antes: ${formatBudgetAmount(previousLimitCents)}`}
            amountSize={38}
          />
        </View>

        <View style={styles.form}>
          <BudgetFormField label="Categoría" value={categoryName} />
          <BudgetFormField label="Periodo" value={periodLabel} />
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
                : 'La categoría y el periodo no se pueden cambiar'
            }
          />
        </View>

        <Text style={styles.demoHint}>
          {demo
            ? 'Edición DEMO · no modifica presupuestos reales'
            : 'Solo se actualiza el límite mensual'}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <BudgetsActionButtons
          primaryLabel={submitting ? 'Guardando…' : 'Guardar cambios'}
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

export default Budgets05Screen;
