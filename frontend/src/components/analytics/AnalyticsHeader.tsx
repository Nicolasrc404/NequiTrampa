import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';

export interface AnalyticsHeaderProps {
  readonly onBack?: () => void;
  readonly title?: string;
  readonly brandLabel?: string;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  onBack,
  title = 'Analytics',
  brandLabel = 'NequiTrampa',
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Feather name="chevron-left" size={22} color={colors.analyticsTextDark} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.brand}>{brandLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.analyticsTextDark,
    letterSpacing: -0.4,
  },
  brand: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.analyticsMuted,
  },
});

export default AnalyticsHeader;
