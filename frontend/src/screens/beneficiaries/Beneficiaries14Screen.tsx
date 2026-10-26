// ============================================================
// Beneficiaries_14 — Confirmar Eliminación de Beneficiario
// Fuente visual: Stitch screen 19f318f3f5624443b8187b6086471286
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';
import { BeneficiaryItem } from '../../types/beneficiaries';
import { DEMO_BENEFICIARY_TO_DELETE } from '../../data/demoBeneficiaries';

interface Beneficiaries14ScreenProps {
  beneficiary?: BeneficiaryItem;
  onConfirmDelete?: () => void;
  onCancel?: () => void;
}

export const Beneficiaries14Screen: React.FC<Beneficiaries14ScreenProps> = ({
  beneficiary = DEMO_BENEFICIARY_TO_DELETE,
  onConfirmDelete,
  onCancel,
}) => {
  return (
    <View style={styles.root}>
      {/* TopBar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={onCancel}
          accessibilityLabel="Cancelar"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Eliminar beneficiario</Text>
      </View>

      <View style={styles.body}>
        {/* Trash illustration */}
        <View style={styles.trashCircle}>
          <Text style={styles.trashEmoji}>🗑️</Text>
        </View>

        <Text style={styles.headline}>¿Eliminar a {beneficiary.name}?</Text>
        <Text style={styles.subtitle}>
          Si eliminas este beneficiario, tendrás que buscarlo por su código
          la próxima vez que quieras enviarle dinero.
        </Text>

        {/* Beneficiary card */}
        <View style={styles.beneficiaryCard}>
          <View style={styles.benefAvatar}>
            <Text style={styles.benefAvatarText}>{beneficiary.initialLetter}</Text>
          </View>
          <View>
            <Text style={styles.benefName}>{beneficiary.name}</Text>
            <Text style={styles.benefCode}>{beneficiary.code}</Text>
          </View>
        </View>

        {/* Warning note */}
        <View style={styles.warningNote}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            Esta acción no se puede deshacer desde la app.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsWrap}>
        {/* Destructive action first, per Stitch */}
        <TouchableOpacity
          style={styles.deleteBtn}
          activeOpacity={0.85}
          onPress={onConfirmDelete}
          accessibilityLabel={`Confirmar eliminación de ${beneficiary.name}`}
        >
          <Text style={styles.deleteBtnText}>Sí, eliminar beneficiario</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.7}
          onPress={onCancel}
          accessibilityLabel="Cancelar"
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
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
  trashCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFE8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#C0392B',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  trashEmoji: {
    fontSize: 38,
    lineHeight: 46,
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
    marginBottom: 24,
  },
  beneficiaryCard: {
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
    marginBottom: 16,
  },
  benefAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DED9F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#211F56',
  },
  benefName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16162A',
  },
  benefCode: {
    fontSize: 13,
    color: '#808092',
    marginTop: 2,
  },
  warningNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF5E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#FFD5A8',
  },
  warningIcon: {
    fontSize: 16,
    lineHeight: 22,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#8B5A00',
    fontWeight: '500',
  },
  actionsWrap: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
  },
  deleteBtn: {
    backgroundColor: '#C0392B',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#C0392B',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  deleteBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DEDCED',
  },
  cancelBtnText: {
    color: '#4A4A7A',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default Beneficiaries14Screen;
