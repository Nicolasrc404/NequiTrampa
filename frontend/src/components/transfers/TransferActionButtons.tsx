import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../theme/colors';

export interface TransferActionButtonsProps {
  readonly primaryLabel: string;
  readonly onPrimary?: () => void;
  readonly secondaryLabel?: string;
  readonly onSecondary?: () => void;
  readonly disabled?: boolean;
}

export const TransferActionButtons: React.FC<TransferActionButtonsProps> = ({
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.primary, disabled ? styles.disabled : null]}
        activeOpacity={disabled ? 1 : 0.85}
        onPress={disabled ? undefined : onPrimary}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
      >
        <Text style={styles.primaryText}>{primaryLabel}</Text>
      </TouchableOpacity>

      {secondaryLabel ? (
        <TouchableOpacity
          style={styles.secondary}
          activeOpacity={0.75}
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
  primary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.transfersMagenta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.transfersMagenta,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
    borderColor: colors.transfersInputBorder,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.transfersMagenta,
    fontSize: 16.5,
    fontWeight: '600',
  },
  disabled: {
    backgroundColor: colors.categoriesDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default TransferActionButtons;
