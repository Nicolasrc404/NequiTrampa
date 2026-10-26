import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';

export interface BudgetsSummaryCardProps {
  readonly label: string;
  readonly amount: string;
  readonly meta: string;
  readonly amountColor?: string;
  readonly amountSize?: number;
}

export const BudgetsSummaryCard: React.FC<BudgetsSummaryCardProps> = ({
  label,
  amount,
  meta,
  amountColor = colors.budgetsTitle,
  amountSize = 38,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[styles.amount, { color: amountColor, fontSize: amountSize }]}
      >
        {amount}
      </Text>
      <Text style={styles.meta}>{meta}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.budgetsWhite,
    borderRadius: 28,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: colors.budgetsShadow,
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  label: {
    fontSize: 14,
    color: colors.budgetsMuted,
    marginBottom: 4,
  },
  amount: {
    lineHeight: 46,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 6,
    textAlign: 'center',
  },
  meta: {
    fontSize: 13,
    color: colors.budgetsMuted,
    textAlign: 'center',
  },
});

export default BudgetsSummaryCard;
