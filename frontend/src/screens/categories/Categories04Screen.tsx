// ============================================================
// Categories_04 — Editar categoría
// Fuente visual: Stitch screen a14136e6f4b34ca6ae1be6de903b365f
// ============================================================
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../../theme/colors';
import BackButton from '../../components/categories/BackButton';
import CategoryActions from '../../components/categories/CategoryActions';
import CategoryField from '../../components/categories/CategoryField';
import CategoryTypeSelector from '../../components/categories/CategoryTypeSelector';
import { CategoryType } from '../../types/categories';

export interface Categories04ScreenProps {
  readonly categoryName?: string;
  readonly categoryColor?: string;
  readonly categoryType?: CategoryType;
  readonly onBack?: () => void;
  readonly onSave?: (name: string, color: string, type: CategoryType) => void;
  readonly onDelete?: () => void;
  readonly onCancel?: () => void;
  /** Una categoría del sistema no se puede desactivar. */
  readonly isSystem?: boolean;
  /** Bloquea el formulario mientras el servidor confirma. */
  readonly submitting?: boolean;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Categories04Screen: React.FC<Categories04ScreenProps> = ({
  categoryName = 'Mercado',
  categoryColor = 'Magenta',
  categoryType = 'gasto',
  onBack,
  onSave,
  onDelete,
  onCancel,
  isSystem = false,
  submitting = false,
  demo = true,
}) => {
  const [name, setName] = useState(categoryName);
  const [color, setColor] = useState(categoryColor);
  const [type] = useState<CategoryType>(categoryType);

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
          <View style={styles.headerLeft}>
            <BackButton onPress={onBack} />
            <Text style={styles.title}>Editar categoría</Text>
          </View>
          {isSystem ? (
            <Text style={styles.systemBadge}>Sistema</Text>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel="Eliminar categoría"
            >
              <Text style={styles.deleteLink}>Eliminar</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.typeWrap}>
          <CategoryTypeSelector
            selected={type}
            compact
            disabled
          />
          <Text style={styles.typeHint}>
            El tipo no se puede cambiar: reclasificaría tus movimientos
            históricos.
          </Text>
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
            Vista DEMO · los cambios no se guardan en el backend
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <CategoryActions
          primaryLabel={submitting ? 'Guardando…' : 'Guardar cambios'}
          onPrimary={() => onSave?.(name.trim(), color.trim(), type)}
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
    paddingTop: 36,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  title: {
    fontSize: 23,
    fontWeight: '700',
    color: colors.categoriesPillDark,
    letterSpacing: -0.4,
    flexShrink: 1,
  },
  deleteLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.categoriesMagenta,
  },
  systemBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.categoriesLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  typeWrap: {
    marginBottom: 28,
  },
  typeHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: colors.categoriesLabel,
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

export default Categories04Screen;
