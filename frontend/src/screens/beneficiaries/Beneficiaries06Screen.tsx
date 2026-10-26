// ============================================================
// Beneficiaries_06 — Error de Validación (400)
// Fuente visual: Stitch screen 940c4952cb30492ea339354ab63a52cc
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

interface Beneficiaries06ScreenProps {
  onBack?: () => void;
  onRetry?: (code: string) => void;
  errorMessage?: string;
}

export const Beneficiaries06Screen: React.FC<Beneficiaries06ScreenProps> = ({
  onBack,
  onRetry,
  errorMessage = 'El código ingresado no tiene el formato correcto. Revisa que sea un código válido e intenta de nuevo.',
}) => {
  const [code, setCode] = useState('ABCD12345'); // Demo valor incorrecto
  const [alias, setAlias] = useState('');

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
        {/* Error banner */}
        <View style={styles.errorBanner}>
          <View style={styles.errorIconWrap}>
            <Text style={styles.errorIcon}>✕</Text>
          </View>
          <View style={styles.errorTextWrap}>
            <Text style={styles.errorBannerTitle}>Código inválido</Text>
            <Text style={styles.errorBannerMsg}>{errorMessage}</Text>
          </View>
        </View>

        {/* Code field — with error state */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Código del beneficiario</Text>
          <TextInput
            style={[styles.input, styles.inputError]}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            returnKeyType="next"
            accessibilityLabel="Código del beneficiario"
          />
          <Text style={styles.fieldError}>
            Formato incorrecto. Usa letras y guion, como LAUR-5120.
          </Text>
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
          />
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={() => onRetry?.(code.trim())}
          accessibilityLabel="Intentar de nuevo"
        >
          <Text style={styles.ctaText}>Intentar de nuevo</Text>
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
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: '#FDEEED',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F5C6C3',
    alignItems: 'flex-start',
  },
  errorIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E74C3C',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  errorIcon: {
    fontSize: 13,
    color: colors.white,
    fontWeight: '800',
  },
  errorTextWrap: { flex: 1 },
  errorBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B1A1A',
    marginBottom: 4,
  },
  errorBannerMsg: {
    fontSize: 13,
    color: '#7A3030',
    lineHeight: 19,
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
  },
  inputError: {
    borderColor: '#E74C3C',
    borderWidth: 1.5,
    backgroundColor: '#FFFAFA',
  },
  fieldError: {
    fontSize: 12,
    color: '#C0392B',
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
  ctaText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default Beneficiaries06Screen;
