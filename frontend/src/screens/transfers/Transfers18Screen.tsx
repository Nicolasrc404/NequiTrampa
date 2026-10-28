// ============================================================
// Transfers_18 — No pudimos cargar tu historial (503)
// Fuente visual: Stitch screen 67f12d38bbfd42a6a93e921d80033552
// ============================================================
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import TransferActionButtons from '../../components/transfers/TransferActionButtons';
import BottomNav from '../../components/common/BottomNav';

export interface Transfers18ScreenProps {
  readonly onBack?: () => void;
  readonly onRetry?: () => void;
}

export const Transfers18Screen: React.FC<Transfers18ScreenProps> = ({
  onBack,
  onRetry,
}) => {
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <TransfersHeader
          title="Mis transferencias"
          onBack={onBack}
          titleSize={24}
        />

        <View style={styles.body}>
          <View style={styles.iconCircle}>
            <Feather name="wifi-off" size={36} color={colors.transfersDangerIcon} />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>503</Text>
          </View>
          <Text style={styles.title}>No pudimos cargar tu historial</Text>
          <Text style={styles.description}>
            El servicio no está disponible por ahora. Intenta de nuevo en unos
            minutos.
          </Text>
        </View>

        <View style={styles.action}>
          <TransferActionButtons
            primaryLabel="Reintentar"
            onPrimary={onRetry}
          />
          <Text style={styles.demoHint}>
            Estado DEMO · sin reintentos automáticos
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
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 104,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.transfersDangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  badge: {
    backgroundColor: colors.transfersErrorBg,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 16,
  },
  badgeText: {
    color: colors.transfersError,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    maxWidth: 280,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '800',
    color: colors.transfersDark,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  description: {
    maxWidth: 310,
    fontSize: 15,
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

export default Transfers18Screen;
