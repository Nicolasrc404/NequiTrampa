import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';

interface Movements07ScreenProps {
  onLoginPress?: () => void;
}

export const Movements07Screen: React.FC<Movements07ScreenProps> = ({
  onLoginPress,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.wrapper}>
        {/* Main Content Centered */}
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Feather name="lock" size={42} color={colors.status401LockStroke} />
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>401</Text>
          </View>

          <Text style={styles.title}>Tu sesión venció</Text>
          <Text style={styles.description}>
            Inicia sesión de nuevo para ver tus movimientos.
          </Text>
        </View>

        {/* Bottom CTA Button */}
        <View style={styles.footerAction}>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={onLoginPress}
          >
            <Text style={styles.buttonText}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wrapper: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 28,
  },
  iconCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.status401CircleBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  badge: {
    backgroundColor: colors.status401BadgeBg,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 16,
  },
  badgeText: {
    color: colors.status401BadgeText,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16.5,
    color: colors.graySub,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 290,
  },
  footerAction: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  button: {
    backgroundColor: colors.magenta,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.magenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

export default Movements07Screen;
