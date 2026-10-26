// ============================================================
// Beneficiaries_05 — Beneficiario Agregado (201)
// Fuente visual: Stitch screen e7e60284a05249a295a635f4a95ad2aa
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';
import { BeneficiaryItem } from '../../types/beneficiaries';

interface Beneficiaries05ScreenProps {
  beneficiary?: BeneficiaryItem;
  onGoToList?: () => void;
  onSendMoney?: () => void;
}

export const Beneficiaries05Screen: React.FC<Beneficiaries05ScreenProps> = ({
  beneficiary = { id: 'demo', name: 'Laura Gómez', code: 'LAUR-5120', initialLetter: 'L' },
  onGoToList,
  onSendMoney,
}) => {
  return (
    <View style={styles.root}>
      <View style={styles.body}>
        {/* Success circle */}
        <View style={styles.successCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>

        <Text style={styles.headline}>¡Beneficiario agregado!</Text>
        <Text style={styles.subtitle}>
          Ahora puedes enviarle dinero a{' '}
          <Text style={styles.nameHighlight}>{beneficiary.name}</Text> de forma
          rápida desde tu lista de beneficiarios.
        </Text>

        {/* Beneficiary summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryAvatar}>
            <Text style={styles.summaryAvatarText}>{beneficiary.initialLetter}</Text>
          </View>
          <View>
            <Text style={styles.summaryName}>{beneficiary.name}</Text>
            <Text style={styles.summaryCode}>{beneficiary.code}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsWrap}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={onSendMoney}
          accessibilityLabel="Enviar dinero ahora"
        >
          <Text style={styles.primaryBtnText}>Enviar dinero ahora</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          onPress={onGoToList}
          accessibilityLabel="Ver mis beneficiarios"
        >
          <Text style={styles.secondaryBtnText}>Ver mis beneficiarios</Text>
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
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.greenBadge,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.green,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  checkMark: {
    fontSize: 40,
    color: colors.green,
    fontWeight: '700',
    lineHeight: 50,
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
    fontSize: 15,
    color: '#6E6D82',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 28,
  },
  nameHighlight: {
    fontWeight: '700',
    color: '#111126',
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DED9F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#211F56',
  },
  summaryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16162A',
  },
  summaryCode: {
    fontSize: 13,
    color: '#808092',
    fontWeight: '500',
    marginTop: 2,
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

export default Beneficiaries05Screen;
