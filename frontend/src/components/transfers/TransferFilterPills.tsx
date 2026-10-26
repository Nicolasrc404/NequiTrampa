import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../theme/colors';
import { TransferFilter } from '../../types/transfers';

export interface TransferFilterPillsProps {
  readonly selected: TransferFilter;
  readonly onChange: (filter: TransferFilter) => void;
}

const FILTERS: { key: TransferFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'sent', label: 'Enviadas' },
  { key: 'received', label: 'Recibidas' },
];

export const TransferFilterPills: React.FC<TransferFilterPillsProps> = ({
  selected,
  onChange,
}) => {
  return (
    <View style={styles.container}>
      {FILTERS.map((filter) => {
        const active = selected === filter.key;
        return (
          <TouchableOpacity
            key={filter.key}
            style={[styles.pill, active ? styles.pillActive : styles.pillIdle]}
            activeOpacity={0.8}
            onPress={() => onChange(filter.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Filtrar ${filter.label}`}
          >
            <Text
              style={[
                styles.text,
                active ? styles.textActive : styles.textIdle,
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
    gap: 10,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.transfersDarkAlt,
    shadowColor: colors.transfersShadow,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  pillIdle: {
    backgroundColor: colors.white,
    shadowColor: colors.transfersShadow,
    shadowOpacity: 0.02,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  text: {
    fontSize: 14.5,
  },
  textActive: {
    color: colors.white,
    fontWeight: '600',
  },
  textIdle: {
    color: colors.transfersDarkList,
    fontWeight: '500',
  },
});

export default TransferFilterPills;
