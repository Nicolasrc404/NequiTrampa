import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import colors from '../../theme/colors';
import { MovementFilter } from '../../types/movements';

interface FilterPillsProps {
  selectedFilter: MovementFilter;
  onSelectFilter: (filter: MovementFilter) => void;
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  selectedFilter,
  onSelectFilter,
}) => {
  const pills: { key: MovementFilter; label: string }[] = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'ENVIADOS', label: 'Enviados' },
    { key: 'RECIBIDOS', label: 'Recibidos' },
    { key: 'RECARGAS', label: 'Recargas' },
  ];

  return (
    <View style={styles.container}>
      {pills.map((p) => {
        const isActive = selectedFilter === p.key;
        return (
          <TouchableOpacity
            key={p.key}
            activeOpacity={0.8}
            onPress={() => onSelectFilter(p.key)}
            style={[
              styles.pill,
              isActive ? styles.pillActive : styles.pillInactive,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                isActive ? styles.pillTextActive : styles.pillTextInactive,
              ]}
            >
              {p.label}
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
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  pillActive: {
    backgroundColor: colors.navy,
  },
  pillInactive: {
    backgroundColor: colors.white,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  pillTextActive: {
    color: colors.white,
  },
  pillTextInactive: {
    color: colors.navy,
  },
});

export default FilterPills;
