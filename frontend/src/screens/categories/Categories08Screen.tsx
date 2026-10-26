// ============================================================
// Categories_08 — Confirmar eliminación de categoría
// Fuente visual: Stitch screen 3067cbdba3dd407280c449a7d011282e
// ============================================================
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import BackButton from '../../components/categories/BackButton';
import CategoryActions from '../../components/categories/CategoryActions';
import CategoryField from '../../components/categories/CategoryField';
import CategoryTypeSelector from '../../components/categories/CategoryTypeSelector';

export interface Categories08ScreenProps {
  readonly categoryName?: string;
  readonly onConfirmDelete?: () => void;
  readonly onCancel?: () => void;
  /** Bloquea la acción mientras el servidor confirma (DELETE 204). */
  readonly submitting?: boolean;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Categories08Screen: React.FC<Categories08ScreenProps> = ({
  categoryName = 'Mercado',
  onConfirmDelete,
  onCancel,
  submitting = false,
  demo = true,
}) => {
  return (
    <View style={styles.root}>
      {/* Fondo atenuado: edición de la categoría */}
      <View style={styles.background} pointerEvents="none">
        <View style={styles.bgHeader}>
          <View style={styles.bgHeaderLeft}>
            <BackButton />
            <Text style={styles.bgTitle}>Editar categoría</Text>
          </View>
          <Text style={styles.bgDeleteLink}>Eliminar</Text>
        </View>

        <View style={styles.bgTypeWrap}>
          <CategoryTypeSelector selected="gasto" compact />
        </View>

        <View style={styles.bgForm}>
          <CategoryField label="Nombre" value={categoryName} editable={false} />
          <CategoryField label="Color" value="Magenta" editable={false} />
        </View>

        <View style={styles.bgActions}>
          <CategoryActions
            primaryLabel="Guardar cambios"
            secondaryLabel="Cancelar"
          />
        </View>
      </View>

      <View style={styles.overlay} />

      {/* Bottom sheet de confirmación */}
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.trashCircle}>
          <Feather name="trash-2" size={30} color={colors.categoriesMagenta} />
        </View>

        <Text style={styles.sheetTitle}>¿Eliminar categoría?</Text>
        <Text style={styles.sheetDescription}>
          La categoría <Text style={styles.sheetHighlight}>{categoryName}</Text>{' '}
          se desactiva y deja de estar disponible para nuevos movimientos. Tu
          historial se conserva.
        </Text>

        <View style={styles.sheetActions}>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              submitting ? styles.deleteButtonDisabled : null,
            ]}
            activeOpacity={submitting ? 1 : 0.85}
            onPress={submitting ? undefined : onConfirmDelete}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting }}
            accessibilityLabel="Eliminar categoría"
          >
            <Text style={styles.deleteButtonText}>
              {submitting ? 'Eliminando…' : 'Eliminar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.75}
            onPress={submitting ? undefined : onCancel}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Cancelar eliminación"
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        {demo ? (
          <Text style={styles.demoHint}>
            Vista DEMO · la categoría no se elimina del backend
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.categoriesBg,
  },
  background: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
    opacity: 0.55,
  },
  bgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
    gap: 12,
  },
  bgHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  bgTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: colors.categoriesPillDark,
    letterSpacing: -0.4,
  },
  bgDeleteLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.categoriesMagenta,
  },
  bgTypeWrap: {
    marginBottom: 28,
  },
  bgForm: {
    gap: 18,
  },
  bgActions: {
    marginTop: 28,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.categoriesOverlay,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
    shadowColor: colors.categoriesShadow,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.categoriesHandle,
    marginBottom: 22,
  },
  trashCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.categoriesDeleteBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.categoriesDark,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  sheetDescription: {
    maxWidth: 330,
    fontSize: 14,
    lineHeight: 21,
    color: colors.categoriesSheetText,
    textAlign: 'center',
    marginBottom: 24,
  },
  sheetHighlight: {
    fontWeight: '700',
    color: colors.categoriesDark,
  },
  sheetActions: {
    width: '100%',
    gap: 12,
  },
  deleteButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.categoriesMagenta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.categoriesMagenta,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: colors.white,
    fontSize: 16.5,
    fontWeight: '700',
  },
  cancelButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.categoriesSheetBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.categoriesPillDark,
    fontSize: 16.5,
    fontWeight: '600',
  },
  demoHint: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.grayNavInactive,
    textTransform: 'uppercase',
  },
});

export default Categories08Screen;
