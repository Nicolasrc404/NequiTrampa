// ============================================================
// Categories_03 — Crear categoría
// Fuente visual: Stitch screen 7d74ecb8b3e74bd683ee114015e6f048
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

export interface Categories03ScreenProps {
  readonly onBack?: () => void;
  readonly onSubmit?: (name: string, color: string, type: CategoryType) => void;
  readonly onCancel?: () => void;
  /** Bloquea el formulario mientras el servidor confirma. */
  readonly submitting?: boolean;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Categories03Screen: React.FC<Categories03ScreenProps> = ({
  onBack,
  onSubmit,
  onCancel,
  submitting = false,
  demo = true,
}) => {
  const [name, setName] = useState('');
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

        <View style={styles.typeWrap}>
          <CategoryTypeSelector selected={type} onChange={setType} />
        </View>

        <View style={styles.form}>
          <CategoryField
            label="Nombre"
            value={name}
            placeholder="Ej. Mercado"
            onChangeText={setName}
            inputProps={{ maxLength: 30, autoCapitalize: 'sentences' }}
          />
          <CategoryField
            label="Color"
            value={color}
            placeholder="Elige un color"
            onChangeText={setColor}
            helper="Referencia visual. El servidor no almacena el color."
            inputProps={{ autoCapitalize: 'none' }}
          />
        </View>

        {demo ? (
          <Text style={styles.demoHint}>
            Vista DEMO · los datos no se guardan en el backend
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
    backgroundColor: colors.categoriesBgForm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.categoriesDark,
    letterSpacing: -0.5,
  },
  typeWrap: {
    marginBottom: 28,
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

export default Categories03Screen;
