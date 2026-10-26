// ============================================================
// Budgets_03 — Skeleton de Carga
// Fuente visual: Stitch screen 6f025afbd41344c6a00bb0c5eb89bb04
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import BudgetsHeader from '../../components/budgets/BudgetsHeader';
import BudgetsSkeletonCard from '../../components/budgets/BudgetsSkeletonCard';
import BottomNav from '../../components/common/BottomNav';
import { DEMO_BUDGET_MONTH } from '../../data/demoBudgets';

export interface Budgets03ScreenProps {
  readonly onBack?: () => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
}

export const Budgets03Screen: React.FC<Budgets03ScreenProps> = ({
  onBack,
  onTabPress,
}) => {
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BudgetsHeader title="Presupuestos" onBack={onBack} titleSize={24} />

        <View style={styles.monthPill}>
          <Text style={styles.monthText}>{DEMO_BUDGET_MONTH}</Text>
        </View>

        <BudgetsSkeletonCard />

        <Text style={styles.demoHint}>
          Estado de carga DEMO · sin conexión al backend
        </Text>
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
    marginTop: 18,
    marginBottom: 20,
    backgroundColor: colors.budgetsPill,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  monthText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.budgetsWhite,
    letterSpacing: 0.2,
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

export default Budgets03Screen;
