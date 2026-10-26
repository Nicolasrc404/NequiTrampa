import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';

export interface BudgetsMetricRow {
  readonly label: string;
  readonly value: string;
}

export interface BudgetsMetricsCardProps {
  readonly rows: readonly BudgetsMetricRow[];
}

export const BudgetsMetricsCard: React.FC<BudgetsMetricsCardProps> = ({
  rows,
}) => {
  return (
    <View style={styles.card}>
      {rows.map((row, index) => (
        <View
          key={`${row.label}-${index}`}
          style={[
            styles.row,
            index < rows.length - 1 ? styles.divider : null,
          ]}
        >
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.budgetsWhite,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 4,
    shadowColor: colors.budgetsShadow,
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.budgetsDivider,
  },
  label: {
    fontSize: 15,
    color: colors.budgetsMuted,
  },
  value: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.budgetsTitle,
    textAlign: 'right',
  },
});

export default BudgetsMetricsCard;
