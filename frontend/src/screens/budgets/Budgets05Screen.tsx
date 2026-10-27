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
import type { BudgetItem } from '../../types/budgets';

export interface Budgets05ScreenProps {
  readonly onBack?: () => void;
  readonly onSave?: (limitCents: number) => void;
  readonly onDelete?: () => void;
  readonly onCancel?: () => void;
  readonly budget?: BudgetItem;
  readonly demo?: boolean;
  readonly submitting?: boolean;
}

export const Budgets05Screen: React.FC<Budgets05ScreenProps> = ({
  onBack,
  onSave,
  onDelete,
  onCancel,
  budget,
  demo = true,
  submitting = false,
}) => {
  const previousLimitCents = budget?.limitCents ?? DEMO_BUDGET_EDIT_DRAFT.previousLimitCents;
  const [limit, setLimit] = useState(
    demo ? String(DEMO_BUDGET_EDIT_DRAFT.limitCents / 100) : String((budget?.limitCents ?? 0) / 100),
  );
  const limitCents = Math.round(Number(limit.replace(/[^0-9]/g, '')) * 100);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
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
            amount={formatBudgetAmount(limitCents)}
            meta={
              previousLimitCents === undefined
                ? 'Límite actualizado'
                : `Antes: ${formatBudgetAmount(previousLimitCents)}`
            }
            amountSize={38}
          />
        </View>

        <View style={styles.form}>
          <BudgetFormField
            label="Categoría"
            value={budget?.category ?? DEMO_BUDGET_EDIT_DRAFT.category}
          />
          <BudgetFormField
            label="Periodo"
            value={budget?.period ?? DEMO_BUDGET_EDIT_DRAFT.period}
          />
          <BudgetFormField
            label="Límite mensual (COP)"
            value={limit}
            editable={!demo}
            onChangeText={setLimit}
          />
        </View>

        {demo ? <Text style={styles.demoHint}>
          Edición DEMO · no modifica presupuestos reales
        </Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <BudgetsActionButtons
          primaryLabel={submitting ? 'Guardando…' : 'Guardar cambios'}
          onPrimary={() => onSave?.(limitCents)}
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
