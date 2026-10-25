import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import colors from '../../theme/colors';
import Header from '../../components/common/Header';
import FilterPills from '../../components/common/FilterPills';
import SkeletonRow from '../../components/movements/SkeletonRow';
import BottomNav from '../../components/common/BottomNav';

interface Movements03ScreenProps {
  onOpenFilter?: () => void;
}

export const Movements03Screen: React.FC<Movements03ScreenProps> = ({
  onOpenFilter,
}) => {
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
          selectedFilter="TODOS"
          onSelectFilter={() => {}}
        />

        {/* Skeleton Card Container */}
        <View style={styles.card}>
          {[1, 2, 3, 4, 5, 6, 7].map((item, index) => (
            <SkeletonRow
              key={item}
              showDivider={index < 6}
            />
          ))}
        </View>
      </ScrollView>

      {/* Persistent Bottom Navigation */}
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
  },
  scrollContent: {
    paddingBottom: 90,
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
});

export default Movements03Screen;
