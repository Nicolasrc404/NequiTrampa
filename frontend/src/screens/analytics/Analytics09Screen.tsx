// ============================================================
// Analytics_09 — Tu sesión venció (401 Tendencias)
// Fuente visual: Stitch screen 650b2d29e58b422eb8c938094f2f866d
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import AnalyticsHeader from '../../components/analytics/AnalyticsHeader';
import AnalyticsTabs from '../../components/analytics/AnalyticsTabs';
import AnalyticsPeriodSelector from '../../components/analytics/AnalyticsPeriodSelector';
import AnalyticsSessionExpiredCard from '../../components/analytics/AnalyticsSessionExpiredCard';
import BottomNav from '../../components/common/BottomNav';
import { AnalyticsTab } from '../../types/analytics';

export interface Analytics09ScreenProps {
  readonly onBack?: () => void;
  readonly onSelectTab?: (tab: AnalyticsTab) => void;
  readonly onLoginPress?: () => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
}

export const Analytics09Screen: React.FC<Analytics09ScreenProps> = ({
  onBack,
  onSelectTab,
  onLoginPress,
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
          periodValue="Septiembre de 2026"
        />

        <Text style={styles.sectionTitle}>Tendencias</Text>

        <AnalyticsSessionExpiredCard
          description="Por seguridad cerramos tu sesión. Inicia sesión nuevamente para consultar tus tendencias."
          periodLabel="Periodo seleccionado: septiembre de 2026"
          onLoginPress={onLoginPress}
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

export default Analytics09Screen;
