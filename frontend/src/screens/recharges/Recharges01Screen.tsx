// ============================================================
// Recharges_01 — Recargar
// Fuente visual: Stitch screen d461575caee4428886a0331bb24dc92e
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
import {
  DEMO_RECHARGE_MAX_CENTS,
  formatRechargeAmount,
} from '../../data/demoRecharges';

export interface Recharges01ScreenProps {
  readonly amountCents: number;
  readonly onAmountChange?: (amountCents: number) => void;
  readonly onBack?: () => void;
  readonly onContinue?: () => void;
}

export const Recharges01Screen: React.FC<Recharges01ScreenProps> = ({
  amountCents,
  onAmountChange,
  onBack,
  onContinue,
}) => {
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TransfersHeader title="Recargar" onBack={onBack} titleSize={22} />
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.question}>¿Cuánto quieres recargar?</Text>
          <Text style={styles.amount}>
            {formatRechargeAmount(amountCents)}
          </Text>
          <Text style={styles.note}>
            Recarga simulada · Máximo {formatRechargeAmount(DEMO_RECHARGE_MAX_CENTS)}
          </Text>
        </View>

        <RechargeAmountPills
          selectedAmountCents={amountCents}
          onChange={onAmountChange}
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
    backgroundColor: colors.rechargesBgForm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 24,
  },
  amountCard: {
    backgroundColor: colors.rechargesWhite,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.rechargesShadow,
    shadowOpacity: 0.02,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  question: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.rechargesMuted,
    marginBottom: 8,
    textAlign: 'center',
  },
  amount: {
    fontSize: 38,
    lineHeight: 45,
    fontWeight: '800',
    color: colors.rechargesDark,
    letterSpacing: -1,
    marginBottom: 8,
    textAlign: 'center',
  },
  note: {
    fontSize: 13,
    color: colors.rechargesMuted,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  primaryButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.rechargesMagentaAlt,
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
    fontSize: 17,
    fontWeight: '600',
  },
});

export default Recharges01Screen;
