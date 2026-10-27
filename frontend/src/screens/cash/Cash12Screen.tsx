// ============================================================
// Cash_12 — Historial de efectivo
// Fuente visual: Stitch screen c340b9ffef0d4558955a2ac4d2e46eec
// ============================================================
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import CashFilterPills from '../../components/cash/CashFilterPills';
import CashTransactionRow from '../../components/cash/CashTransactionRow';
import BottomNav from '../../components/common/BottomNav';
import { DEMO_CASH_HISTORY } from '../../data/demoCash';
import { CashFilter } from '../../types/cash';

export interface Cash12ScreenProps {
  readonly onBack?: () => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
  readonly recentTransactions?: readonly import('../../types/cash').CashTransaction[];
  readonly demo?: boolean;
}

export const Cash12Screen: React.FC<Cash12ScreenProps> = ({
  onBack,
  onTabPress,
  recentTransactions,
  demo = true,
}) => {
  const [filter, setFilter] = useState<CashFilter>('all');

  const transactions = useMemo(() => {
    if (filter === 'all') {
      return recentTransactions ?? DEMO_CASH_HISTORY;
    }
    return (recentTransactions ?? DEMO_CASH_HISTORY).filter((item) => item.direction === filter);
  }, [filter, recentTransactions]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TransfersHeader
            title="Historial de efectivo"
            onBack={onBack}
            titleSize={25}
          />
        </View>

        <View style={styles.filters}>
          <CashFilterPills selected={filter} onChange={setFilter} />
        </View>

        <View style={styles.card}>
          {transactions.length > 0 ? (
            transactions.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.rowContainer,
                  index < transactions.length - 1
                    ? styles.rowDivider
                    : null,
                ]}
              >
                <CashTransactionRow item={item} variant="history" />
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No hay registros para este filtro.
            </Text>
          )}
        </View>

        {demo ? <Text style={styles.demoHint}>
          Historial DEMO · no representa movimientos reales
        </Text> : null}
      </ScrollView>

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
    paddingBottom: 104,
  },
  header: {
    marginBottom: 24,
  },
  filters: {
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.cashWhite,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 6,
    shadowColor: colors.cashShadow,
    shadowOpacity: 0.02,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  rowContainer: {
    paddingVertical: 15,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cashBorderCard,
  },
  emptyText: {
    paddingVertical: 24,
    textAlign: 'center',
    fontSize: 14,
    color: colors.cashMuted,
  },
  demoHint: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.cashSubtle,
    textTransform: 'uppercase',
  },
});

export default Cash12Screen;
