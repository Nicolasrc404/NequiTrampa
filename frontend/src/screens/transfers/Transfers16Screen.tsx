// ============================================================
// Transfers_16 — Aún no has hecho transferencias (Empty State)
// Fuente visual: Stitch screen a7f4bee0162644ce9a900729451527b1
// ============================================================
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import TransferFilterPills from '../../components/transfers/TransferFilterPills';
import TransferActionButtons from '../../components/transfers/TransferActionButtons';
import BottomNav from '../../components/common/BottomNav';
import { TransferFilter } from '../../types/transfers';

export interface Transfers16ScreenProps {
  readonly onBack?: () => void;
  readonly onSendMoney?: () => void;
}

export const Transfers16Screen: React.FC<Transfers16ScreenProps> = ({
  onBack,
  onSendMoney,
}) => {
  const [filter, setFilter] = useState<TransferFilter>('all');

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <TransfersHeader
          title="Mis transferencias"
          onBack={onBack}
          titleSize={24}
        />

        <View style={styles.filters}>
          <TransferFilterPills selected={filter} onChange={setFilter} />
        </View>

        <View style={styles.empty}>
          <View style={styles.iconCircle}>
            <Feather
              name="arrow-up-right"
              size={28}
              color={colors.categoriesBadgeText}
            />
          </View>
          <Text style={styles.title}>Aún no has hecho transferencias</Text>
          <Text style={styles.description}>
            Envía dinero a tus contactos y verás aquí cada operación.
          </Text>
        </View>

        <View style={styles.action}>
          <TransferActionButtons
            primaryLabel="Enviar dinero"
            onPrimary={onSendMoney}
          />
          <Text style={styles.demoHint}>
            Estado vacío DEMO · sin operaciones reales
          </Text>
        </View>
      </View>

      <BottomNav activeTab="movimientos" />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.transfersBg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 104,
  },
  filters: {
    marginTop: 20,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingBottom: 30,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.transfersAvatarBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    maxWidth: 280,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '800',
    color: colors.transfersDark,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    maxWidth: 310,
    marginTop: 14,
    fontSize: 16,
    lineHeight: 22,
    color: colors.transfersMuted,
    textAlign: 'center',
  },
  action: {
    gap: 12,
  },
  demoHint: {
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.transfersNavInactive,
    textTransform: 'uppercase',
  },
});

export default Transfers16Screen;
