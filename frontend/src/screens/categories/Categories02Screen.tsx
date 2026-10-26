// ============================================================
// Categories_02 — Aún no tienes categorías (Empty State)
// Fuente visual: Stitch screen 6e1c83a2d62444a489c59a3849ac809a
// ============================================================
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import BottomNav from '../../components/common/BottomNav';
import BackButton from '../../components/categories/BackButton';

export interface Categories02ScreenProps {
  readonly onBack?: () => void;
  readonly onCreateCategory?: () => void;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Categories02Screen: React.FC<Categories02ScreenProps> = ({
  onBack,
  onCreateCategory,
  demo = true,
}) => {
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <View style={styles.header}>
          <BackButton onPress={onBack} />
          <Text style={styles.title}>Categorías</Text>
        </View>

        <View style={styles.emptyState}>
          <View style={styles.iconCircle}>
            <Feather name="tag" size={38} color={colors.categoriesBadgeText} />
          </View>
          <Text style={styles.headline}>Aún no tienes categorías</Text>
          <Text style={styles.description}>
            Crea categorías como Mercado o Transporte para ordenar tus gastos y
            armar presupuestos.
          </Text>
        </View>

        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={styles.cta}
            activeOpacity={0.85}
            onPress={onCreateCategory}
            accessibilityRole="button"
            accessibilityLabel="Crear categoría"
          >
            <Text style={styles.ctaText}>Crear categoría</Text>
          </TouchableOpacity>
          {demo ? (
            <Text style={styles.demoHint}>Vista DEMO · sin operaciones reales</Text>
          ) : null}
        </View>
      </View>

      <BottomNav activeTab="inicio" />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.categoriesBg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 104,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.categoriesDark,
    letterSpacing: -0.4,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: -12,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.categoriesEmptyIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  headline: {
    fontSize: 25,
    fontWeight: '700',
    color: colors.categoriesDark,
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 31,
    marginBottom: 12,
  },
  description: {
    maxWidth: 310,
    fontSize: 16,
    lineHeight: 23,
    color: colors.categoriesEmptyText,
    textAlign: 'center',
  },
  ctaWrap: {
    paddingTop: 24,
  },
  cta: {
    width: '100%',
    backgroundColor: colors.categoriesMagenta,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: colors.categoriesShadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  ctaText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
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

export default Categories02Screen;
