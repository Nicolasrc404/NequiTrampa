// ============================================================
// Beneficiaries_03 — Skeleton de Carga
// Fuente visual: Stitch screen 6d1d6326c408415eacb0eb2fca88890a
// ============================================================
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';

interface Beneficiaries03ScreenProps {
  onBack?: () => void;
}

const SkeletonBone: React.FC<{ width: number | string; height: number; borderRadius?: number; style?: object }> = ({
  width,
  height,
  borderRadius = 6,
  style,
}) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.skeletonItem,
          opacity,
        },
        style,
      ]}
    />
  );
};

const SkeletonRow: React.FC = () => (
  <View style={styles.skeletonRow}>
    {/* Avatar circle */}
    <SkeletonBone width={44} height={44} borderRadius={22} />
    {/* Text lines */}
    <View style={styles.skeletonTextWrap}>
      <SkeletonBone width={140} height={14} />
      <SkeletonBone width={80} height={10} style={{ marginTop: 6 }} />
    </View>
  </View>
);

export const Beneficiaries03Screen: React.FC<Beneficiaries03ScreenProps> = ({
  onBack,
}) => {
  return (
    <View style={styles.root}>
      {/* TopBar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={onBack}
            accessibilityLabel="Volver"
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Beneficiarios</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Skeleton Search */}
        <View style={styles.searchSection}>
          <SkeletonBone width={60} height={12} style={{ marginBottom: 8 }} />
          <SkeletonBone width="100%" height={48} borderRadius={18} />
        </View>

        {/* Skeleton Card */}
        <View style={styles.listCard}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.skeletonRowWrap, i < 4 && styles.rowBorder]}>
              <SkeletonRow />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F4FB',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backIcon: {
    fontSize: 28,
    color: '#2b2b40',
    lineHeight: 32,
    marginTop: -2,
    fontWeight: '300',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111126',
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: 20,
  },
  searchSection: {
    marginBottom: 20,
  },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  skeletonRowWrap: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFF6',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonTextWrap: {
    flex: 1,
  },
});

export default Beneficiaries03Screen;
