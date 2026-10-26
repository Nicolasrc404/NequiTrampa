// ============================================================
// Beneficiaries_13 — Error inesperado (500)
// Fuente visual: Stitch screen 1f8e4b4896ac45778149827006c85b09
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';

interface Beneficiaries13ScreenProps {
  onRetry?: () => void;
  onBack?: () => void;
  /** Identificador de la solicitud fallida (traceId del servidor). */
  errorReference?: string;
}

export const Beneficiaries13Screen: React.FC<Beneficiaries13ScreenProps> = ({
  onRetry,
  onBack,
  errorReference = 'ERR-BEN-500-DEMO',
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
        <Text style={styles.title}>Beneficiarios</Text>
      </View>

      <View style={styles.body}>
        {/* Error illustration */}
        <View style={styles.errorCircle}>
          <Text style={styles.errorEmoji}>⚡</Text>
        </View>

        {/* Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Error 500</Text>
        </View>

        <Text style={styles.headline}>Algo salió mal</Text>
        <Text style={styles.subtitle}>
          Tuvimos un problema inesperado al cargar tus beneficiarios. Nuestro
          equipo ya fue notificado. Por favor intenta más tarde.
        </Text>

        {/* Error ref card */}
        <View style={styles.refCard}>
          <Text style={styles.refLabel}>Referencia del error</Text>
          <Text style={styles.refValue}>{errorReference}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsWrap}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={onRetry}
          accessibilityLabel="Intentar nuevamente"
        >
          <Text style={styles.primaryBtnText}>Intentar nuevamente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          onPress={onBack}
          accessibilityLabel="Volver al inicio"
        >
          <Text style={styles.secondaryBtnText}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF5F5',
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
  errorCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFE4E4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#E00',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  errorEmoji: {
    fontSize: 42,
    lineHeight: 52,
  },
  badge: {
    backgroundColor: '#FFE4E4',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFBDBD',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C0392B',
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3A1010',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6E4040',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  refCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#FFD0D0',
    alignItems: 'center',
  },
  refLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B03030',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  refValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B1A1A',
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
    borderColor: '#FFD0D0',
  },
  secondaryBtnText: {
    color: '#7A3030',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default Beneficiaries13Screen;
