import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../theme/colors';
import TransfersHeader from '../transfers/TransfersHeader';
import BottomNav from '../common/BottomNav';

export interface RechargeEmptyViewProps {
  readonly onBack?: () => void;
  readonly onStartRecharge?: () => void;
  readonly onTabPress?: (
    tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil',
  ) => void;
  readonly withSystemBar?: boolean;
}

export const RechargeEmptyView: React.FC<RechargeEmptyViewProps> = ({
  onBack,
  onStartRecharge,
  onTabPress,
  withSystemBar = false,
}) => {
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <TransfersHeader title="Mis recargas" onBack={onBack} titleSize={24} />

        <View
          style={[
            styles.empty,
            withSystemBar ? styles.emptyWithBar : styles.emptyStandard,
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              withSystemBar ? styles.iconCircleCompact : null,
            ]}
          >
            <Ionicons
              name="wallet-outline"
              size={withSystemBar ? 34 : 38}
              color={colors.rechargesWallet}
            />
          </View>
          <Text style={styles.title}>Aún no has recargado</Text>
          <Text
            style={[
              styles.description,
              withSystemBar
                ? styles.descriptionCompact
                : styles.descriptionStandard,
            ]}
          >
            Tus recargas aparecerán aquí.
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.actionBlock,
          withSystemBar ? styles.actionBlockWithBar : null,
        ]}
      >
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={onStartRecharge}
          accessibilityRole="button"
          accessibilityLabel="Hacer mi primera recarga"
        >
          <Text style={styles.primaryButtonText}>Hacer mi primera recarga</Text>
        </TouchableOpacity>
      </View>

      <BottomNav
        activeTab="movimientos"
        onTabPress={onTabPress}
        bottomOffset={withSystemBar ? 28 : 0}
      />

      {withSystemBar ? (
        <View style={styles.systemBar}>
          <View style={styles.systemBarLine} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.rechargesBg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  emptyWithBar: {
    paddingTop: 40,
  },
  emptyStandard: {
    paddingTop: 56,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.rechargesLavender,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconCircleCompact: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 22,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.rechargesDark,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  description: {
    color: colors.rechargesSubtle,
    textAlign: 'center',
  },
  descriptionCompact: {
    fontSize: 15,
    lineHeight: 21,
  },
  descriptionStandard: {
    fontSize: 16,
    lineHeight: 22,
  },
  actionBlock: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  actionBlockWithBar: {
    paddingBottom: 122,
  },
  primaryButton: {
    height: 56,
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
    fontWeight: '700',
  },
  systemBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: colors.rechargesSystemBar,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  systemBarLine: {
    width: 128,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.rechargesSystemBarLine,
  },
});

export default RechargeEmptyView;
