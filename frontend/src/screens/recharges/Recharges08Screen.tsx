// ============================================================
// Recharges_08 — Mis recargas
// Fuente visual: Stitch screen 61f376ede4874c2c86993e1827cb2005
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
import RechargeHistoryRow from '../../components/recharges/RechargeHistoryRow';
import BottomNav from '../../components/common/BottomNav';
import { DEMO_RECHARGE_HISTORY } from '../../data/demoRecharges';

export interface Recharges08ScreenProps {
  readonly onBack?: () => void;
  readonly onNewRecharge?: () => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
}

export const Recharges08Screen: React.FC<Recharges08ScreenProps> = ({
  onBack,
  onNewRecharge,
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
          <TransfersHeader
            title="Mis recargas"
            onBack={onBack}
            titleSize={24}
          />
        </View>

        <View style={styles.card}>
          {DEMO_RECHARGE_HISTORY.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.rowContainer,
                index < DEMO_RECHARGE_HISTORY.length - 1
                  ? styles.rowDivider
                  : null,
              ]}
            >
              <RechargeHistoryRow item={item} />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.actionBlock}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={onNewRecharge}
          accessibilityRole="button"
          accessibilityLabel="Nueva recarga"
        >
          <Text style={styles.primaryButtonText}>Nueva recarga</Text>
        </TouchableOpacity>
      </View>

      <BottomNav activeTab="movimientos" onTabPress={onTabPress} />
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.rechargesWhite,
    borderRadius: 24,
    paddingHorizontal: 20,
    shadowColor: colors.rechargesShadow,
    shadowOpacity: 0.03,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rowContainer: {
    paddingVertical: 16,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.rechargesCardBorder,
  },
  actionBlock: {
    paddingHorizontal: 20,
    paddingBottom: 88,
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

export default Recharges08Screen;
