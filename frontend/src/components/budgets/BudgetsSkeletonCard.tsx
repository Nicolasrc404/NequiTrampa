import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import colors from '../../theme/colors';

const SKELETON_ROWS = [0, 1, 2, 3, 4];

export const BudgetsSkeletonCard: React.FC = () => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View style={styles.card} accessibilityLabel="Cargando presupuestos">
      {SKELETON_ROWS.map((row) => (
        <View
          key={row}
          style={[
            styles.row,
            row < SKELETON_ROWS.length - 1 ? styles.divider : null,
          ]}
        >
          <Animated.View style={[styles.avatar, { opacity }]} />
          <View style={styles.labels}>
            <Animated.View style={[styles.titleBar, { opacity }]} />
            <Animated.View style={[styles.subtitleBar, { opacity }]} />
          </View>
          <Animated.View style={[styles.amountBar, { opacity }]} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.budgetsWhite,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: colors.budgetsShadow,
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.budgetsSkeletonDivider,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.budgetsSkeleton,
  },
  labels: {
    flex: 1,
    gap: 8,
  },
  titleBar: {
    height: 10,
    width: '75%',
    borderRadius: 999,
    backgroundColor: colors.budgetsSkeleton,
  },
  subtitleBar: {
    height: 10,
    width: '60%',
    borderRadius: 999,
    backgroundColor: colors.budgetsSkeleton,
  },
  amountBar: {
    width: 56,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.budgetsSkeleton,
  },
});

export default BudgetsSkeletonCard;
