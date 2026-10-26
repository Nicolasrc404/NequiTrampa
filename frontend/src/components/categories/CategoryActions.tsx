import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../theme/colors';

export interface CategoryActionsProps {
  readonly primaryLabel: string;
  readonly onPrimary?: () => void;
  readonly secondaryLabel: string;
  readonly onSecondary?: () => void;
  readonly primaryDisabled?: boolean;
}

export const CategoryActions: React.FC<CategoryActionsProps> = ({
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  primaryDisabled = false,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.primary, primaryDisabled ? styles.primaryDisabled : null]}
        activeOpacity={primaryDisabled ? 1 : 0.85}
        onPress={primaryDisabled ? undefined : onPrimary}
        disabled={primaryDisabled}
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
      >
        <Text style={styles.primaryText}>{primaryLabel}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondary}
        activeOpacity={0.75}
        onPress={onSecondary}
        accessibilityRole="button"
        accessibilityLabel={secondaryLabel}
      >
        <Text style={styles.secondaryText}>{secondaryLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  primary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.categoriesMagenta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.categoriesMagenta,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryDisabled: {
    backgroundColor: colors.categoriesDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryText: {
    color: colors.white,
    fontSize: 16.5,
    fontWeight: '700',
  },
  secondary: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.categoriesInputBorderAlt,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.categoriesMagenta,
    fontSize: 16.5,
    fontWeight: '700',
  },
});

export default CategoryActions;
