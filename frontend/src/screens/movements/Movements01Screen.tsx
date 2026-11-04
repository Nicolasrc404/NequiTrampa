import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';
import Header from '../../components/common/Header';
import FilterPills from '../../components/common/FilterPills';
import TransactionItem from '../../components/movements/TransactionItem';
import BottomNav from '../../components/common/BottomNav';
import { DEMO_MOVEMENTS } from '../../data/demoMovements';
import { MovementFilter, MovementItem } from '../../types/movements';

interface Movements01ScreenProps {
  onOpenFilter?: () => void;
  onSelectMovement?: (item: MovementItem) => void;
  /** Datos reales de la API. Si se omite, se usa DEMO en desarrollo. */
  movements?: readonly MovementItem[];
  /** Título de la sección; el backend no agrupa por día. */
  sectionTitle?: string;
  readonly onRefresh?: () => void;
  readonly realMode?: boolean;
  /** Hay más páginas disponibles en el backend. */
  readonly hasMore?: boolean;
  readonly loadingMore?: boolean;
  readonly onLoadMore?: () => void;
  readonly onTabPress?: (tab: 'inicio' | 'movimientos' | 'asistente' | 'perfil') => void;
}

export const Movements01Screen: React.FC<Movements01ScreenProps> = ({
  onOpenFilter,
  onSelectMovement,
  movements,
  sectionTitle = 'Hoy',
  onRefresh,
  realMode = false,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onTabPress,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<MovementFilter>('TODOS');
  const source = movements ?? DEMO_MOVEMENTS;

  const filteredMovements = source.filter((m) => {
    if (selectedFilter === 'TODOS') return true;
    if (selectedFilter === 'ENVIADOS') return m.type === 'TRANSFER_SENT';
    if (selectedFilter === 'RECIBIDOS') return m.type === 'TRANSFER_RECEIVED';
    if (selectedFilter === 'RECARGAS') return m.type === 'RECHARGE';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Header title="Movimientos" onFilterPress={onOpenFilter} showFilter />

        {/* Filter Chips */}
        <FilterPills
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
        />

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          {onRefresh ? <TouchableOpacity onPress={onRefresh} accessibilityRole="button" accessibilityLabel="Actualizar movimientos"><Text style={styles.refresh}>Actualizar</Text></TouchableOpacity> : null}
        </View>

        {realMode ? <Text style={styles.realHint}>Historial confirmado por el backend · los filtros se aplican solo a la página cargada.</Text> : null}

        {/* Transactions Card */}
        <View style={styles.card}>
          {filteredMovements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tienes movimientos en esta sección.</Text>
            </View>
          ) : (
            filteredMovements.map((item, index) => (
              <TransactionItem
                key={item.id}
                item={item}
                onPress={onSelectMovement}
                showDivider={index < filteredMovements.length - 1}
              />
            ))
          )}
        </View>

        {realMode && hasMore && onLoadMore ? (
          <TouchableOpacity
            style={styles.loadMore}
            onPress={onLoadMore}
            disabled={loadingMore}
            accessibilityRole="button"
            accessibilityLabel="Cargar más movimientos"
          >
            <Text style={styles.loadMoreText}>
              {loadingMore ? 'Cargando…' : 'Cargar más'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* Persistent Bottom Navigation */}
      <BottomNav activeTab="movimientos" onTabPress={onTabPress} />
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
  },
  scrollContent: {
    paddingBottom: 90,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refresh: { color: colors.magenta, fontSize: 13, fontWeight: '800' },
  loadMore: {
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(240, 239, 245, 0.9)',
  },
  loadMoreText: { color: colors.magenta, fontSize: 14, fontWeight: '800' },
  realHint: { color: colors.graySub, fontSize: 12, lineHeight: 18, marginHorizontal: 20, marginBottom: 10 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.3,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 30,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(240, 239, 245, 0.7)',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.graySub,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Movements01Screen;
