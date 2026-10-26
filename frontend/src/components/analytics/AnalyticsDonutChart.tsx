import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { CategoryExpenseItem } from '../../types/analytics';

export interface AnalyticsDonutChartProps {
  readonly totalFormatted: string;
  readonly currency: string;
  readonly categories: CategoryExpenseItem[];
}

export const AnalyticsDonutChart: React.FC<AnalyticsDonutChartProps> = ({
  totalFormatted,
  currency,
  categories,
}) => {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.chartWrapper}>
          {/* Web SVG native rendering - exact reproduction of Stitch */}
          {React.createElement(
            'svg',
            {
              viewBox: '0 0 220 220',
              style: {
                width: 220,
                height: 220,
                transform: 'rotate(-90deg)',
              },
              'aria-label': 'Distribución de gastos por categoría',
            },
            React.createElement('circle', {
              cx: '110',
              cy: '110',
              fill: 'transparent',
              r: '80',
              stroke: '#C2185B',
              strokeDasharray: '198 304.65',
              strokeDashoffset: '0',
              strokeWidth: '26',
            }),
            React.createElement('circle', {
              cx: '110',
              cy: '110',
              fill: 'transparent',
              r: '80',
              stroke: '#8468DB',
              strokeDasharray: '97.5 405.15',
              strokeDashoffset: '-201.06',
              strokeWidth: '26',
            }),
            React.createElement('circle', {
              cx: '110',
              cy: '110',
              fill: 'transparent',
              r: '80',
              stroke: '#D68932',
              strokeDasharray: '72.4 430.25',
              strokeDashoffset: '-301.59',
              strokeWidth: '26',
            }),
            React.createElement('circle', {
              cx: '110',
              cy: '110',
              fill: 'transparent',
              r: '80',
              stroke: '#2A9D8F',
              strokeDasharray: '122.6 380',
              strokeDashoffset: '-377',
              strokeWidth: '26',
            }),
          )}

          {/* Donut Hole Content */}
          <View style={styles.centerContent} pointerEvents="none">
            <Text style={styles.centerLabel}>Total gastado</Text>
            <Text style={styles.centerAmount}>{totalFormatted}</Text>
            <Text style={styles.centerCurrency}>{currency}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Native fallback using styled layered circles/borders
  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <View style={styles.nativeDonutRing}>
          <View style={[styles.nativeSegment, { borderColor: '#C2185B' }]} />
          <View style={[styles.nativeSegmentAlt, { borderColor: '#2A9D8F' }]} />
        </View>

        <View style={styles.centerContent} pointerEvents="none">
          <Text style={styles.centerLabel}>Total gastado</Text>
          <Text style={styles.centerAmount}>{totalFormatted}</Text>
          <Text style={styles.centerCurrency}>{currency}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chartWrapper: {
    width: 220,
    height: 220,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 2,
  },
  centerAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.analyticsTextDark,
    letterSpacing: -0.5,
  },
  centerCurrency: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 2,
  },
  nativeDonutRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 24,
    borderColor: '#C2185B',
    position: 'relative',
  },
  nativeSegment: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 24,
    borderColor: '#8468DB',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  nativeSegmentAlt: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 24,
    borderColor: '#2A9D8F',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '120deg' }],
  },
});

export default AnalyticsDonutChart;
