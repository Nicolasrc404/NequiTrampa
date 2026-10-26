// ============================================================
// Cash_01 — Efectivo disponible
// Fuente visual: Stitch screen cd78ba148dab4b2bb61a5b2df8b60e36
// ============================================================
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import CashTransactionRow from '../../components/cash/CashTransactionRow';
import CashActionButtons from '../../components/cash/CashActionButtons';
import BottomNav from '../../components/common/BottomNav';
import {
  DEMO_CASH_AVAILABLE_CENTS,
  DEMO_CASH_RECENT,
  formatCashAmount,
} from '../../data/demoCash';

export interface Cash01ScreenProps {
  readonly onBack?: () => void;
  readonly onRegisterExpense?: () => void;
  readonly onRegisterIncome?: () => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
}

export const Cash01Screen: React.FC<Cash01ScreenProps> = ({
  onBack,
  onRegisterExpense,
  onRegisterIncome,
  onTabPress,
}) => {
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TransfersHeader title="Efectivo" onBack={onBack} titleSize={26} />
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Efectivo disponible</Text>
          <Text style={styles.balanceAmount}>
            {formatCashAmount(DEMO_CASH_AVAILABLE_CENTS)}
          </Text>
          <Text style={styles.balanceNote}>Registrado manualmente por ti</Text>
        </View>

        <Text style={styles.sectionTitle}>Últimos registros</Text>

        <View style={styles.card}>
          {DEMO_CASH_RECENT.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.rowContainer,
                index < DEMO_CASH_RECENT.length - 1
                  ? styles.rowDivider
                  : null,
              ]}
            >
              <CashTransactionRow item={item} />
            </View>
          ))}
        </View>

        <Text style={styles.demoHint}>
          Saldos y registros DEMO · no son operaciones reales
        </Text>
      </ScrollView>

      <View style={styles.actionBlock}>
        <CashActionButtons
          primaryLabel="Registrar gasto"
          onPrimary={onRegisterExpense}
          secondaryLabel="Registrar ingreso"
          onSecondary={onRegisterIncome}
          height={52}
          radius={18}
          secondaryBorderColor={colors.cashBorderAlt}
          primaryFontSize={15}
          secondaryFontSize={15}
        />
      </View>

      <BottomNav activeTab="inicio" onTabPress={onTabPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cashBg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 18,
  },
  header: {
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: colors.cashWhite,
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: colors.cashShadow,
    shadowOpacity: 0.02,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.cashMuted,
    marginBottom: 10,
  },
  balanceAmount: {
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '800',
    color: colors.cashTitle,
    letterSpacing: -1,
    marginBottom: 12,
  },
  balanceNote: {
    fontSize: 13,
    color: colors.cashMuted,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.cashTitle,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: colors.cashWhite,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowColor: colors.cashShadow,
    shadowOpacity: 0.02,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  rowContainer: {
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cashBorderCard,
  },
  demoHint: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.cashSubtle,
    textTransform: 'uppercase',
  },
  actionBlock: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 88,
  },
});

export default Cash01Screen;
