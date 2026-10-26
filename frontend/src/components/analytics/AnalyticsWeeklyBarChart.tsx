import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { WeeklyBarData } from '../../types/analytics';

export interface AnalyticsWeeklyBarChartProps {
  readonly title: string;
  readonly data: WeeklyBarData[];
  readonly showYAxis?: boolean;
  readonly incomeColor?: string;
  readonly expenseColor?: string;
  readonly currencyLabel?: string;
}

export const AnalyticsWeeklyBarChart: React.FC<AnalyticsWeeklyBarChartProps> = ({
  title,
  data,
  showYAxis = false,
  incomeColor = colors.analyticsTeal,
  expenseColor = colors.analyticsMagenta,
  currencyLabel,
}) => {
  return (
    <View style={styles.card}>
      {/* Chart Header & Legend */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: incomeColor }]} />
            <Text style={styles.legendText}>Ingresos</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: expenseColor }]} />
            <Text style={styles.legendText}>Gastos</Text>
          </View>
          {currencyLabel ? (
            <Text style={styles.currencyBadge}>{currencyLabel}</Text>
          ) : null}
        </View>
      </View>

      {/* Chart Canvas Area */}
      <View style={styles.chartArea}>
        {/* Horizontal grid lines & optional Y-axis labels */}
        <View style={styles.gridLinesContainer}>
          <View style={styles.gridRow}>
            {showYAxis && <Text style={styles.yAxisLabel}>1 M</Text>}
            <View style={styles.gridLine} />
          </View>
          <View style={styles.gridRow}>
            {showYAxis && <Text style={styles.yAxisLabelSmall}>500 mil</Text>}
            <View style={styles.gridLine} />
          </View>
          <View style={styles.gridRow}>
            {showYAxis && <Text style={styles.yAxisLabel}>0</Text>}
            <View style={[styles.gridLine, styles.gridLineBase]} />
          </View>
        </View>

        {/* Bars Container */}
        <View
          style={[
            styles.barsContainer,
            showYAxis ? { marginLeft: 56, marginRight: 12 } : { paddingHorizontal: 12 },
          ]}
        >
          {data.map((item) => (
            <View key={item.week} style={styles.weekColumn}>
              <View style={styles.dualBars}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.min(100, Math.max(8, item.incomePct))}%`,
                      backgroundColor: incomeColor,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.min(100, Math.max(8, item.expensePct))}%`,
                      backgroundColor: expenseColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.weekLabel}>{item.week}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.analyticsTextDark,
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.analyticsMuted,
  },
  currencyBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.analyticsMuted,
    marginLeft: 4,
  },
  chartArea: {
    height: 140,
    position: 'relative',
    justifyContent: 'flex-end',
    paddingBottom: 22,
  },
  gridLinesContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingBottom: 22,
    zIndex: 1,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yAxisLabel: {
    width: 48,
    textAlign: 'right',
    paddingRight: 8,
    fontSize: 11,
    color: '#9CA3AF',
  },
  yAxisLabelSmall: {
    width: 48,
    textAlign: 'right',
    paddingRight: 8,
    fontSize: 10,
    color: '#9CA3AF',
  },
  gridLine: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  gridLineBase: {
    borderTopColor: '#E2E8F0',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 110,
    zIndex: 2,
  },
  weekColumn: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  dualBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 90,
  },
  bar: {
    width: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 6,
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.analyticsMuted,
    marginTop: 8,
  },
});

export default AnalyticsWeeklyBarChart;
