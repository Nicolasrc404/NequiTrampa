// ============================================================
// Beneficiaries_04 — Agregar Beneficiario (Formulario)
// Fuente visual: Stitch screen 46ccd8b5ed4148f4897d3de0a906cf16
// ============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import colors from '../../theme/colors';

interface Beneficiaries04ScreenProps {
  onBack?: () => void;
  onSubmit?: (code: string, alias: string) => void;
}

export const Beneficiaries04Screen: React.FC<Beneficiaries04ScreenProps> = ({
  onBack,
  onSubmit,
}) => {
  const [code, setCode] = useState('');
  const [alias, setAlias] = useState('');

  const canSubmit = code.trim().length >= 4;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>ℹ</Text>
          </View>
          <Text style={styles.infoText}>
            Ingresa el código de la persona que deseas agregar como beneficiario.
            Puedes encontrarlo en su perfil o pedírselo directamente.
          </Text>
        </View>

        {/* Code field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Código del beneficiario</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: LAUR-5120"
            placeholderTextColor={colors.grayPlaceholder}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            returnKeyType="next"
            accessibilityLabel="Código del beneficiario"
          />
        </View>

        {/* Alias field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            Nombre o apodo{' '}
            <Text style={styles.optionalLabel}>(opcional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Mamá, Trabajo, Laura"
            placeholderTextColor={colors.grayPlaceholder}
            value={alias}
            onChangeText={setAlias}
            returnKeyType="done"
            accessibilityLabel="Nombre o apodo del beneficiario"
          />
          <Text style={styles.fieldHint}>
            Si no escribes un nombre, usaremos el código.
          </Text>
        </View>
      </ScrollView>

      {/* CTA Button */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity
          style={[styles.ctaButton, !canSubmit && styles.ctaDisabled]}
          activeOpacity={canSubmit ? 0.85 : 1}
          onPress={canSubmit ? () => onSubmit?.(code.trim(), alias.trim()) : undefined}
          disabled={!canSubmit}
          accessibilityLabel="Agregar beneficiario"
        >
          <Text style={styles.ctaText}>Agregar beneficiario</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EEF0FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#B8C0FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoIconText: {
    fontSize: 14,
    color: '#3D3D8F',
    fontWeight: '700',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4A4A7A',
    lineHeight: 20,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3A3A5A',
    marginBottom: 8,
  },
  optionalLabel: {
    fontWeight: '400',
    color: colors.graySub,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#DEDCED',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a2e',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.graySub,
    marginTop: 6,
    marginLeft: 4,
  },
  ctaWrap: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F5F4FB',
    borderTopWidth: 1,
    borderTopColor: '#EDEAF8',
  },
  ctaButton: {
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
  ctaDisabled: {
    backgroundColor: '#C8C2DA',
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default Beneficiaries04Screen;
