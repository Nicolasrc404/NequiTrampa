import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';

export interface TransfersHeaderProps {
  readonly title: string;
  readonly onBack?: () => void;
  readonly titleSize?: number;
}

export const TransfersHeader: React.FC<TransfersHeaderProps> = ({
  title,
  onBack,
  titleSize = 24,
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
        <Feather
          name="chevron-left"
          size={22}
          color={colors.transfersDark}
        />
      </TouchableOpacity>
      <Text style={[styles.title, { fontSize: titleSize }]}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.transfersShadow,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontWeight: '700',
    color: colors.transfersDark,
    letterSpacing: -0.4,
    flexShrink: 1,
  },
});

export default TransfersHeader;
