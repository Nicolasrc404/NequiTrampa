// ============================================================
// Budgets_07 — Advertencia umbral 80%
// Fuente visual: Stitch screen 525d61fe018d4083907d6d5b80e315d2
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import BudgetsHeader from '../../components/budgets/BudgetsHeader';
import BudgetsSummaryCard from '../../components/budgets/BudgetsSummaryCard';
import BudgetsMetricsCard from '../../components/budgets/BudgetsMetricsCard';
import BudgetsActionButtons from '../../components/budgets/BudgetsActionButtons';
import {
  DEMO_BUDGET_WARNING,
  formatBudgetAmount,
} from '../../data/demoBudgets';

export interface Budgets07ScreenProps {
  readonly onBack?: () => void;
  readonly onEdit?: () => void;
  readonly onRegisterExpense?: () => void;
}

export const Budgets07Screen: React.FC<Budgets07ScreenProps> = ({
  onBack,
  onEdit,
  onRegisterExpense,
}) => {
  const budget = DEMO_BUDGET_WARNING;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BudgetsHeader
          title={budget.category}
          onBack={onBack}
          rightLabel="Editar"
          onRight={onEdit}
        />

        <View style={styles.alert}>
          <Text style={styles.alertText}>
            Llevas el {budget.percent}% de tu presupuesto de {budget.category}.
            Te quedan {formatBudgetAmount(budget.remainingCents)} para{' '}
            {budget.daysRemaining} días.
          </Text>
        </View>

        <BudgetsSummaryCard
          label="Te quedan"
          amount={formatBudgetAmount(budget.remainingCents)}
          meta={`de ${formatBudgetAmount(budget.limitCents)} · ${budget.periodLabel} · ${budget.percent}% usado`}
        />

        <View style={styles.metrics}>
          <BudgetsMetricsCard
            rows={[
              { label: 'Gastado', value: formatBudgetAmount(budget.spentCents) },
              { label: 'Límite', value: formatBudgetAmount(budget.limitCents) },
              { label: 'Días restantes', value: String(budget.daysRemaining) },
              {
                label: 'Sugerido por día',
                value: formatBudgetAmount(budget.dailySuggestedCents),
              },
            ]}
          />
        </View>

        <Text style={styles.demoHint}>
          Advertencia DEMO · umbral simulado al 80%
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <BudgetsActionButtons
          primaryLabel="Registrar gasto"
          onPrimary={onRegisterExpense}
          primaryBackground={colors.budgetsMagentaSoft}
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
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 18,
  },
  alert: {
    marginTop: 24,
    marginBottom: 16,
    backgroundColor: colors.budgetsAlertBg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  alertText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.budgetsAlertText,
  },
  metrics: {
    marginTop: 16,
  },
  demoHint: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.budgetsMuted,
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
});

export default Budgets07Screen;
