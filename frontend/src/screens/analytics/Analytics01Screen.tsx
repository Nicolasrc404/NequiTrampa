// ============================================================
// Analytics_01 — Resumen financiero
// Fuente visual: Stitch screen a6e790a3870d43c0ad2d94f14e80615d
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import AnalyticsHeader from '../../components/analytics/AnalyticsHeader';
import AnalyticsTabs from '../../components/analytics/AnalyticsTabs';
import AnalyticsPeriodSelector from '../../components/analytics/AnalyticsPeriodSelector';
import AnalyticsWeeklyBarChart from '../../components/analytics/AnalyticsWeeklyBarChart';
import LoadingState from '../../components/common/states/LoadingState';
import BottomNav from '../../components/common/BottomNav';
import { DEMO_SUMMARY_DATA } from '../../data/demoAnalytics';
import { AnalyticsTab } from '../../types/analytics';
import type { AnalyticsSummaryData } from '../../types/analytics';

export interface Analytics01ScreenProps {
  readonly onBack?: () => void;
  readonly onSelectTab?: (tab: AnalyticsTab) => void;
  readonly onSelectPeriod?: () => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
  /** Resumen confirmado por el backend. Si se omite, se usa el DEMO. */
  readonly summary?: AnalyticsSummaryData;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
  readonly loading?: boolean;
}

export const Analytics01Screen: React.FC<Analytics01ScreenProps> = ({
  onBack,
  onSelectTab,
  onSelectPeriod,
  onTabPress,
  summary,
  demo: _demo = true,
  loading = false,
}) => {
  if (loading) {
    return (
      <LoadingState
        message="Cargando resumen…"
        hint="Consultando datos confirmados."
      />
    );
  }
  const data = summary ?? DEMO_SUMMARY_DATA;
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AnalyticsHeader onBack={onBack} />

        <AnalyticsTabs
          activeTab="resumen"
          onSelectTab={onSelectTab}
        />

        <AnalyticsPeriodSelector
          periodLabel="Periodo"
          periodValue={data.period}
          onPress={onSelectPeriod}
        />

        {/* Section Heading */}
        <View style={styles.headingSection}>
          <Text style={styles.headingTitle}>Resumen financiero</Text>
          <Text style={styles.headingSubtitle}>
            Tu comportamiento en el periodo · {data.currency}
          </Text>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Diferencia del periodo</Text>
          <Text style={styles.heroAmount}>
            {data.differenceFormatted}
          </Text>
          <Text style={styles.heroNote}>{data.differenceNote}</Text>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>
              {data.statusPillText}
            </Text>
          </View>
        </View>

        {/* Income / Expense 2-column Grid */}
        <View style={styles.gridRow}>
          <View style={styles.gridCard}>
            <Text style={styles.gridLabel}>Ingresos</Text>
            <Text style={styles.gridAmount}>
              {data.totalIncomeFormatted}
            </Text>
          </View>
          <View style={styles.gridCard}>
            <Text style={styles.gridLabel}>Gastos</Text>
            <Text style={styles.gridAmount}>
              {data.totalExpenseFormatted}
            </Text>
          </View>
        </View>

        {/* Monthly Movement Chart */}
        <AnalyticsWeeklyBarChart
          title="Así se movió tu mes"
          data={data.weeklyMovements}
          incomeColor={colors.analyticsTeal}
          expenseColor={colors.analyticsMagenta}
        />

        {/* Top Expense Card */}
        <View style={styles.topExpenseCard}>
          <View>
            <Text style={styles.topExpenseLabel}>Tu gasto principal</Text>
            <Text style={styles.topExpenseCategory}>
              {data.topExpenseCategory}
            </Text>
          </View>
          <Text style={styles.topExpenseAmount}>
            {data.topExpenseFormatted}
          </Text>
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
    color: colors.analyticsDark,
    letterSpacing: -0.4,
  },
  headingSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.analyticsMuted,
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: colors.analyticsDark,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#D1D5DB',
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.6,
    marginVertical: 4,
  },
  heroNote: {
    fontSize: 11,
    fontWeight: '400',
    color: '#D1D5DB',
    marginBottom: 14,
  },
  heroPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#F3F4F6',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  gridCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.analyticsMuted,
    marginBottom: 4,
  },
  gridAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.analyticsTextDark,
  },
  topExpenseCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  topExpenseLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.analyticsMuted,
  },
  topExpenseCategory: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.analyticsTextDark,
    marginTop: 2,
  },
  topExpenseAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.analyticsMagenta,
  },
  footnote: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.analyticsMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
});

export default Analytics01Screen;
