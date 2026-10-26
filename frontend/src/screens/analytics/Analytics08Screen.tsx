// ============================================================
// Analytics_08 — Tendencias de ingresos y gastos
// Fuente visual: Stitch screen 608b03afc5af4b8ba5eca74e8e7326f6
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import AnalyticsHeader from '../../components/analytics/AnalyticsHeader';
import AnalyticsTabs from '../../components/analytics/AnalyticsTabs';
import AnalyticsPeriodSelector from '../../components/analytics/AnalyticsPeriodSelector';
import AnalyticsWeeklyBarChart from '../../components/analytics/AnalyticsWeeklyBarChart';
import BottomNav from '../../components/common/BottomNav';
import { DEMO_TREND_DATA } from '../../data/demoAnalytics';
import { AnalyticsTab } from '../../types/analytics';

export interface Analytics08ScreenProps {
  readonly onBack?: () => void;
  readonly onSelectTab?: (tab: AnalyticsTab) => void;
  readonly onSelectPeriod?: () => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
}

export const Analytics08Screen: React.FC<Analytics08ScreenProps> = ({
  onBack,
  onSelectTab,
  onSelectPeriod,
  onTabPress,
}) => {
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AnalyticsHeader onBack={onBack} />

        <AnalyticsTabs activeTab="tendencias" onSelectTab={onSelectTab} />

        <AnalyticsPeriodSelector
          periodLabel="Periodo"
          periodValue={DEMO_TREND_DATA.period}
          onPress={onSelectPeriod}
        />

        {/* Section Heading */}
        <View style={styles.headingSection}>
          <Text style={styles.headingTitle}>Tendencias</Text>
          <Text style={styles.headingSubtitle}>
            Compara tus ingresos y gastos por semana
          </Text>
        </View>

        {/* Comparative Trends Bar Chart */}
        <AnalyticsWeeklyBarChart
          title={DEMO_TREND_DATA.period}
          data={DEMO_TREND_DATA.weeklyTrends}
          showYAxis={true}
          incomeColor="#138048"
          expenseColor={colors.analyticsMagentaAlt}
          currencyLabel={DEMO_TREND_DATA.currency}
        />

        {/* Insight Card (Mint Green) */}
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>{DEMO_TREND_DATA.insightTitle}</Text>
          <Text style={styles.insightDesc}>
            {DEMO_TREND_DATA.insightDescription}
          </Text>
        </View>

        {/* Comparison Summary Card */}
        <View style={styles.comparisonCard}>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>
              {DEMO_TREND_DATA.incomeComparisonLabel}
            </Text>
            <Text style={styles.comparisonAmount}>
              {DEMO_TREND_DATA.incomeComparisonCurrentFormatted}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>
              {DEMO_TREND_DATA.previousMonthLabel}
            </Text>
            <Text style={styles.comparisonAmount}>
              {DEMO_TREND_DATA.previousMonthIncomeFormatted}
            </Text>
          </View>
        </View>

        <Text style={styles.footnote}>
          Solo consulta · tus saldos no cambian
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
  insightCard: {
    backgroundColor: colors.analyticsMintBg,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginBottom: 16,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.analyticsMintText,
    marginBottom: 6,
  },
  insightDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.analyticsMintText,
    lineHeight: 20,
    opacity: 0.9,
  },
  comparisonCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  comparisonLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#4B5563',
  },
  comparisonAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.analyticsTextDark,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
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

export default Analytics08Screen;
