// ============================================================
// Categories_01 — Listado de Categorías
// Fuente visual: Stitch screen e92c1d65555d4cb79a1cea28f14a89d0
// Título: "Categories_01 - Listado de Categorías"
// ============================================================
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../../theme/colors';
import BottomNav from '../../components/common/BottomNav';
import BackButton from '../../components/categories/BackButton';
import { CategoryItem, CategoryType } from '../../types/categories';
import {
  DEMO_EXPENSE_CATEGORIES,
  DEMO_INCOME_CATEGORIES,
} from '../../data/demoCategories';

export interface Categories01ScreenProps {
  readonly onBack?: () => void;
  readonly onCreate?: () => void;
  readonly onSelectCategory?: (category: CategoryItem) => void;
}

type CategoryTab = 'gastos' | 'ingresos';

export const Categories01Screen: React.FC<Categories01ScreenProps> = ({
  onBack,
  onCreate,
  onSelectCategory,
}) => {
  const [activeTab, setActiveTab] = useState<CategoryTab>('gastos');

  const categories =
    activeTab === 'gastos' ? DEMO_EXPENSE_CATEGORIES : DEMO_INCOME_CATEGORIES;

  const type: CategoryType = activeTab === 'gastos' ? 'gasto' : 'ingreso';

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BackButton onPress={onBack} />
            <Text style={styles.title}>Categorías</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onCreate}
            accessibilityRole="button"
            accessibilityLabel="Crear categoría"
          >
            <Text style={styles.createLink}>Crear</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'gastos' ? styles.tabActive : styles.tabInactive,
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('gastos')}
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'gastos' }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'gastos'
                  ? styles.tabTextActive
                  : styles.tabTextInactive,
              ]}
            >
              Gastos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'ingresos' ? styles.tabActive : styles.tabInactive,
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('ingresos')}
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'ingresos' }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'ingresos'
                  ? styles.tabTextActive
                  : styles.tabTextInactive,
              ]}
            >
              Ingresos
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          {categories.map((item, index) => (
            <React.Fragment key={item.id}>
              <Pressable
                style={({ pressed }) => [
                  styles.categoryRow,
                  pressed ? styles.categoryRowPressed : null,
                ]}
                onPress={() => onSelectCategory?.(item)}
                accessibilityRole="button"
                accessibilityLabel={`Categoría ${item.name}, ${item.movementsCount} movimientos, ${item.formattedAmount}`}
              >
                <View style={styles.categoryLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.initialLetter}</Text>
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{item.name}</Text>
                    <Text style={styles.categoryMeta}>
                      {item.movementsCount} movimientos
                    </Text>
                  </View>
                </View>
                <Text style={styles.amount}>{item.formattedAmount}</Text>
              </Pressable>
              {index < categories.length - 1 ? (
                <View style={styles.divider} />
              ) : null}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.demoHint}>
          Datos DEMO · tipo {type === 'gasto' ? 'gastos' : 'ingresos'}
        </Text>
      </ScrollView>

      <BottomNav activeTab="inicio" />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.categoriesBgList,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.categoriesDarkList,
    letterSpacing: -0.4,
  },
  createLink: {
    fontSize: 15.5,
    fontWeight: '600',
    color: colors.categoriesMagenta,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.categoriesDarkList,
    shadowColor: colors.categoriesShadow,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabInactive: {
    backgroundColor: colors.white,
    shadowColor: colors.categoriesShadow,
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: colors.white,
  },
  tabTextInactive: {
    color: colors.categoriesDarkList,
  },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.categoriesCardBorder,
    shadowColor: colors.categoriesShadow,
    shadowOpacity: 0.03,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  categoryRowPressed: {
    opacity: 0.7,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.categoriesBadgeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.categoriesBadgeText,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.categoriesDarkList,
    lineHeight: 21,
  },
  categoryMeta: {
    fontSize: 14,
    color: colors.categoriesSubtext,
    marginTop: 2,
  },
  amount: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.categoriesDarkList,
    letterSpacing: -0.3,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.categoriesBorder,
  },
  demoHint: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.grayNavInactive,
    textTransform: 'uppercase',
  },
});

export default Categories01Screen;
