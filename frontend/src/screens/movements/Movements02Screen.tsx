import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import Header from '../../components/common/Header';
import FilterPills from '../../components/common/FilterPills';
import BottomNav from '../../components/common/BottomNav';
import { MovementFilter } from '../../types/movements';

interface Movements02ScreenProps {
  onOpenFilter?: () => void;
  onRechargePress?: () => void;
}

export const Movements02Screen: React.FC<Movements02ScreenProps> = ({
  onOpenFilter,
  onRechargePress,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<MovementFilter>('TODOS');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <Header title="Movimientos" onFilterPress={onOpenFilter} showFilter />

        {/* Filter Chips */}
        <FilterPills
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
        />

        {/* Empty State Center Container */}
        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Feather name="align-left" size={32} color="#7673A0" />
          </View>
          <Text style={styles.emptyTitle}>Sin movimientos todavía</Text>
          <Text style={styles.emptySubtitle}>
            Cuando muevas dinero, cada operación aparecerá aquí.
          </Text>
        </View>

        {/* Bottom CTA Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.rechargeButton}
            activeOpacity={0.85}
            onPress={onRechargePress}
          >
            <Text style={styles.rechargeButtonText}>Recargar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Navigation */}
      <BottomNav activeTab="movimientos" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingBottom: 80,
    justifyContent: 'space-between',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    marginTop: -20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.graySub,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 290,
  },
  actionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  rechargeButton: {
    backgroundColor: colors.magenta,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.magenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  rechargeButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

export default Movements02Screen;
