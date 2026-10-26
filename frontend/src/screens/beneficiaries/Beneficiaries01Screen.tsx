// ============================================================
// Beneficiaries_01 — Listado de Beneficiarios
// Fuente visual: Stitch screen 731075eb4d2b42cfba6bcb90151001cd
// Título: "Beneficiaries_01 - Listado de Beneficiarios"
// ============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import colors from '../../theme/colors';
import { BeneficiaryItem } from '../../types/beneficiaries';
import { DEMO_BENEFICIARIES } from '../../data/demoBeneficiaries';

interface Beneficiaries01ScreenProps {
  onBack?: () => void;
  onAddBeneficiary?: () => void;
  onSendTobeneficiary?: (item: BeneficiaryItem) => void;
  onLongPressBeneficiary?: (item: BeneficiaryItem) => void;
  /** Datos reales del backend. Si se omite, se usa el DEMO de previsualización. */
  beneficiaries?: readonly BeneficiaryItem[];
}

export const Beneficiaries01Screen: React.FC<Beneficiaries01ScreenProps> = ({
  onBack,
  onAddBeneficiary,
  onSendTobeneficiary,
  onLongPressBeneficiary,
  beneficiaries = DEMO_BENEFICIARIES,
}) => {
  const [searchText, setSearchText] = useState('');

  const filtered = beneficiaries.filter(
    (b) =>
      b.name.toLowerCase().includes(searchText.toLowerCase()) ||
      b.code.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <View style={styles.root}>
      {/* TopBar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
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
        <TouchableOpacity activeOpacity={0.7} onPress={onAddBeneficiary}>
          <Text style={styles.addLink}>Agregar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <View style={styles.searchSection}>
          <Text style={styles.searchLabel}>Buscar</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Nombre o código"
            placeholderTextColor={colors.grayPlaceholder}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            accessibilityLabel="Buscar beneficiario"
          />
        </View>

        {/* List Card */}
        <View style={styles.listCard}>
          {filtered.map((item, index) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.listItem,
                index < filtered.length - 1 && styles.listItemBorder,
                pressed && styles.listItemPressed,
              ]}
              onLongPress={() => onLongPressBeneficiary?.(item)}
              accessibilityLabel={`Beneficiario ${item.name}`}
            >
              {/* Avatar */}
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.initialLetter}</Text>
                </View>
                <View>
                  <Text style={styles.benefName}>{item.name}</Text>
                  <Text style={styles.benefCode}>{item.code}</Text>
                </View>
              </View>
              {/* Enviar button only on first item (matching Stitch design) */}
              {index === 0 && (
                <TouchableOpacity
                  style={styles.sendBtn}
                  activeOpacity={0.8}
                  onPress={() => onSendTobeneficiary?.(item)}
                  accessibilityLabel={`Enviar a ${item.name}`}
                >
                  <Text style={styles.sendBtnText}>Enviar</Text>
                </TouchableOpacity>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#111126',
    letterSpacing: -0.3,
  },
  addLink: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.magenta,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  searchSection: {
    marginBottom: 20,
  },
  searchLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#5c5b6f',
    marginBottom: 8,
    marginLeft: 2,
  },
  searchInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#DEDCED',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a2e',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFF6',
  },
  listItemPressed: {
    backgroundColor: '#FAFAFA',
  },
  avatarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DED9F5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#211F56',
  },
  benefName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16162A',
    lineHeight: 20,
  },
  benefCode: {
    fontSize: 12,
    fontWeight: '500',
    color: '#808092',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  sendBtn: {
    backgroundColor: colors.magenta,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: colors.magenta,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sendBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default Beneficiaries01Screen;
