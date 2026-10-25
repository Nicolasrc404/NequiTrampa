import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import colors from '../../theme/colors';
import { MovementsState } from '../../types/movements';

interface DevStateBarProps {
  currentState: MovementsState;
  onSelectState: (state: MovementsState) => void;
}

export const DevStateBar: React.FC<DevStateBarProps> = ({
  currentState,
  onSelectState,
}) => {
  const states: { key: MovementsState; label: string; badge: string }[] = [
    { key: 'Movements_01', label: '01: Historial', badge: 'LIST' },
    { key: 'Movements_02', label: '02: Vacío', badge: 'EMPTY' },
    { key: 'Movements_03', label: '03: Skeleton', badge: 'LOAD' },
    { key: 'Movements_04', label: '04: Filtros', badge: 'FORM' },
    { key: 'Movements_05', label: '05: Detalle', badge: 'INFO' },
    { key: 'Movements_06', label: '06: 404 Not Found', badge: '404' },
    { key: 'Movements_07', label: '07: 401 Expired', badge: '401' },
    { key: 'Movements_08', label: '08: 503 Outage', badge: '503' },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.topInfo}>
        <View style={styles.devTag}>
          <Text style={styles.devTagText}>STITCH DEMO PREVIEW</Text>
        </View>
        <Text style={styles.statusText}>{currentState}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {states.map((s) => {
          const isActive = currentState === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.btn, isActive && styles.btnActive]}
              activeOpacity={0.7}
              onPress={() => onSelectState(s.key)}
            >
              <Text style={[styles.btnText, isActive && styles.btnTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0F0926',
    paddingTop: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#281C4F',
    zIndex: 999,
  },
  topInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  devTag: {
    backgroundColor: colors.magenta,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  devTagText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusText: {
    color: '#A59EC2',
    fontSize: 10,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1E153E',
  },
  btnActive: {
    backgroundColor: colors.magenta,
  },
  btnText: {
    color: '#D1CEE2',
    fontSize: 11,
    fontWeight: '600',
  },
  btnTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
});

export default DevStateBar;
