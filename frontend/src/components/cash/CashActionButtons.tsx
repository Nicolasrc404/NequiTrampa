import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../theme/colors';

export interface CashActionButtonsProps {
  readonly primaryLabel: string;
  readonly onPrimary?: () => void;
  readonly secondaryLabel?: string;
  readonly onSecondary?: () => void;
  readonly height?: number;
  readonly radius?: number;
  readonly gap?: number;
  readonly secondaryBorderColor?: string;
  readonly primaryFontSize?: number;
  readonly secondaryFontSize?: number;
  readonly primaryFontWeight?: '500' | '600' | '700' | '800';
  readonly secondaryFontWeight?: '500' | '600' | '700' | '800';
}

export const CashActionButtons: React.FC<CashActionButtonsProps> = ({
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  height = 56,
  radius = 16,
  gap = 12,
  secondaryBorderColor = colors.cashBorder,
  primaryFontSize = 17,
  secondaryFontSize = 17,
  primaryFontWeight = '600',
  secondaryFontWeight = '600',
}) => {
  return (
    <View style={{ gap }}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            height,
            borderRadius: radius,
            backgroundColor: colors.cashMagenta,
          },
        ]}
        activeOpacity={0.85}
        onPress={onPrimary}
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
      >
        <Text
          style={[
            styles.primaryText,
            { fontSize: primaryFontSize, fontWeight: primaryFontWeight },
          ]}
        >
          {primaryLabel}
        </Text>
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
          <Text
            style={[
              styles.secondaryText,
              { fontSize: secondaryFontSize, fontWeight: secondaryFontWeight },
            ]}
          >
            {secondaryLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.cashMagenta,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryText: {
    color: colors.cashWhite,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  secondaryText: {
    color: colors.cashMagenta,
  },
});

export default CashActionButtons;
