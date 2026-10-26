import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';

export interface BudgetsHeaderProps {
  readonly title: string;
  readonly onBack?: () => void;
  readonly titleSize?: number;
  readonly rightLabel?: string;
  readonly onRight?: () => void;
  readonly rightColor?: string;
}

export const BudgetsHeader: React.FC<BudgetsHeaderProps> = ({
  title,
  onBack,
  titleSize = 22,
  rightLabel,
  onRight,
  rightColor = colors.budgetsMagenta,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        activeOpacity={0.7}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <Feather name="chevron-left" size={22} color={colors.budgetsTitle} />
      </TouchableOpacity>

      <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>
        {title}
      </Text>

      {rightLabel ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRight}
          accessibilityRole="button"
          accessibilityLabel={rightLabel}
        >
          <Text style={[styles.rightLabel, { color: rightColor }]}>
            {rightLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.budgetsWhite,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.budgetsShadow,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    flex: 1,
    fontWeight: '700',
    color: colors.budgetsTitle,
    letterSpacing: -0.4,
  },
  rightLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default BudgetsHeader;
