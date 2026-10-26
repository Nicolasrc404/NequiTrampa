import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../theme/colors';
import { CashFilter } from '../../types/cash';

export interface CashFilterPillsProps {
  readonly selected: CashFilter;
  readonly onChange: (filter: CashFilter) => void;
}

const FILTERS: { key: CashFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'income', label: 'Ingresos' },
  { key: 'expense', label: 'Gastos' },
];

export const CashFilterPills: React.FC<CashFilterPillsProps> = ({
  selected,
  onChange,
}) => {
  return (
    <View style={styles.container}>
      {FILTERS.map((filter) => {
        const isSelected = selected === filter.key;
        return (
          <TouchableOpacity
            key={filter.key}
            style={[styles.pill, isSelected ? styles.pillSelected : null]}
            activeOpacity={0.8}
            onPress={() => onChange(filter.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={[
                styles.label,
                isSelected ? styles.labelSelected : null,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pill: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.cashWhite,
    shadowColor: colors.cashShadow,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pillSelected: {
    backgroundColor: colors.cashDarkAlt,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.cashMutedAlt,
  },
  labelSelected: {
    color: colors.cashWhite,
  },
});

export default CashFilterPills;
