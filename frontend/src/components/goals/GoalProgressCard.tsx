import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { GoalItem } from '../../types/goals';
import { formatGoalAmount } from '../../data/demoGoals';

export interface GoalProgressCardProps {
  readonly goal: GoalItem;
}

export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ goal }) => {
  const progressWidth = `${Math.min(Math.max(goal.percent, 0), 100)}%` as const;

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <Text style={styles.name} numberOfLines={1}>
          {goal.name}
        </Text>
        <Text style={styles.percent}>{goal.percent}%</Text>
      </View>

      <Text style={styles.amount}>
        {formatGoalAmount(goal.savedCents)}{' '}
        <Text style={styles.target}>/ {formatGoalAmount(goal.targetCents)}</Text>
      </Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: progressWidth }]} />
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaText}>
          Fecha objetivo · {goal.targetDateLabel}
        </Text>
        <Text style={styles.metaText}>{goal.currencyLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.goalsWhite,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.goalsCardBorderSoft,
    padding: 24,
    shadowColor: colors.goalsShadow,
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  name: {
    flexShrink: 1,
    fontSize: 19,
    fontWeight: '700',
    color: colors.goalsDark,
    letterSpacing: -0.3,
  },
  percent: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.goalsMagenta,
  },
  amount: {
    marginBottom: 14,
    fontSize: 17,
    fontWeight: '700',
    color: colors.goalsDark,
  },
  target: {
    fontWeight: '400',
    color: colors.goalsDark,
  },
  track: {
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.goalsTrack,
    overflow: 'hidden',
    marginBottom: 16,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.goalsMagenta,
  },
  meta: {
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: colors.goalsMuted,
  },
});

export default GoalProgressCard;
