import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../theme/colors';
import {
  DEMO_RECHARGE_PRESETS,
  formatRechargeAmount,
} from '../../data/demoRecharges';

export interface RechargeAmountPillsProps {
  readonly selectedAmountCents: number;
  readonly onChange?: (amountCents: number) => void;
}

export const RechargeAmountPills: React.FC<RechargeAmountPillsProps> = ({
  selectedAmountCents,
  onChange,
}) => {
  return (
    <View style={styles.container}>
      {DEMO_RECHARGE_PRESETS.map((preset) => {
        const isSelected = preset.amountCents === selectedAmountCents;
        return (
          <TouchableOpacity
            key={preset.amountCents}
            style={[styles.pill, isSelected ? styles.pillSelected : null]}
            activeOpacity={0.8}
            onPress={() => onChange?.(preset.amountCents)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Recargar ${formatRechargeAmount(preset.amountCents)}`}
          >
            <Text
              style={[
                styles.label,
                isSelected ? styles.labelSelected : null,
              ]}
            >
              {formatRechargeAmount(preset.amountCents)}
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
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.rechargesWhite,
    shadowColor: colors.rechargesShadow,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pillSelected: {
    backgroundColor: colors.rechargesDarkPill,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.rechargesDark,
  },
  labelSelected: {
    color: colors.rechargesWhite,
  },
});

export default RechargeAmountPills;
