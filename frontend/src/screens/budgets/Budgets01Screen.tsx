// ============================================================
// Budgets_01 — Presupuestos
// Fuente visual: Stitch screen 44ff8c05c54b40c1899a933675349b7d
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import BudgetsHeader from '../../components/budgets/BudgetsHeader';
import BudgetsProgressItem from '../../components/budgets/BudgetsProgressItem';
import BottomNav from '../../components/common/BottomNav';
import { DEMO_BUDGETS, DEMO_BUDGET_MONTH } from '../../data/demoBudgets';
import type { BudgetItem } from '../../types/budgets';

export interface Budgets01ScreenProps {
  readonly onBack?: () => void;
  readonly onCreate?: () => void;
  readonly onSelectBudget?: (budget: BudgetItem) => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
  /** Presupuestos confirmados por el backend. Si se omite, se usa el DEMO. */
  readonly budgets?: readonly BudgetItem[];
  /** Etiqueta del periodo consultado (por ejemplo, «Octubre 2026»). */
  readonly monthLabel?: string;
  /** Alias de `monthLabel` usado por pantallas heredadas. */
  readonly periodLabel?: string;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Budgets01Screen: React.FC<Budgets01ScreenProps> = ({
  onBack,
  onCreate,
  onSelectBudget,
  onTabPress,
  budgets = DEMO_BUDGETS,
  monthLabel,
  periodLabel = DEMO_BUDGET_MONTH,
  demo = true,
}) => {
  const items = budgets ?? DEMO_BUDGETS;
  const monthLabelText = monthLabel ?? periodLabel;
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BudgetsHeader
          title="Presupuestos"
          onBack={onBack}
          rightLabel="Crear"
          onRight={onCreate}
        />

        <View style={styles.monthPill}>
          <Text style={styles.monthText}>{monthLabelText}</Text>
        </View>

        <View style={styles.card}>
          {items.length === 0 ? (
            <Text style={styles.emptyText}>
              Aún no tienes presupuestos para este periodo.
            </Text>
          ) : (
            items.map((budget) => (
              <BudgetsProgressItem
                key={budget.id}
                item={budget}
                onPress={onSelectBudget}
              />
            ))
          )}
        </View>

        {demo ? (
          <Text style={styles.demoHint}>
            Presupuestos DEMO · no representan tu cuenta real
          </Text>
        ) : null}
      </ScrollView>

      <BottomNav activeTab="inicio" onTabPress={onTabPress} />
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
    paddingBottom: 104,
  },
  monthPill: {
    alignSelf: 'flex-start',
    marginTop: 22,
    backgroundColor: colors.budgetsTitle,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.budgetsWhite,
  },
  card: {
    marginTop: 20,
    backgroundColor: colors.budgetsWhite,
    borderRadius: 26,
    padding: 20,
    gap: 24,
    shadowColor: colors.budgetsShadow,
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.budgetsMuted,
    textAlign: 'center',
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
});

export default Budgets01Screen;
