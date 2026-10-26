// ============================================================
// Recharges_03 — Error de validación (400)
// Fuente visual: Stitch screen 433c1d81086e4c3da394622069349c6c
// ============================================================
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import RechargeAmountPills from '../../components/recharges/RechargeAmountPills';

export interface Recharges03ScreenProps {
  readonly onBack?: () => void;
  readonly onContinue?: () => void;
  readonly onSelectAmount?: (amountCents: number) => void;
}

export const Recharges03Screen: React.FC<Recharges03ScreenProps> = ({
  onBack,
  onContinue,
  onSelectAmount,
}) => {
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TransfersHeader title="Recargar" onBack={onBack} titleSize={24} />
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Revisa los datos ingresados (400).
          </Text>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amount}>$ 0</Text>
          <Text style={styles.note}>Ingresa un monto mayor a cero</Text>
        </View>

        <RechargeAmountPills
          selectedAmountCents={0}
          onChange={onSelectAmount}
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel="Continuar con la recarga"
        >
          <Text style={styles.primaryButtonText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.rechargesBg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 24,
  },
  banner: {
    width: '100%',
    backgroundColor: colors.rechargesErrorBg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  bannerText: {
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.rechargesError,
  },
  amountCard: {
    width: '100%',
    backgroundColor: colors.rechargesWhite,
    borderRadius: 26,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.rechargesShadow,
    shadowOpacity: 0.02,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  amount: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '700',
    color: colors.rechargesErrorBadgeText,
    letterSpacing: -1,
    marginBottom: 12,
  },
  note: {
    fontSize: 14,
    color: colors.rechargesMutedAlt,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  primaryButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.rechargesMagenta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.rechargesMagenta,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryButtonText: {
    color: colors.rechargesWhite,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Recharges03Screen;
