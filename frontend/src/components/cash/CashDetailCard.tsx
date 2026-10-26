import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';

export interface CashDetailRow {
  readonly label: string;
  readonly value: string;
  readonly strong?: boolean;
}

export interface CashDetailCardProps {
  readonly rows: readonly CashDetailRow[];
}

export const CashDetailCard: React.FC<CashDetailCardProps> = ({ rows }) => {
  return (
    <View style={styles.card}>
      {rows.map((row, index) => (
        <View
          key={`${row.label}-${index}`}
          style={[styles.row, index < rows.length - 1 ? styles.divider : null]}
        >
          <Text style={styles.label}>{row.label}</Text>
          <Text
            style={[styles.value, row.strong ? styles.valueStrong : null]}
            numberOfLines={2}
          >
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.cashWhite,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.cashBorderCard,
    shadowColor: colors.cashShadow,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    gap: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cashDetailBorder,
  },
  label: {
    fontSize: 14.5,
    color: colors.cashSubtle,
  },
  value: {
    flexShrink: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.cashTitle,
    textAlign: 'right',
  },
  valueStrong: {
    fontWeight: '800',
  },
});

export default CashDetailCard;
