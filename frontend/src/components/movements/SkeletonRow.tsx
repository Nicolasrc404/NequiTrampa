import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import colors from '../../theme/colors';

interface SkeletonRowProps {
  showDivider?: boolean;
}

export const SkeletonRow: React.FC<SkeletonRowProps> = ({ showDivider = true }) => {
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.leftRow}>
          {/* Avatar Skeleton */}
          <Animated.View style={[styles.avatar, { opacity: opacityAnim }]} />
          {/* Texts Skeleton */}
          <View style={styles.textContainer}>
            <Animated.View style={[styles.titleLine, { opacity: opacityAnim }]} />
            <Animated.View style={[styles.subLine, { opacity: opacityAnim }]} />
          </View>
        </View>
        {/* Right Amount Skeleton */}
        <Animated.View style={[styles.amountPill, { opacity: opacityAnim }]} />
      </View>
      {showDivider && <View style={styles.divider} />}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.skeletonItem,
  },
  textContainer: {
    flex: 1,
    gap: 8,
  },
  titleLine: {
    height: 14,
    width: '65%',
    borderRadius: 7,
    backgroundColor: colors.skeletonItem,
  },
  subLine: {
    height: 10,
    width: '40%',
    borderRadius: 5,
    backgroundColor: colors.skeletonItemLight,
  },
  amountPill: {
    width: 58,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.skeletonItem,
  },
  divider: {
    height: 1,
    backgroundColor: colors.grayBorder,
    marginHorizontal: 16,
  },
});

export default SkeletonRow;
