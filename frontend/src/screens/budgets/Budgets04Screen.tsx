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
import {
  DEMO_BUDGET_CREATE_DRAFT,
  formatBudgetAmount,
} from '../../data/demoBudgets';
import type { CreateBudgetInput } from '../../services/budgetsService';

export interface Budgets04ScreenProps {
  readonly onBack?: () => void;
  readonly onCreate?: () => void;
  readonly onCancel?: () => void;
  readonly onCreateInput?: (input: CreateBudgetInput) => void;
  readonly categoryId?: string;
  readonly categoryName?: string;
  readonly demo?: boolean;
  readonly submitting?: boolean;
}

export const Budgets04Screen: React.FC<Budgets04ScreenProps> = ({
  onBack,
  onCreate,
  onCancel,
  onCreateInput,
  categoryId,
  categoryName,
  demo = true,
  submitting = false,
}) => {
  const [limit, setLimit] = useState(demo ? String(DEMO_BUDGET_CREATE_DRAFT.limitCents / 100) : '');
  const period = new Date().toISOString().slice(0, 7);
  const limitCents = Math.round(Number(limit.replace(/[^0-9]/g, '')) * 100);
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
            amount={formatBudgetAmount(limitCents)}
            meta="Te avisamos al llegar al 80%"
            amountSize={34}
          />
        </View>

        <View style={styles.form}>
          <BudgetFormField
            label="Categoría"
            value={categoryName ?? DEMO_BUDGET_CREATE_DRAFT.category}
          />
          <BudgetFormField
            label="Periodo"
            value={demo ? DEMO_BUDGET_CREATE_DRAFT.period : period}
          />
          <BudgetFormField
            label="Límite mensual (COP)"
            value={limit}
            placeholder="Ej. 500000"
            editable={!demo}
            onChangeText={setLimit}
          />
        </View>

        {demo ? <Text style={styles.demoHint}>
          Presupuesto DEMO · no se guardará en el servidor
        </Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <BudgetsActionButtons
          primaryLabel={submitting ? 'Guardando…' : 'Crear presupuesto'}
          onPrimary={onCreateInput
            ? () => onCreateInput({ categoryId: categoryId ?? '', period, limitCents })
            : onCreate}
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
