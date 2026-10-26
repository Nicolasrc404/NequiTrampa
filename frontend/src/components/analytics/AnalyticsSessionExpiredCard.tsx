import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';

export interface AnalyticsSessionExpiredCardProps {
  readonly description: string;
  readonly periodLabel?: string;
  readonly onLoginPress?: () => void;
}

export const AnalyticsSessionExpiredCard: React.FC<AnalyticsSessionExpiredCardProps> = ({
  description,
  periodLabel = 'Periodo seleccionado: septiembre de 2026',
  onLoginPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Session Expired Card */}
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Feather name="lock" size={36} color={colors.analyticsSessionIcon} />
        </View>
        <Text style={styles.title}>Tu sesión venció</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {/* Action Area */}
      <View style={styles.actionContainer}>
        <Text style={styles.periodText}>{periodLabel}</Text>
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={onLoginPress}
          accessibilityRole="button"
          accessibilityLabel="Iniciar sesión"
        >
          <Text style={styles.buttonText}>Iniciar sesión</Text>
        </TouchableOpacity>
        <Text style={styles.footnote}>
          Solo consulta · tus saldos no cambian
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    textAlign: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 20,
    minHeight: 280,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.analyticsSessionYellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.analyticsTextDark,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.analyticsMuted,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 280,
  },
  actionContainer: {
    alignItems: 'center',
    marginTop: 10,
    paddingBottom: 24,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.analyticsMuted,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: colors.analyticsMagenta,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.analyticsMagenta,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  footnote: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.analyticsMuted,
    marginTop: 14,
    textAlign: 'center',
  },
});

export default AnalyticsSessionExpiredCard;
