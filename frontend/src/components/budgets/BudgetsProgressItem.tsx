import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { BudgetItem } from '../../types/budgets';
import { formatBudgetAmount } from '../../data/demoBudgets';

export interface BudgetsProgressItemProps {
  readonly item: BudgetItem;
  readonly onPress?: () => void;
}

const getProgressColor = (item: BudgetItem): string => {
  if (item.health === 'exceeded') {
    return colors.budgetsRed;
  }
  if (item.health === 'warning') {
    return colors.budgetsOcre;
  }
  return colors.budgetsGreen;
};

export const BudgetsProgressItem: React.FC<BudgetsProgressItemProps> = ({
  item,
  onPress,
}) => {
  const progressColor = getProgressColor(item);
  const progressWidth = `${Math.min(Math.max(item.percent, 0), 100)}%` as const;

  return (
    <Pressable style={styles.container} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={styles.topRow}>
        <View style={styles.labels}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.amounts}>
            {formatBudgetAmount(item.spentCents)} de{' '}
            {formatBudgetAmount(item.limitCents)}
          </Text>
        </View>
        <Text style={[styles.percent, { color: progressColor }]}>
          {item.percent}%
        </Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: progressWidth, backgroundColor: progressColor },
          ]}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 9,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  labels: {
    flexShrink: 1,
  },
  category: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
    color: colors.budgetsTitle,
    marginBottom: 3,
  },
  amounts: {
    fontSize: 13,
    lineHeight: 17,
    color: colors.budgetsMuted,
  },
  percent: {
    fontSize: 16,
    fontWeight: '700',
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.budgetsProgressTrack,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});

export default BudgetsProgressItem;
