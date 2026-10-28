// ============================================================
// Transfers_02 — ¿Para quién?
// Fuente visual: Stitch screen d4d38cc6457346cf861641f483c82421
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import TransferActionButtons from '../../components/transfers/TransferActionButtons';
import { DEMO_BENEFICIARIES } from '../../data/demoBeneficiaries';
import { TransferRecipient } from '../../types/transfers';

export interface Transfers02ScreenProps {
  readonly selectedRecipientId?: string;
  readonly onBack?: () => void;
  readonly onSelectRecipient?: (recipient: TransferRecipient) => void;
  readonly onContinue?: (recipient: TransferRecipient) => void;
  readonly recipients?: readonly TransferRecipient[];
  readonly realMode?: boolean;
}

type RecipientTab = 'beneficiaries' | 'code';

const toRecipient = (
  beneficiary: (typeof DEMO_BENEFICIARIES)[number],
): TransferRecipient => ({
  id: beneficiary.id,
  name: beneficiary.name.split(' ')[0],
  code: beneficiary.code,
  initialLetter: beneficiary.initialLetter,
});

export const Transfers02Screen: React.FC<Transfers02ScreenProps> = ({
  selectedRecipientId = DEMO_BENEFICIARIES[0].id,
  onBack,
  onSelectRecipient,
  onContinue,
  recipients: providedRecipients,
  realMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<RecipientTab>('beneficiaries');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(selectedRecipientId);

  const recipients = useMemo(
    () => providedRecipients ?? DEMO_BENEFICIARIES.slice(0, 3).map(toRecipient),
    [providedRecipients],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return recipients;
    return recipients.filter(
      (recipient) =>
        recipient.name.toLowerCase().includes(term) ||
        recipient.code.toLowerCase().includes(term),
    );
  }, [recipients, search]);

  const selected = recipients.find((recipient) => recipient.id === selectedId) ?? (activeTab === 'code' && search.trim().length > 0 ? { id: `code-${search.trim()}`, name: 'Destinatario', code: search.trim(), initialLetter: '?' } : recipients[0]);

  const handleSelect = (recipient: TransferRecipient) => {
    setSelectedId(recipient.id);
    onSelectRecipient?.(recipient);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TransfersHeader title="¿Para quién?" onBack={onBack} titleSize={26} />

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'beneficiaries' ? styles.tabActive : styles.tabIdle,
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('beneficiaries')}
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'beneficiaries' }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'beneficiaries'
                  ? styles.tabTextActive
                  : styles.tabTextIdle,
              ]}
            >
              Beneficiarios
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'code' ? styles.tabActive : styles.tabIdle,
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('code')}
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'code' }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'code'
                  ? styles.tabTextActive
                  : styles.tabTextIdle,
              ]}
            >
              Usar código
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchGroup}>
          <Text style={styles.searchLabel}>
            {activeTab === 'code' ? 'Código' : 'Buscar'}
          </Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={
              activeTab === 'code' ? 'Ej. LAUR-5120' : 'Nombre o código'
            }
            placeholderTextColor={colors.grayPlaceholder}
            autoCapitalize="none"
            accessibilityLabel="Buscar destinatario"
          />
          {activeTab === 'code' ? (
            <Text style={styles.codeHint}>
              Ingresa el código público de la cuenta destino.
            </Text>
          ) : null}
        </View>

        <Text style={styles.listTitle}>Tus beneficiarios</Text>

        <View style={styles.listCard}>
          {filtered.map((recipient, index) => {
            const active = selected.id === recipient.id;
            return (
              <React.Fragment key={recipient.id}>
                <TouchableOpacity
                  style={styles.recipientRow}
                  activeOpacity={0.75}
                  onPress={() => handleSelect(recipient)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${recipient.name}, ${recipient.code}`}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {recipient.initialLetter}
                    </Text>
                  </View>
                  <View style={styles.recipientInfo}>
                    <Text style={styles.recipientName}>{recipient.name}</Text>
                    <Text style={styles.recipientCode}>{recipient.code}</Text>
                  </View>
                  <View
                    style={[styles.radio, active ? styles.radioActive : null]}
                  >
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                </TouchableOpacity>
                {index < filtered.length - 1 ? (
                  <View style={styles.divider} />
                ) : null}
              </React.Fragment>
            );
          })}
          {filtered.length === 0 ? (
            <Text style={styles.noResults}>No encontramos coincidencias.</Text>
          ) : null}
        </View>

        <Text style={styles.demoHint}>
          {realMode ? 'Modo real · el backend validará el destinatario y sus permisos' : 'Destinatarios DEMO · selección local sin llamada al backend'}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TransferActionButtons
          primaryLabel="Continuar"
          onPrimary={() => selected && onContinue?.(selected)}
          disabled={!selected || selected.code.trim().length === 0}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.transfersBg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
  },
  tab: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: colors.transfersDarkAlt,
  },
  tabIdle: {
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.white,
  },
  tabTextIdle: {
    color: colors.transfersDark,
  },
  searchGroup: {
    marginBottom: 24,
  },
  searchLabel: {
    fontSize: 15,
    color: colors.graySub,
    marginBottom: 8,
  },
  searchInput: {
    height: 52,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.transfersInputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.transfersDark,
  },
  codeHint: {
    marginTop: 6,
    fontSize: 12,
    color: colors.transfersSubtext,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.transfersDark,
    marginBottom: 12,
  },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.categoriesBorder,
    shadowColor: colors.transfersShadow,
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.transfersAvatarBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.transfersAvatarText,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.transfersDark,
  },
  recipientCode: {
    fontSize: 13,
    color: colors.transfersSubtext,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.transfersInputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.transfersMagenta,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.transfersMagenta,
  },
  divider: {
    height: 1,
    backgroundColor: colors.transfersDivider,
  },
  noResults: {
    paddingVertical: 18,
    textAlign: 'center',
    fontSize: 13,
    color: colors.transfersSubtext,
  },
  demoHint: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.transfersNavInactive,
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 30,
  },
});

export default Transfers02Screen;
