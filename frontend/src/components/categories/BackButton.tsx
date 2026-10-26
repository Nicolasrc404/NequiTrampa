import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';

export interface BackButtonProps {
  readonly onPress?: () => void;
  readonly size?: number;
  readonly accessibilityLabel?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  size = 48,
  accessibilityLabel = 'Volver',
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Feather name="chevron-left" size={22} color={colors.categoriesDark} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.categoriesShadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});

export default BackButton;
