// ============================================================
// Beneficiaries_08 — Ya tienes a este beneficiario (409)
// Fuente visual: Stitch screen f6206d51d61543688dea8f83d331719a
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';

interface Beneficiaries08ScreenProps {
  onBack?: () => void;
  onGoToList?: () => void;
  duplicateName?: string;
}

export const Beneficiaries08Screen: React.FC<Beneficiaries08ScreenProps> = ({
  onBack,
  onGoToList,
  duplicateName = 'Laura Gómez',
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
          <Text style={styles.illustEmoji}>👥</Text>
        </View>

        {/* Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Conflicto 409</Text>
        </View>

        <Text style={styles.headline}>Ya tienes a este beneficiario</Text>
        <Text style={styles.subtitle}>
          <Text style={styles.nameHighlight}>{duplicateName}</Text> ya está en
          tu lista de beneficiarios. No puedes agregarlo dos veces.
        </Text>

        {/* Tip */}
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            Puedes buscar a esta persona en tu lista y enviarle dinero
            directamente desde allí.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsWrap}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={onGoToList}
          accessibilityLabel="Ver mis beneficiarios"
        >
          <Text style={styles.primaryBtnText}>Ver mis beneficiarios</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          onPress={onBack}
          accessibilityLabel="Agregar otro beneficiario"
        >
          <Text style={styles.secondaryBtnText}>Agregar otro beneficiario</Text>
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
    backgroundColor: '#FFF3CD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  illustEmoji: {
    fontSize: 42,
    lineHeight: 52,
  },
  badge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A16A19',
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
  nameHighlight: {
    fontWeight: '700',
    color: '#111126',
  },
  tipCard: {
    backgroundColor: '#EEF0FF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    alignSelf: 'stretch',
  },
  tipIcon: {
    fontSize: 18,
    lineHeight: 24,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#4A4A7A',
    lineHeight: 20,
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

export default Beneficiaries08Screen;
