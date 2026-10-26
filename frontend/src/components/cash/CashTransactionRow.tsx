import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { CashTransaction } from '../../types/cash';
import {
  formatSignedCashAmount,
  getCashDirectionLabel,
} from '../../data/demoCash';

export interface CashTransactionRowProps {
  readonly item: CashTransaction;
  readonly variant?: 'compact' | 'history';
}

export const CashTransactionRow: React.FC<CashTransactionRowProps> = ({
  item,
  variant = 'compact',
}) => {
  const isHistory = variant === 'history';
  const isIncome = item.direction === 'income';
  const initial = item.category.charAt(0).toUpperCase();

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View
          style={[
            styles.avatar,
            isHistory ? styles.avatarHistory : null,
            { backgroundColor: isIncome ? colors.cashIncomeBg : colors.cashExpenseBg },
          ]}
        >
          <Text
            style={[
              styles.initial,
              isHistory ? styles.initialHistory : null,
              { color: isIncome ? colors.cashIncomeAlt : colors.cashExpenseText },
            ]}
          >
            {initial}
          </Text>
        </View>
        <View style={styles.texts}>
          <Text
            style={[styles.category, isHistory ? styles.categoryHistory : null]}
            numberOfLines={1}
          >
            {item.category}
          </Text>
          <Text
            style={[styles.meta, isHistory ? styles.metaHistory : null]}
          >
            {getCashDirectionLabel(item.direction)} · {item.dateLabel}
          </Text>
        </View>
      </View>
      <Text
        style={[
          styles.amount,
          isHistory ? styles.amountHistory : null,
          isIncome ? styles.amountIncome : null,
        ]}
      >
        {formatSignedCashAmount(item.amountCents, item.direction)}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHistory: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  initial: {
    fontSize: 16,
    fontWeight: '700',
  },
  initialHistory: {
    fontSize: 18,
  },
  texts: {
    flexShrink: 1,
  },
  category: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    color: colors.cashTitle,
  },
  categoryHistory: {
    fontSize: 17,
    lineHeight: 22,
  },
  meta: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    color: colors.cashMuted,
  },
  metaHistory: {
    fontSize: 14,
    lineHeight: 19,
    color: colors.cashSubtle,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.cashTitle,
    textAlign: 'right',
  },
  amountHistory: {
    fontSize: 17,
  },
  amountIncome: {
    color: colors.cashIncomeStrong,
  },
});

export default CashTransactionRow;
