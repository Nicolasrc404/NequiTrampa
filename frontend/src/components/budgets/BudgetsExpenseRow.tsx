import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { BudgetExpense } from '../../types/budgets';
import { formatBudgetExpenseAmount } from '../../data/demoBudgets';

export interface BudgetsExpenseRowProps {
  readonly expense: BudgetExpense;
}

export const BudgetsExpenseRow: React.FC<BudgetsExpenseRowProps> = ({
  expense,
}) => {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={styles.avatar}>
          <Text style={styles.initial}>
            {expense.merchant.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.texts}>
          <Text style={styles.merchant} numberOfLines={1}>
            {expense.merchant}
          </Text>
          <Text style={styles.date}>{expense.dateLabel}</Text>
        </View>
      </View>
      <Text style={styles.amount}>
        {formatBudgetExpenseAmount(expense.amountCents)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.budgetsExpenseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.budgetsExpenseText,
  },
  texts: {
    flexShrink: 1,
  },
  merchant: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.budgetsTitle,
  },
  date: {
    marginTop: 2,
    fontSize: 13,
    color: colors.budgetsMuted,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.budgetsTitle,
  },
});

export default BudgetsExpenseRow;
