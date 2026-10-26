import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../theme/colors';

export interface GoalsActionButtonsProps {
  readonly primaryLabel: string;
  readonly onPrimary?: () => void;
  readonly secondaryLabel?: string;
  readonly onSecondary?: () => void;
  readonly height?: number;
  readonly primaryBackground?: string;
}

export const GoalsActionButtons: React.FC<GoalsActionButtonsProps> = ({
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  height = 56,
  primaryBackground = colors.goalsMagenta,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          styles.primary,
          { height, backgroundColor: primaryBackground },
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
          style={[styles.button, styles.secondary, { height }]}
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
    borderRadius: 16,
  },
  primary: {
    backgroundColor: colors.goalsMagenta,
    shadowColor: colors.goalsShadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  primaryText: {
    color: colors.goalsWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.goalsSecondaryBorder,
  },
  secondaryText: {
    color: colors.goalsMagenta,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GoalsActionButtons;
