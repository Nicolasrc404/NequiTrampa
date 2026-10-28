// ============================================================
// Transfers_15 — Mis transferencias
// Fuente visual: Stitch screen 362168001a96414a81dd672b3031a56b
// ============================================================
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import TransferFilterPills from '../../components/transfers/TransferFilterPills';
import TransferHistoryRow from '../../components/transfers/TransferHistoryRow';
import BottomNav from '../../components/common/BottomNav';
import { DEMO_TRANSFER_HISTORY } from '../../data/demoTransfers';
import { TransferFilter, TransferItem } from '../../types/transfers';

export interface Transfers15ScreenProps {
  readonly onBack?: () => void;
  readonly onSelectTransfer?: (transfer: TransferItem) => void;
  /** Transferencias confirmadas por la API. `undefined` usa DEMO. */
  readonly transfers?: readonly TransferItem[];
  /** `false` cuando los datos provienen de la API real. */
  readonly demoMode?: boolean;
}

export const Transfers15Screen: React.FC<Transfers15ScreenProps> = ({
  onBack,
  onSelectTransfer,
  transfers,
  demoMode = true,
}) => {
  const [filter, setFilter] = useState<TransferFilter>('all');
  const source = transfers ?? DEMO_TRANSFER_HISTORY;

  const visible = useMemo(() => {
    if (filter === 'all') return source;
    return source.filter((item) => item.direction === filter);
  }, [filter, source]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TransfersHeader
          title="Mis transferencias"
          onBack={onBack}
          titleSize={25}
        />

        <View style={styles.filters}>
          <TransferFilterPills selected={filter} onChange={setFilter} />
        </View>

        <View style={styles.card}>
          {visible.map((item, index) => (
            <React.Fragment key={item.id}>
              <TransferHistoryRow
                item={item}
                onPress={() => onSelectTransfer?.(item)}
              />
              {index < visible.length - 1 ? <View style={styles.divider} /> : null}
            </React.Fragment>
          ))}
          {visible.length === 0 ? (
            <Text style={styles.emptyFilter}>
              No hay transferencias para este filtro.
            </Text>
          ) : null}
        </View>

        {demoMode ? (
          <Text style={styles.demoHint}>
            Historial DEMO · datos locales de previsualización
          </Text>
        ) : null}
      </ScrollView>

      <BottomNav activeTab="movimientos" />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.transfersBgList,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 120,
  },
  filters: {
    marginTop: 24,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: colors.transfersShadow,
    shadowOpacity: 0.02,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.grayBorder,
  },
  emptyFilter: {
    paddingVertical: 24,
    textAlign: 'center',
    fontSize: 13,
    color: colors.transfersSubtext,
  },
  demoHint: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.transfersNavInactive,
    textTransform: 'uppercase',
  },
});

export default Transfers15Screen;
