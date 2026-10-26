import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { RechargeResult } from '../../types/recharges';
import { formatRechargeAmount } from '../../data/demoRecharges';

export interface RechargeSuccessCardProps {
  readonly result: RechargeResult;
}

export const RechargeSuccessCard: React.FC<RechargeSuccessCardProps> = ({
  result,
}) => {
  const rows = [
    { label: 'Referencia', value: result.reference },
    { label: 'Fecha', value: result.occurredAtLabel },
    {
      label: 'Saldo después',
      value: formatRechargeAmount(result.balanceAfterCents),
    },
  ];

  return (
    <View style={styles.card}>
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={[
            styles.row,
            index < rows.length - 1 ? styles.rowDivider : null,
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
    backgroundColor: colors.rechargesWhite,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: colors.rechargesCardBorder,
    shadowColor: colors.rechargesShadow,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 16,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.rechargesCardBorder,
  },
  label: {
    fontSize: 15,
    color: colors.rechargesSubtle,
  },
  value: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.rechargesDark,
    textAlign: 'right',
    letterSpacing: -0.2,
  },
});

export default RechargeSuccessCard;
