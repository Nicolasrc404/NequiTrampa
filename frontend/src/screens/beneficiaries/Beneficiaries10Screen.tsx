// ============================================================
// Beneficiaries_10 — Beneficiario Eliminado (200)
// Fuente visual: Stitch screen b2939ff2fcbd4db39eb1bd305c364950
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';
import { BeneficiaryItem } from '../../types/beneficiaries';
import { DEMO_DELETED_BENEFICIARY } from '../../data/demoBeneficiaries';

interface Beneficiaries10ScreenProps {
  beneficiary?: BeneficiaryItem;
  onGoToList?: () => void;
  onAddNew?: () => void;
}

export const Beneficiaries10Screen: React.FC<Beneficiaries10ScreenProps> = ({
  beneficiary = DEMO_DELETED_BENEFICIARY,
  onGoToList,
  onAddNew,
}) => {
  return (
    <View style={styles.root}>
      <View style={styles.body}>
        {/* Trash icon circle */}
        <View style={styles.trashCircle}>
          <Text style={styles.trashEmoji}>🗑️</Text>
        </View>

        <Text style={styles.headline}>Beneficiario eliminado</Text>
        <Text style={styles.subtitle}>
          <Text style={styles.nameHighlight}>{beneficiary.name}</Text> fue
          eliminado de tu lista. Si lo necesitas más adelante, podrás
          agregarlo nuevamente.
        </Text>

        {/* Deleted beneficiary card */}
        <View style={styles.deletedCard}>
          <View style={styles.deletedAvatar}>
            <Text style={styles.deletedAvatarText}>
              {beneficiary.initialLetter}
            </Text>
          </View>
          <View>
            <Text style={styles.deletedName}>{beneficiary.name}</Text>
            <Text style={styles.deletedCode}>{beneficiary.code}</Text>
          </View>
          {/* Removed badge */}
          <View style={styles.removedBadge}>
            <Text style={styles.removedBadgeText}>Eliminado</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsWrap}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={onGoToList}
          accessibilityLabel="Ver mi lista de beneficiarios"
        >
          <Text style={styles.primaryBtnText}>Ver mi lista</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          onPress={onAddNew}
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
    backgroundColor: '#F8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  trashEmoji: {
    fontSize: 38,
    lineHeight: 46,
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
  deletedCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0EFF6',
  },
  deletedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8E6F2',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  deletedAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6E6880',
  },
  deletedName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#808092',
    flex: 1,
    textDecorationLine: 'line-through',
  },
  deletedCode: {
    fontSize: 12,
    color: '#A0A0B2',
    marginTop: 2,
  },
  removedBadge: {
    backgroundColor: '#FCE8E8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  removedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B03030',
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

export default Beneficiaries10Screen;
