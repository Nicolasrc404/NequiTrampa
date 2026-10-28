import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { GoalItem } from '../../types/goals';
import { formatGoalAmount } from '../../data/demoGoals';

export interface GoalSummaryCardProps {
  readonly goal: GoalItem;
  readonly titleSize?: number;
  readonly padding?: number;
  readonly trackHeight?: number;
  readonly amountSize?: number;
}

export const GoalSummaryCard: React.FC<GoalSummaryCardProps> = ({
  goal,
  titleSize = 17,
  padding = 24,
  trackHeight = 6,
  amountSize = 15,
}) => {
  const progressWidth = `${Math.min(Math.max(goal.percent, 0), 100)}%` as const;

  return (
    <View style={[styles.card, { padding }]}>
      <View style={styles.headingRow}>
        <Text style={[styles.name, { fontSize: titleSize }]} numberOfLines={1}>
          {goal.name}
        </Text>
        <Text style={styles.percent}>{goal.percent}%</Text>
      </View>

      <Text style={[styles.amount, { fontSize: amountSize }]}>
        {formatGoalAmount(goal.savedCents)} /{' '}
        {formatGoalAmount(goal.targetCents)}
      </Text>

      <View style={[styles.track, { height: trackHeight }]}>
        <View style={[styles.fill, { width: progressWidth }]} />
      </View>

      <Text style={styles.meta}>Fecha objetivo · {goal.targetDateLabel}</Text>
      <Text style={styles.metaMuted}>{goal.currencyLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.goalsWhite,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.goalsCardBorderSoft,
    shadowColor: colors.goalsShadow,
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  name: {
    flexShrink: 1,
    fontWeight: '700',
    color: colors.goalsDark,
    letterSpacing: -0.2,
  },
  percent: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.goalsMagenta,
  },
  amount: {
    marginBottom: 14,
    fontWeight: '700',
    color: colors.goalsDark,
    letterSpacing: 0.2,
  },
  track: {
    borderRadius: 999,
    backgroundColor: colors.goalsBarTrack,
    overflow: 'hidden',
    marginBottom: 16,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.goalsMagenta,
  },
  meta: {
    marginBottom: 4,
    fontSize: 13,
    color: colors.goalsMuted,
  },
  metaMuted: {
    fontSize: 13,
    color: colors.goalsMutedAlt,
  },
});

export default GoalSummaryCard;
