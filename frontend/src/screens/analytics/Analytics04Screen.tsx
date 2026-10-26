// ============================================================
// Analytics_04 — No pudimos cargar tu resumen (500)
// Fuente visual: Stitch screen f763f4d2560a4755aa57e60ee0396df8
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import AnalyticsHeader from '../../components/analytics/AnalyticsHeader';
import AnalyticsTabs from '../../components/analytics/AnalyticsTabs';
import AnalyticsPeriodSelector from '../../components/analytics/AnalyticsPeriodSelector';
import AnalyticsErrorCard from '../../components/analytics/AnalyticsErrorCard';
import BottomNav from '../../components/common/BottomNav';
import { AnalyticsTab } from '../../types/analytics';

export interface Analytics04ScreenProps {
  readonly onBack?: () => void;
  readonly onSelectTab?: (tab: AnalyticsTab) => void;
  readonly onRetry?: () => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
}

export const Analytics04Screen: React.FC<Analytics04ScreenProps> = ({
  onBack,
  onSelectTab,
  onRetry,
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

        <AnalyticsTabs activeTab="resumen" onSelectTab={onSelectTab} />

        <AnalyticsPeriodSelector
          periodLabel="Periodo"
          periodValue="Septiembre de 2026"
        />

        <Text style={styles.sectionTitle}>Resumen financiero</Text>

        <AnalyticsErrorCard
          title="No pudimos cargar tu resumen"
          description="Tu información sigue segura. No pudimos consultar el resumen de septiembre. Intenta nuevamente en unos minutos."
          periodLabel="Periodo seleccionado: septiembre de 2026"
          onRetry={onRetry}
        />
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
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.analyticsTextDark,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
});

export default Analytics04Screen;
