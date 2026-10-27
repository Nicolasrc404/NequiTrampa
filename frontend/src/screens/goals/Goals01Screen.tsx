import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import GoalProgressCard from '../../components/goals/GoalProgressCard';
import BottomNav from '../../components/common/BottomNav';
import { DEMO_GOALS } from '../../data/demoGoals';
import type { GoalItem } from '../../types/goals';

export interface Goals01ScreenProps {
  readonly onBack?: () => void;
  readonly onCreate?: () => void;
  readonly onSelectGoal?: (goal: GoalItem) => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
  /** Metas confirmadas por el backend. Si se omite, se usa el DEMO. */
  readonly goals?: readonly GoalItem[];
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Goals01Screen: React.FC<Goals01ScreenProps> = ({
  onBack,
  onCreate,
  onSelectGoal,
  onTabPress,
  goals = DEMO_GOALS,
  demo = true,
}) => {
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.75}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Feather name="chevron-left" size={22} color={colors.goalsDark} />
        </TouchableOpacity>

        <Text style={styles.title}>Mis metas</Text>
        <Text style={styles.subtitle}>Así van tus metas financieras.</Text>

        <View style={styles.list}>
          {goals.length === 0 ? (
            <Text style={styles.emptyText}>
              Aún no tienes metas. Crea la primera para empezar a ahorrar.
            </Text>
          ) : (
            goals.map((goal) => (
              <GoalProgressCard
                key={goal.id}
                goal={goal}
                onPress={onSelectGoal}
              />
            ))
          )}
        </View>

        <TouchableOpacity
          style={styles.createButton}
          activeOpacity={0.85}
          onPress={onCreate}
          accessibilityRole="button"
          accessibilityLabel="Crear meta"
        >
          <Text style={styles.createText}>Crear meta</Text>
        </TouchableOpacity>

        {demo ? (
          <Text style={styles.demoHint}>
            Metas DEMO · no representan tu cuenta real
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
    backgroundColor: colors.goalsBg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 108,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.goalsWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.goalsShadow,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.goalsDark,
    letterSpacing: -0.7,
    lineHeight: 37,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 17,
    color: colors.goalsMuted,
    lineHeight: 24,
  },
  list: {
    marginTop: 24,
    gap: 16,
  },
  createButton: {
    height: 56,
    marginTop: 32,
    borderRadius: 16,
    backgroundColor: colors.goalsMagenta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.goalsShadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  createText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.goalsWhite,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.goalsMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  demoHint: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.goalsMuted,
    textTransform: 'uppercase',
  },
});

export default Goals01Screen;
