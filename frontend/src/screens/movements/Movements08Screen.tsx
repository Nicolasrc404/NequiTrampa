import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import Header from '../../components/common/Header';
import BottomNav from '../../components/common/BottomNav';

interface Movements08ScreenProps {
  onRetryPress?: () => void;
}

export const Movements08Screen: React.FC<Movements08ScreenProps> = ({
  onRetryPress,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <Header title="Movimientos" showFilter={false} />

        {/* 503 Error State Content */}
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Feather name="wifi-off" size={36} color={colors.status503BadgeText} />
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>503</Text>
          </View>

          <Text style={styles.title}>No pudimos cargar tus movimientos</Text>
          <Text style={styles.description}>
            El servicio no está disponible por ahora. Tu saldo y tu dinero no se afectan.
          </Text>
        </View>

        {/* Retry Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.85}
            onPress={onRetryPress}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Navigation */}
      <BottomNav activeTab="movimientos" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingBottom: 80,
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: -30,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.status503CircleBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  badge: {
    backgroundColor: colors.status503BadgeBg,
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 16,
  },
  badgeText: {
    color: colors.status503BadgeText,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 290,
  },
  description: {
    fontSize: 15.5,
    color: colors.graySub,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 310,
  },
  actionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  retryButton: {
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
  retryButtonText: {
    color: colors.white,
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

export default Movements08Screen;
