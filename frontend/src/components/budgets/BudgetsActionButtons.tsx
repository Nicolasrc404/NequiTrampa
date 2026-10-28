import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../theme/colors';

export interface BudgetsActionButtonsProps {
  readonly primaryLabel: string;
  readonly onPrimary?: () => void;
  readonly secondaryLabel?: string;
  readonly onSecondary?: () => void;
  readonly height?: number;
  readonly radius?: number;
  readonly primaryBackground?: string;
  readonly secondaryBorderColor?: string;
}

export const BudgetsActionButtons: React.FC<BudgetsActionButtonsProps> = ({
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  height = 56,
  radius = 16,
  primaryBackground = colors.budgetsMagenta,
  secondaryBorderColor = colors.budgetsInputBorder,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            height,
            borderRadius: radius,
            backgroundColor: primaryBackground,
          },
        ]}
        activeOpacity={0.85}
        onPress={onPrimary}
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
      >
        <Text style={styles.primaryText}>{primaryLabel}</Text>
      </TouchableOpacity>

      {secondaryLabel ? (
        <TouchableOpacity
          style={[
            styles.button,
            styles.secondary,
            { height, borderRadius: radius, borderColor: secondaryBorderColor },
          ]}
          activeOpacity={0.8}
          onPress={onSecondary}
          accessibilityRole="button"
          accessibilityLabel={secondaryLabel}
        >
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.budgetsMagenta,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryText: {
    color: colors.budgetsWhite,
    fontSize: 16.5,
    fontWeight: '700',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  secondaryText: {
    color: colors.budgetsMagenta,
    fontSize: 16.5,
    fontWeight: '600',
  },
});

export default BudgetsActionButtons;
