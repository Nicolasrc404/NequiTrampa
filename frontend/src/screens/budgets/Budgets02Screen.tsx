// ============================================================
// Budgets_02 — Aún no tienes presupuestos (Empty State)
// Fuente visual: Stitch screen 543a8e7089684deb8c147d2f81d89401
// ============================================================
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import BudgetsHeader from '../../components/budgets/BudgetsHeader';
import BudgetsActionButtons from '../../components/budgets/BudgetsActionButtons';
import BottomNav from '../../components/common/BottomNav';

export interface Budgets02ScreenProps {
  readonly onBack?: () => void;
  readonly onCreate?: () => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Budgets02Screen: React.FC<Budgets02ScreenProps> = ({
  onBack,
  onCreate,
  onTabPress,
  demo = true,
}) => {
  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <BudgetsHeader title="Presupuestos" onBack={onBack} titleSize={23} />
      </View>

      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <Feather
            name="bar-chart-2"
            size={38}
            color={colors.budgetsLavenderIcon}
          />
        </View>
        <Text style={styles.title}>Aún no tienes presupuestos</Text>
        <Text style={styles.description}>
          Define cuánto quieres gastar por categoría y te avisamos cuando te
          acerques al límite.
        </Text>
        {demo ? (
          <Text style={styles.demoHint}>
            Estado DEMO · no hay presupuestos reales
          </Text>
        ) : null}
      </View>

      <View style={styles.actionBlock}>
        <BudgetsActionButtons
          primaryLabel="Crear presupuesto"
          onPrimary={onCreate}
          height={56}
          radius={16}
          secondaryBorderColor={colors.budgetsBorderOutline}
        />
      </View>

      <BottomNav activeTab="inicio" onTabPress={onTabPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.budgetsBgAlt,
  },
  top: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.budgetsLavender,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '700',
    color: colors.budgetsTitleAlt,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  description: {
    maxWidth: 310,
    fontSize: 15,
    lineHeight: 23,
    color: colors.budgetsMuted,
    textAlign: 'center',
  },
  demoHint: {
    marginTop: 18,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.budgetsMuted,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  actionBlock: {
    paddingHorizontal: 20,
    paddingBottom: 88,
  },
});

export default Budgets02Screen;
