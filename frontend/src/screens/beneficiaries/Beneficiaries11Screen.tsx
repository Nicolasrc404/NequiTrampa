// ============================================================
// Beneficiaries_11 — Tu sesión venció (401)
// Fuente visual: Stitch screen a60b47ca0fca493ca77fcfe24f4a3224
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';

interface Beneficiaries11ScreenProps {
  onLoginPress?: () => void;
}

export const Beneficiaries11Screen: React.FC<Beneficiaries11ScreenProps> = ({
  onLoginPress,
}) => {
  return (
    <View style={styles.root}>
      <View style={styles.body}>
        {/* Lock circle */}
        <View style={styles.lockCircle}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        {/* Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Sesión expirada · 401</Text>
        </View>

        <Text style={styles.headline}>Tu sesión venció</Text>
        <Text style={styles.subtitle}>
          Por tu seguridad, cerramos tu sesión después de un período de
          inactividad. Inicia sesión nuevamente para continuar con tus
          beneficiarios.
        </Text>

        {/* Security note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteIcon}>🛡️</Text>
          <Text style={styles.noteText}>
            Nadie más puede ver ni modificar tu lista de beneficiarios sin tu
            sesión activa.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsWrap}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={onLoginPress}
          accessibilityLabel="Iniciar sesión"
        >
          <Text style={styles.primaryBtnText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  lockCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.status401CircleBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lockIcon: {
    fontSize: 42,
    lineHeight: 52,
  },
  badge: {
    backgroundColor: colors.status401BadgeBg,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.status401BadgeText,
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A0A38',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#5A4A7A',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  noteCard: {
    backgroundColor: '#EDE9FE',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    alignSelf: 'stretch',
  },
  noteIcon: {
    fontSize: 18,
    lineHeight: 24,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#4A3A7A',
    lineHeight: 19,
  },
  actionsWrap: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  primaryBtn: {
    backgroundColor: colors.magenta,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.magenta,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default Beneficiaries11Screen;
