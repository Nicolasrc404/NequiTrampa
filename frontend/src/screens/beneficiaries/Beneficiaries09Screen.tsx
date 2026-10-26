// ============================================================
// Beneficiaries_09 — Error: Agregarse a sí mismo (422)
// Fuente visual: Stitch screen f9686c5c24f947949c3cbf41b7f2f711
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';

interface Beneficiaries09ScreenProps {
  onBack?: () => void;
  onTryAgain?: () => void;
}

export const Beneficiaries09Screen: React.FC<Beneficiaries09ScreenProps> = ({
  onBack,
  onTryAgain,
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
          <Text style={styles.illustEmoji}>🪞</Text>
        </View>

        {/* Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Error 422</Text>
        </View>

        <Text style={styles.headline}>No puedes agregarte a ti mismo</Text>
        <Text style={styles.subtitle}>
          El código que ingresaste corresponde a tu propia cuenta. Ingresa el
          código de otra persona para agregarla como beneficiario.
        </Text>

        {/* Rule card */}
        <View style={styles.ruleCard}>
          <View style={styles.ruleIconWrap}>
            <Text style={styles.ruleIcon}>⚠</Text>
          </View>
          <Text style={styles.ruleText}>
            Los beneficiarios deben ser cuentas distintas a la tuya.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsWrap}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={onTryAgain}
          accessibilityLabel="Ingresar otro código"
        >
          <Text style={styles.primaryBtnText}>Ingresar otro código</Text>
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
  illustCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  illustEmoji: {
    fontSize: 42,
    lineHeight: 52,
  },
  badge: {
    backgroundColor: '#FFF0E0',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD5A8',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A05A1A',
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111126',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#6E6D82',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  ruleCard: {
    backgroundColor: '#FFFAED',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  ruleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE082',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ruleIcon: {
    fontSize: 14,
    lineHeight: 20,
  },
  ruleText: {
    flex: 1,
    fontSize: 13,
    color: '#7A5A10',
    lineHeight: 19,
    fontWeight: '500',
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
    borderColor: '#DEDCED',
  },
  secondaryBtnText: {
    color: '#4A4A7A',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default Beneficiaries09Screen;
