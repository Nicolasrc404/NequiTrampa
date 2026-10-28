// ============================================================
// Beneficiaries_12 — Tu sesión venció variante (401)
// Fuente visual: Stitch screen f1bbcefa9b164b4ba3ae0d994f2d9a76
// Diferencia con _11: Variante durante operación de agregar
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';

interface Beneficiaries12ScreenProps {
  onLoginPress?: () => void;
  onBack?: () => void;
}

export const Beneficiaries12Screen: React.FC<Beneficiaries12ScreenProps> = ({
  onLoginPress,
  onBack,
}) => {
  return (
    <View style={styles.root}>
      {/* TopBar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={onBack}
          accessibilityLabel="Volver"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Agregar beneficiario</Text>
      </View>

      <View style={styles.body}>
        {/* Lock circle — magenta tint */}
        <View style={styles.lockCircle}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        {/* Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Sesión expirada · 401</Text>
        </View>

        <Text style={styles.headline}>Tu sesión venció</Text>
        <Text style={styles.subtitle}>
          Tu sesión expiró mientras intentabas agregar un beneficiario.
          Inicia sesión nuevamente y vuelve a intentarlo.
        </Text>

        {/* Progress lost note */}
        <View style={styles.warningCard}>
          <View style={styles.warningIcon}>
            <Text style={styles.warningIconText}>!</Text>
          </View>
          <Text style={styles.warningText}>
            No se perdió ningún dato de tu cuenta. Solo necesitas volver a
            iniciar sesión.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsWrap}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={onLoginPress}
          accessibilityLabel="Iniciar sesión nuevamente"
        >
          <Text style={styles.primaryBtnText}>Iniciar sesión nuevamente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F4FB',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backIcon: {
    fontSize: 28,
    color: '#2b2b40',
    lineHeight: 32,
    marginTop: -2,
    fontWeight: '300',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111126',
    letterSpacing: -0.3,
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
    backgroundColor: '#FCE0EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.magenta,
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
    color: '#111126',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6E6D82',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  warningCard: {
    backgroundColor: '#EEF0FF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
  },
  warningIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#B8C0FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  warningIconText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3D3D8F',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#4A4A7A',
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

export default Beneficiaries12Screen;
