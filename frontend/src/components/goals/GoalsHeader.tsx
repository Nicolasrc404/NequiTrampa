import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';

export interface GoalsHeaderProps {
  readonly title: string;
  readonly onBack?: () => void;
  readonly titleSize?: number;
}

export const GoalsHeader: React.FC<GoalsHeaderProps> = ({
  title,
  onBack,
  titleSize = 26,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        activeOpacity={0.75}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <Feather name="chevron-left" size={22} color={colors.goalsDark} />
      </TouchableOpacity>
      <Text
        style={[styles.title, { fontSize: titleSize }]}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.goalsWhite,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.goalsShadow,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    flex: 1,
    fontWeight: '700',
    color: colors.goalsDark,
    letterSpacing: -0.5,
  },
});

export default GoalsHeader;
