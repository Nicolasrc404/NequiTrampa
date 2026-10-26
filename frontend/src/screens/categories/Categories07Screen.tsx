// ============================================================
// Categories_07 — Revisa los campos marcados (422)
// Fuente visual: Stitch screen 8b6d9dce1f2d4fd39e514f8678d967f9
// ============================================================
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import colors from '../../theme/colors';
import BackButton from '../../components/categories/BackButton';
import CategoryActions from '../../components/categories/CategoryActions';
import CategoryField from '../../components/categories/CategoryField';
import CategoryTypeSelector from '../../components/categories/CategoryTypeSelector';
import { CategoryType } from '../../types/categories';

export interface Categories07ScreenProps {
  readonly onBack?: () => void;
  readonly onSubmit?: (name: string, color: string, type: CategoryType) => void;
  readonly onCancel?: () => void;
}

export const Categories07Screen: React.FC<Categories07ScreenProps> = ({
  onBack,
  onSubmit,
  onCancel,
}) => {
  const [name, setName] = useState('M');
  const [color, setColor] = useState('');
  const [type, setType] = useState<CategoryType>('gasto');

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
        <View style={styles.header}>
          <BackButton onPress={onBack} />
          <Text style={styles.title}>Crear categoría</Text>
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Revisa los campos marcados (422).
          </Text>
        </View>

        <View style={styles.typeWrap}>
          <CategoryTypeSelector selected={type} onChange={setType} compact />
        </View>

        <View style={styles.form}>
          <CategoryField
            label="Nombre"
            value={name}
            onChangeText={setName}
            error="El nombre debe tener entre 2 y 30 caracteres."
            inputProps={{ maxLength: 30, autoCapitalize: 'sentences' }}
          />
          <CategoryField
            label="Color"
            value={color}
            placeholder="Elige un color"
            onChangeText={setColor}
            error="Selecciona un color de la lista."
            inputProps={{ autoCapitalize: 'none' }}
          />
        </View>

        <Text style={styles.demoHint}>
          Respuesta DEMO 422 · validación simulada
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <CategoryActions
          primaryLabel="Crear categoría"
          onPrimary={() => onSubmit?.(name.trim(), color.trim(), type)}
          secondaryLabel="Cancelar"
          onSecondary={onCancel}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.categoriesBg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.categoriesPillDark,
    letterSpacing: -0.4,
  },
  banner: {
    backgroundColor: colors.categoriesErrorBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  bannerText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '600',
    color: colors.categoriesErrorText,
  },
  typeWrap: {
    marginBottom: 24,
  },
  form: {
    gap: 18,
  },
  demoHint: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.grayNavInactive,
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
});

export default Categories07Screen;
