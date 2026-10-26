// ============================================================
// Categories_06 — Categoría duplicada (409)
// Fuente visual: Stitch screen 24b0b5eb7156423ab2383982326b2983
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

export interface Categories06ScreenProps {
  readonly onBack?: () => void;
  readonly onCreate?: (name: string, color: string, type: CategoryType) => void;
  readonly onViewCategories?: () => void;
  /** Nombre que produjo el conflicto (para que el usuario lo corrija). */
  readonly initialName?: string;
  readonly initialType?: CategoryType;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Categories06Screen: React.FC<Categories06ScreenProps> = ({
  onBack,
  onCreate,
  onViewCategories,
  initialName = 'Mercado',
  initialType = 'gasto',
  demo = true,
}) => {
  const [name, setName] = useState(initialName);
  const [color] = useState('Magenta');
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
            Ya tienes una categoría con ese nombre (409).
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
            error="Elige un nombre distinto o edita la categoría existente."
            inputProps={{ maxLength: 30, autoCapitalize: 'sentences' }}
          />
          <CategoryField
            label="Color"
            value={color}
            editable={false}
            helper="Referencia visual. El servidor no almacena el color."
          />
        </View>

        {demo ? (
          <Text style={styles.demoHint}>
            Respuesta DEMO 409 · conflicto simulado
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <CategoryActions
          primaryLabel="Crear categoría"
          onPrimary={() => onCreate?.(name.trim(), color.trim(), type)}
          secondaryLabel="Ver categorías"
          onSecondary={onViewCategories}
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
    backgroundColor: colors.categoriesWarningBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  bannerText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
    color: colors.categoriesWarningText,
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

export default Categories06Screen;
