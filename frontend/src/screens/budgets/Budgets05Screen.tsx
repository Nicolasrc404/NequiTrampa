// ============================================================
// Budgets_05 — Editar presupuesto
// Fuente visual: Stitch screen cfc2f2da5cf74539ace456c098e71143
// ============================================================
import React from 'react';
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

export interface Budgets05ScreenProps {
  readonly onBack?: () => void;
  readonly onSave?: () => void;
  readonly onDelete?: () => void;
  readonly onCancel?: () => void;
}

export const Budgets05Screen: React.FC<Budgets05ScreenProps> = ({
  onBack,
  onSave,
  onDelete,
  onCancel,
}) => {
  const previousLimitCents = DEMO_BUDGET_EDIT_DRAFT.previousLimitCents;

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
          rightLabel="Eliminar"
          onRight={onDelete}
        />

        <View style={styles.summary}>
          <BudgetsSummaryCard
            label="Límite mensual"
            amount={formatBudgetAmount(DEMO_BUDGET_EDIT_DRAFT.limitCents)}
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
            value={DEMO_BUDGET_EDIT_DRAFT.category}
          />
          <BudgetFormField
            label="Periodo"
            value={DEMO_BUDGET_EDIT_DRAFT.period}
          />
        </View>

        <Text style={styles.demoHint}>
          Edición DEMO · no modifica presupuestos reales
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <BudgetsActionButtons
          primaryLabel="Guardar cambios"
          onPrimary={onSave}
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
