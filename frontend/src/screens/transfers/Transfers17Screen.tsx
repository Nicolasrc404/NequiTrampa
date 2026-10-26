// ============================================================
// Transfers_17 — Skeleton de Carga
// Fuente visual: Stitch screen c934c699c3da4f14b494974509318a84
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import colors from '../../theme/colors';
import TransfersHeader from '../../components/transfers/TransfersHeader';
import TransferFilterPills from '../../components/transfers/TransferFilterPills';
import BottomNav from '../../components/common/BottomNav';
import { TransferFilter } from '../../types/transfers';

export interface Transfers17ScreenProps {
  readonly onBack?: () => void;
}

const LABEL_WIDTHS = ['100%', '75%', '95%', '80%', '90%', '70%'] as const;

export const Transfers17Screen: React.FC<Transfers17ScreenProps> = ({
  onBack,
}) => {
  const [filter, setFilter] = useState<TransferFilter>('all');
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.7,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

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

        <Animated.View style={[styles.card, { opacity: pulse }]}>
          {LABEL_WIDTHS.map((width, index) => (
            <React.Fragment key={`skeleton-${index}`}>
              <View style={styles.row}>
                <View style={styles.left}>
                  <View style={styles.avatar} />
                  <View style={styles.labels}>
                    <View style={[styles.line, styles.lineTitle, { width }]} />
                    <View style={[styles.line, styles.lineDate]} />
                  </View>
                </View>
                <View style={[styles.line, styles.lineAmount]} />
              </View>
              {index < LABEL_WIDTHS.length - 1 ? (
                <View style={styles.divider} />
              ) : null}
            </React.Fragment>
          ))}
        </Animated.View>
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
    paddingTop: 32,
    paddingBottom: 120,
  },
  filters: {
    marginTop: 24,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.categoriesCardBorder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.transfersSkeleton,
  },
  labels: {
    flex: 1,
    maxWidth: 180,
    gap: 8,
  },
  line: {
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.transfersSkeleton,
  },
  lineTitle: {
    height: 14,
  },
  lineDate: {
    width: '55%',
  },
  lineAmount: {
    width: 56,
    marginLeft: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.transfersSkeletonLine,
  },
});

export default Transfers17Screen;
