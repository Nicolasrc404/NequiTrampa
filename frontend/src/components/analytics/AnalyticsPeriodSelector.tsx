import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';

export interface AnalyticsPeriodSelectorProps {
  readonly periodLabel?: string;
  readonly periodValue?: string;
  readonly onPress?: () => void;
}

export const AnalyticsPeriodSelector: React.FC<AnalyticsPeriodSelectorProps> = ({
  periodLabel = 'Periodo',
  periodValue = 'Septiembre de 2026',
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Seleccionar periodo actual: ${periodValue}`}
    >
      <View style={styles.textContainer}>
        <Text style={styles.label}>{periodLabel}</Text>
        <Text style={styles.value}>{periodValue}</Text>
      </View>
      <Feather name="chevron-down" size={18} color={colors.analyticsTextDark} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(216, 212, 232, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  textContainer: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.analyticsMuted,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.analyticsTextDark,
  },
});

export default AnalyticsPeriodSelector;
