// ============================================================
// Analytics_05 — Gastos por categoría
// Fuente visual: Stitch screen bc45442c6ecc4d7f9c40d6ae778eeb25
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import AnalyticsHeader from '../../components/analytics/AnalyticsHeader';
import AnalyticsTabs from '../../components/analytics/AnalyticsTabs';
import AnalyticsPeriodSelector from '../../components/analytics/AnalyticsPeriodSelector';
import AnalyticsDonutChart from '../../components/analytics/AnalyticsDonutChart';
import LoadingState from '../../components/common/states/LoadingState';
import BottomNav from '../../components/common/BottomNav';
import { DEMO_CATEGORY_DATA } from '../../data/demoAnalytics';
import { AnalyticsTab } from '../../types/analytics';
import type { AnalyticsCategoryData } from '../../types/analytics';

export interface Analytics05ScreenProps {
  readonly onBack?: () => void;
  readonly onSelectTab?: (tab: AnalyticsTab) => void;
  readonly onSelectPeriod?: () => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
  readonly categories?: AnalyticsCategoryData;
  readonly demo?: boolean;
  readonly loading?: boolean;
}

export const Analytics05Screen: React.FC<Analytics05ScreenProps> = ({
  onBack,
  onSelectTab,
  onSelectPeriod,
  onTabPress,
  categories,
  demo = true,
  loading = false,
}) => {
  if (loading) {
    return <LoadingState message="Cargando categorías…" hint="Consultando gastos confirmados." />;
  }
  const data = categories ?? DEMO_CATEGORY_DATA;
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AnalyticsHeader onBack={onBack} />

        <AnalyticsTabs activeTab="categorias" onSelectTab={onSelectTab} />

        <AnalyticsPeriodSelector
          periodLabel="Periodo"
          periodValue={data.period}
          onPress={onSelectPeriod}
        />

        {/* Section Heading */}
        <View style={styles.headingSection}>
          <Text style={styles.headingTitle}>Gastos por categoría</Text>
          <Text style={styles.headingSubtitle}>
            {data.periodSubtitle}
          </Text>
        </View>

        {/* Donut Chart Card */}
        <AnalyticsDonutChart
          totalFormatted={data.totalExpenseFormatted}
          currency={data.currency}
          categories={data.categories}
        />

        {/* Category Breakdown List */}
        <View style={styles.listCard}>
          {data.categories.map((item, index) => (
            <React.Fragment key={item.id}>
              <View style={styles.listItem}>
                <View style={styles.itemLeft}>
                  <View
                    style={[styles.categoryDot, { backgroundColor: item.color }]}
                  />
                  <View>
                    <Text style={styles.categoryName}>{item.name}</Text>
                    <Text style={styles.categoryAmount}>
                      {item.amountFormatted}
                    </Text>
                  </View>
                </View>
                <Text style={styles.categoryPct}>{item.percentage}%</Text>
              </View>
              {index < data.categories.length - 1 && (
                <View style={styles.divider} />
              )}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.footnote}>
          {data.dataNote ?? 'Solo consulta · tus saldos no cambian'}
        </Text>
      </ScrollView>

      <BottomNav activeTab="movimientos" onTabPress={onTabPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.analyticsBg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 90,
  },
  headingSection: {
    marginBottom: 16,
  },
  headingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.analyticsTextDark,
    letterSpacing: -0.4,
  },
  headingSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.analyticsMuted,
    marginTop: 2,
  },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.analyticsTextDark,
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.analyticsMuted,
    marginTop: 2,
  },
  categoryPct: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.analyticsTextDark,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 2,
  },
  footnote: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.analyticsMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
});

export default Analytics05Screen;
