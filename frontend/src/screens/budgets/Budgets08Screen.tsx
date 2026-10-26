// ============================================================
// Budgets_08 — Presupuesto Ocio superado
// Fuente visual: Stitch screen 570349bad93743e4bf19170d0b38eeb2
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import BudgetsHeader from '../../components/budgets/BudgetsHeader';
import BudgetsSummaryCard from '../../components/budgets/BudgetsSummaryCard';
import BudgetsMetricsCard from '../../components/budgets/BudgetsMetricsCard';
import BudgetsActionButtons from '../../components/budgets/BudgetsActionButtons';
import {
  DEMO_BUDGET_EXCEEDED,
  formatBudgetAmount,
  formatBudgetOverage,
} from '../../data/demoBudgets';

export interface Budgets08ScreenProps {
  readonly onBack?: () => void;
  readonly onEdit?: () => void;
  readonly onAdjustLimit?: () => void;
  readonly onViewExpenses?: () => void;
}

export const Budgets08Screen: React.FC<Budgets08ScreenProps> = ({
  onBack,
  onEdit,
  onAdjustLimit,
  onViewExpenses,
}) => {
  const budget = DEMO_BUDGET_EXCEEDED;

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
            Superaste tu presupuesto de {budget.category} por{' '}
            {formatBudgetAmount(Math.abs(budget.remainingCents))}.
          </Text>
        </View>

        <BudgetsSummaryCard
          label="Te pasaste"
          amount={formatBudgetOverage(budget.remainingCents)}
          meta={`de ${formatBudgetAmount(budget.limitCents)} · ${budget.periodLabel} · ${budget.percent}% usado`}
          amountColor={colors.budgetsRedAlt}
          amountSize={34}
        />

        <View style={styles.metrics}>
          <BudgetsMetricsCard
            rows={[
              { label: 'Gastado', value: formatBudgetAmount(budget.spentCents) },
              { label: 'Límite', value: formatBudgetAmount(budget.limitCents) },
              { label: 'Días restantes', value: String(budget.daysRemaining) },
            ]}
          />
        </View>

        <Text style={styles.demoHint}>
          Estado DEMO · presupuesto simulado superado
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <BudgetsActionButtons
          primaryLabel="Ajustar límite"
          onPrimary={onAdjustLimit}
          secondaryLabel={`Ver gastos de ${budget.category}`}
          onSecondary={onViewExpenses}
          primaryBackground={colors.budgetsMagentaAlt}
          secondaryBorderColor={colors.budgetsExpenseBg}
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
    backgroundColor: colors.budgetsErrorBg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  alertText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
    color: colors.budgetsRedAlt,
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

export default Budgets08Screen;
