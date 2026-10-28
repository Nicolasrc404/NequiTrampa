import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { RechargeItem } from '../../types/recharges';
import { formatRechargeAmount } from '../../data/demoRecharges';

export interface RechargeHistoryRowProps {
  readonly item: RechargeItem;
}

export const RechargeHistoryRow: React.FC<RechargeHistoryRowProps> = ({
  item,
}) => {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={styles.iconCircle}>
          <Feather name="plus" size={19} color={colors.rechargesMintText} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{item.statusLabel}</Text>
          <Text style={styles.date}>{item.occurredAtLabel}</Text>
        </View>
      </View>
      <Text style={styles.amount}>+ {formatRechargeAmount(item.amountCents)}</Text>
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
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.rechargesMintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flexShrink: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.rechargesDark,
    lineHeight: 21,
  },
  date: {
    marginTop: 2,
    fontSize: 12,
    color: colors.rechargesSubtle,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.rechargesMintText,
    textAlign: 'right',
  },
});

export default RechargeHistoryRow;
