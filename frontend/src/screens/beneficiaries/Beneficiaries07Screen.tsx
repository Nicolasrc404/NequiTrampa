// ============================================================
// Beneficiaries_07 — Cuenta No Encontrada (404)
// Fuente visual: Stitch screen 75adc2458cd94cf8a633d23f50b5cca6
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';

interface Beneficiaries07ScreenProps {
  onBack?: () => void;
  onTryAgain?: () => void;
  /** Código que el usuario buscó y el servidor no encontró. */
  searchedCode?: string;
}

export const Beneficiaries07Screen: React.FC<Beneficiaries07ScreenProps> = ({
  onBack,
  onTryAgain,
  searchedCode = 'XXXX-0000',
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
        {/* Illustration */}
        <View style={styles.illustCircle}>
          <Text style={styles.illustEmoji}>🔍</Text>
        </View>

        {/* Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Error 404</Text>
        </View>

        <Text style={styles.headline}>Cuenta no encontrada</Text>
        <Text style={styles.subtitle}>
          No encontramos ninguna cuenta con ese código. Verifica que lo hayas
          escrito correctamente o pídele el código a la persona que deseas
          agregar.
        </Text>

        {/* Code shown */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Código buscado</Text>
          <Text style={styles.codeValue}>{searchedCode}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsWrap}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={onTryAgain}
          accessibilityLabel="Intentar con otro código"
        >
          <Text style={styles.primaryBtnText}>Intentar con otro código</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          onPress={onBack}
          accessibilityLabel="Volver a beneficiarios"
        >
          <Text style={styles.secondaryBtnText}>Volver a beneficiarios</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FEF9ED',
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
  illustCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.status404BadgeBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  illustEmoji: {
    fontSize: 42,
    lineHeight: 52,
  },
  badge: {
    backgroundColor: colors.status404BadgeBg,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F5D788',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.status404BadgeText,
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3A2A00',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#7A6030',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  codeCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F5E098',
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8C6D37',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A2A00',
    letterSpacing: 1,
  },
  actionsWrap: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
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
  secondaryBtn: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5D89A',
  },
  secondaryBtnText: {
    color: '#6B5020',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default Beneficiaries07Screen;
