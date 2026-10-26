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
  /** Nombre que el servidor rechazó. */
  readonly initialName?: string;
  readonly initialType?: CategoryType;
  /** Mensaje de validación del servidor. */
  readonly errorMessage?: string;
  readonly submitting?: boolean;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Categories07Screen: React.FC<Categories07ScreenProps> = ({
  onBack,
  onSubmit,
  onCancel,
  initialName = 'M',
  initialType = 'gasto',
  errorMessage,
  submitting = false,
  demo = true,
}) => {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState('');
  const [type, setType] = useState<CategoryType>(initialType);

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
            {errorMessage ?? 'Revisa los campos marcados (422).'}
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
            error={
              name.trim().length < 2
                ? 'El nombre debe tener entre 2 y 30 caracteres.'
                : undefined
            }
            inputProps={{ maxLength: 30, autoCapitalize: 'sentences' }}
          />
          <CategoryField
            label="Color"
            value={color}
            placeholder="Elige un color"
            onChangeText={setColor}
            helper="Referencia visual. El servidor no almacena el color."
            error={demo && color.trim().length === 0 ? 'Selecciona un color de la lista.' : undefined}
            inputProps={{ autoCapitalize: 'none' }}
          />
        </View>

        {demo ? (
          <Text style={styles.demoHint}>
            Respuesta DEMO 422 · validación simulada
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <CategoryActions
          primaryLabel={submitting ? 'Guardando…' : 'Crear categoría'}
          onPrimary={() => onSubmit?.(name.trim(), color.trim(), type)}
          secondaryLabel="Cancelar"
          onSecondary={onCancel}
          primaryDisabled={submitting || name.trim().length < 2}
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
