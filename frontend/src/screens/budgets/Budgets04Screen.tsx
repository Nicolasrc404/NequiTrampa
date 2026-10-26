// ============================================================
// Budgets_04 — Crear presupuesto
// Fuente visual: Stitch screen 45dae96c32044afb86a682d6ce0210a0
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import BudgetsHeader from '../../components/budgets/BudgetsHeader';
import BudgetsSummaryCard from '../../components/budgets/BudgetsSummaryCard';
import BudgetFormField from '../../components/budgets/BudgetFormField';
import BudgetsActionButtons from '../../components/budgets/BudgetsActionButtons';
import {
  DEMO_BUDGET_CREATE_DRAFT,
  formatBudgetAmount,
} from '../../data/demoBudgets';

export interface Budgets04ScreenProps {
  readonly onBack?: () => void;
  readonly onCreate?: () => void;
  readonly onCancel?: () => void;
}

export const Budgets04Screen: React.FC<Budgets04ScreenProps> = ({
  onBack,
  onCreate,
  onCancel,
}) => {
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
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
            amount={formatBudgetAmount(DEMO_BUDGET_CREATE_DRAFT.limitCents)}
            meta="Te avisamos al llegar al 80%"
            amountSize={34}
          />
        </View>

        <View style={styles.form}>
          <BudgetFormField
            label="Categoría"
            value={DEMO_BUDGET_CREATE_DRAFT.category}
          />
          <BudgetFormField
            label="Periodo"
            value={DEMO_BUDGET_CREATE_DRAFT.period}
          />
        </View>

        <Text style={styles.demoHint}>
          Presupuesto DEMO · no se guardará en el servidor
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <BudgetsActionButtons
          primaryLabel="Crear presupuesto"
          onPrimary={onCreate}
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

export default Budgets04Screen;
