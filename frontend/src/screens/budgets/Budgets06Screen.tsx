// ============================================================
// Budgets_06 — Detalle del presupuesto Mercado
// Fuente visual: Stitch screen bbc2ab9fa6514cc696ee9473f774363c
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import BudgetsHeader from '../../components/budgets/BudgetsHeader';
import BudgetsSummaryCard from '../../components/budgets/BudgetsSummaryCard';
import BudgetsMetricsCard from '../../components/budgets/BudgetsMetricsCard';
import BudgetsExpenseRow from '../../components/budgets/BudgetsExpenseRow';
import BudgetsActionButtons from '../../components/budgets/BudgetsActionButtons';
import LoadingState from '../../components/common/states/LoadingState';
import {
  DEMO_BUDGET_DETAIL,
  formatBudgetAmount,
} from '../../data/demoBudgets';
import type { BudgetDetail } from '../../types/budgets';

export interface Budgets06ScreenProps {
  readonly onBack?: () => void;
  readonly onEdit?: () => void;
  readonly onRegisterExpense?: () => void;
  readonly budget?: BudgetDetail;
  readonly loading?: boolean;
  readonly demo?: boolean;
}

export const Budgets06Screen: React.FC<Budgets06ScreenProps> = ({
  onBack,
  onEdit,
  onRegisterExpense,
  budget: sourceBudget,
  loading = false,
  demo = true,
}) => {
  if (loading) {
    return <LoadingState message="Cargando presupuesto…" hint="Consultando consumo confirmado." />;
  }
  const budget = sourceBudget ?? DEMO_BUDGET_DETAIL;

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

        <View style={styles.hero}>
          <BudgetsSummaryCard
            label="Te quedan"
            amount={formatBudgetAmount(budget.remainingCents)}
            meta={`de ${formatBudgetAmount(budget.limitCents)} · ${budget.periodLabel} · ${budget.percent}% usado`}
          />
        </View>

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

        <Text style={styles.sectionTitle}>Últimos gastos</Text>

        <View style={styles.expensesCard}>
          {budget.expenses.map((expense, index) => (
            <View
              key={expense.id}
              style={[
                styles.expenseRow,
                index < budget.expenses.length - 1 ? styles.divider : null,
              ]}
            >
              <BudgetsExpenseRow expense={expense} />
            </View>
          ))}
        </View>

        {demo ? <Text style={styles.demoHint}>
          Detalle DEMO · no representa tu presupuesto real
        </Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <BudgetsActionButtons
          primaryLabel="Registrar gasto"
          onPrimary={onRegisterExpense}
          primaryBackground={colors.budgetsMagentaAlt}
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
  hero: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 4,
    fontSize: 19,
    fontWeight: '700',
    color: colors.budgetsTitle,
    letterSpacing: -0.2,
  },
  expensesCard: {
    backgroundColor: colors.budgetsWhite,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 4,
    shadowColor: colors.budgetsShadow,
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  expenseRow: {
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.budgetsDivider,
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

export default Budgets06Screen;
