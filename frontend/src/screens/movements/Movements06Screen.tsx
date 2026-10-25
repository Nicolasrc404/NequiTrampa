import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';

interface Movements06ScreenProps {
  onBack?: () => void;
}

export const Movements06Screen: React.FC<Movements06ScreenProps> = ({
  onBack,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.wrapper}>
        <View style={styles.topSection}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={onBack}
            >
              <Feather name="chevron-left" size={24} color={colors.navy} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detalle del movimiento</Text>
          </View>

          {/* 404 Error Status Presentation */}
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Feather name="search" size={38} color={colors.status404Text} />
            </View>

            <View style={styles.badge}>
              <Text style={styles.badgeText}>404</Text>
            </View>

            <Text style={styles.title}>Movimiento no encontrado</Text>
            <Text style={styles.description}>
              No encontramos esta operación. Puede que aún se esté actualizando tu historial.
            </Text>
          </View>
        </View>

        {/* Bottom CTA Button */}
        <View style={styles.footerAction}>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={onBack}
          >
            <Text style={styles.buttonText}>Volver a movimientos</Text>
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
  topSection: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.3,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 36,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.status404Bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  badge: {
    backgroundColor: colors.status404BadgeBg,
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 16,
  },
  badgeText: {
    color: colors.status404BadgeText,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.graySub,
    textAlign: 'center',
    lineHeight: 23,
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

export default Movements06Screen;
