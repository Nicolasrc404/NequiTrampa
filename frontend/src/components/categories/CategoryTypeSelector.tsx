import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../theme/colors';
import { CategoryType } from '../../types/categories';

export interface CategoryTypeSelectorProps {
  readonly selected: CategoryType;
  readonly onChange?: (type: CategoryType) => void;
  readonly compact?: boolean;
}

const OPTIONS: { key: CategoryType; label: string }[] = [
  { key: 'gasto', label: 'Gasto' },
  { key: 'ingreso', label: 'Ingreso' },
];

export const CategoryTypeSelector: React.FC<CategoryTypeSelectorProps> = ({
  selected,
  onChange,
  compact = false,
}) => {
  return (
    <View style={styles.container}>
      {OPTIONS.map((option) => {
        const isActive = selected === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.pill,
              compact ? styles.pillCompact : styles.pillLarge,
              isActive ? styles.pillActive : styles.pillInactive,
            ]}
            activeOpacity={0.8}
            onPress={() => onChange?.(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Tipo ${option.label}`}
          >
            <Text
              style={[
                styles.pillText,
                isActive ? styles.pillTextActive : styles.pillTextInactive,
              ]}
            >
              {option.label}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLarge: {
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  pillCompact: {
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  pillActive: {
    backgroundColor: colors.categoriesDark,
    shadowColor: colors.categoriesShadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  pillInactive: {
    backgroundColor: colors.white,
    shadowColor: colors.categoriesShadow,
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pillText: {
    fontSize: 15,
    fontWeight: '600',
  },
  pillTextActive: {
    color: colors.white,
  },
  pillTextInactive: {
    color: colors.categoriesDark,
  },
});

export default CategoryTypeSelector;
