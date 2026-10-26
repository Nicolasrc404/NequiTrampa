// ============================================================
// Categories_05 — Categoría creada (201)
// Fuente visual: Stitch screen 6b242457998747e893680e9727afd24b
// ============================================================
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import CategoryActions from '../../components/categories/CategoryActions';

export interface Categories05ScreenProps {
  readonly categoryName?: string;
  readonly onCreateBudget?: () => void;
  readonly onViewCategories?: () => void;
}

export const Categories05Screen: React.FC<Categories05ScreenProps> = ({
  categoryName = 'Mercado',
  onCreateBudget,
  onViewCategories,
}) => {
  return (
    <View style={styles.root}>
      <View style={styles.body}>
        <View style={styles.successCircle}>
          <Feather
            name="check"
            size={42}
            color={colors.categoriesSuccessIcon}
          />
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>201</Text>
        </View>

        <Text style={styles.headline}>¡Categoría creada!</Text>

        <Text style={styles.description}>
          La categoría{' '}
          <Text style={styles.highlight}>{categoryName}</Text> está lista para
          usarse en tus movimientos.
        </Text>
      </View>

      <View style={styles.footer}>
        <CategoryActions
          primaryLabel="Crear presupuesto"
          onPrimary={onCreateBudget}
          secondaryLabel="Ver categorías"
          onSecondary={onViewCategories}
        />
        <Text style={styles.demoHint}>
          Respuesta DEMO 201 · no se ejecutó una operación real
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.categoriesBg,
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.categoriesSuccessBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.categoriesSuccessIcon,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  statusPill: {
    backgroundColor: colors.categoriesSuccessPillBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 18,
  },
  statusText: {
    color: colors.categoriesSuccessPillText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.categoriesDark,
    textAlign: 'center',
    letterSpacing: -0.7,
    marginBottom: 12,
  },
  description: {
    maxWidth: 310,
    fontSize: 16,
    lineHeight: 24,
    color: colors.categoriesSuccessText,
    textAlign: 'center',
  },
  highlight: {
    fontWeight: '700',
    color: colors.categoriesDark,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
  },
  demoHint: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.grayNavInactive,
    textTransform: 'uppercase',
  },
});

export default Categories05Screen;
