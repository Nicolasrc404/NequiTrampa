// ============================================================
// Analytics_02 — Periodo personalizado con error
// Fuente visual: Stitch screen 63633e32d6a14baabf83078780ac3af0
// ============================================================
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../../theme/colors';
import AnalyticsHeader from '../../components/analytics/AnalyticsHeader';
import AnalyticsTabs from '../../components/analytics/AnalyticsTabs';
import AnalyticsPeriodSelector from '../../components/analytics/AnalyticsPeriodSelector';
import BottomNav from '../../components/common/BottomNav';
import { AnalyticsTab } from '../../types/analytics';

export interface Analytics02ScreenProps {
  readonly onBack?: () => void;
  readonly onSelectTab?: (tab: AnalyticsTab) => void;
  readonly onSubmit?: () => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
}

export const Analytics02Screen: React.FC<Analytics02ScreenProps> = ({
  onBack,
  onSelectTab,
  onSubmit,
  onTabPress,
}) => {
  const [desde, setDesde] = useState('30/09/2026');
  const [hasta, setHasta] = useState('01/09/2026');

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
          periodValue="Periodo personalizado"
        />

        <Text style={styles.sectionTitle}>Resumen financiero</Text>

        {/* Error Alert Banner */}
        <View style={styles.alertBanner}>
          <Text style={styles.alertTitle}>Revisa el periodo</Text>
          <Text style={styles.alertText}>
            La fecha final debe ser posterior a la inicial.
          </Text>
        </View>

        {/* Date Inputs */}
        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Desde</Text>
          <TextInput
            style={styles.input}
            value={desde}
            onChangeText={setDesde}
            editable={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Hasta</Text>
          <TextInput
            style={[styles.input, styles.inputError]}
            value={hasta}
            onChangeText={setHasta}
          />
          <Text style={styles.inputErrorText}>
            Elige una fecha posterior al 30/09/2026.
          </Text>
        </View>

        <Text style={styles.helperNote}>
          Ajusta las fechas para consultar tu resumen.{'\n'}No se modificará
          ningún movimiento.
        </Text>

        {/* Submit Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.8}
            onPress={onSubmit}
            accessibilityRole="button"
            accessibilityLabel="Consultar resumen"
          >
            <Text style={styles.buttonText}>Consultar resumen</Text>
          </TouchableOpacity>
          <Text style={styles.footnote}>
            Solo consulta · tus saldos no cambian
          </Text>
        </View>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.analyticsTextDark,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  alertBanner: {
    backgroundColor: colors.analyticsErrorBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 20,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.analyticsErrorTitle,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.analyticsErrorText,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    color: colors.analyticsTextDark,
  },
  inputError: {
    borderColor: colors.analyticsErrorText,
  },
  inputErrorText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.analyticsErrorText,
    marginTop: 6,
    marginLeft: 2,
  },
  helperNote: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.analyticsMuted,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 24,
  },
  actionContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: colors.analyticsMagenta,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.analyticsMagenta,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  footnote: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.analyticsMuted,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default Analytics02Screen;
