import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import FilterPills from '../../components/common/FilterPills';
import { MovementFilter } from '../../types/movements';

interface Movements04ScreenProps {
  onBack?: () => void;
  onApplyFilters?: (filter: { category: MovementFilter; from: string; to: string; minAmount: string }) => void;
}

export const Movements04Screen: React.FC<Movements04ScreenProps> = ({
  onBack,
  onApplyFilters,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<MovementFilter>('TODOS');
  const [dateFrom, setDateFrom] = useState('1 oct 2026');
  const [dateTo, setDateTo] = useState('8 oct 2026');
  const [minAmount, setMinAmount] = useState('');

  const handleClear = () => {
    setSelectedCategory('TODOS');
    setDateFrom('1 oct 2026');
    setDateTo('8 oct 2026');
    setMinAmount('');
  };

  const handleApply = () => {
    onApplyFilters?.({
      category: selectedCategory,
      from: dateFrom,
      to: dateTo,
      minAmount,
    });
    onBack?.();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.wrapper}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Back button and Title */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={onBack}
            >
              <Feather name="chevron-left" size={24} color={colors.navy} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Filtrar movimientos</Text>
          </View>

          {/* Filter Pills */}
          <FilterPills
            selectedFilter={selectedCategory}
            onSelectFilter={setSelectedCategory}
          />

          {/* Form Fields Container */}
          <View style={styles.formContainer}>
            {/* Field: Desde */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Desde</Text>
              <TextInput
                style={styles.input}
                value={dateFrom}
                onChangeText={setDateFrom}
                placeholder="dd mmm aaaa"
                placeholderTextColor={colors.grayPlaceholder}
              />
            </View>

            {/* Field: Hasta */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Hasta</Text>
              <TextInput
                style={styles.input}
                value={dateTo}
                onChangeText={setDateTo}
                placeholder="dd mmm aaaa"
                placeholderTextColor={colors.grayPlaceholder}
              />
            </View>

            {/* Field: Monto mínimo */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Monto mínimo</Text>
              <TextInput
                style={styles.input}
                value={minAmount}
                onChangeText={setMinAmount}
                placeholder="$ 0"
                placeholderTextColor={colors.grayPlaceholder}
                keyboardType="numeric"
              />
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons Pinned at Bottom */}
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.applyButton}
            activeOpacity={0.85}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>Aplicar filtros</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearButton}
            activeOpacity={0.7}
            onPress={handleClear}
          >
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wrapper: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.3,
  },
  formContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.graySub,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.navy,
    fontWeight: '500',
  },
  footerActions: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 12,
    backgroundColor: colors.background,
  },
  applyButton: {
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
  applyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.grayBorder,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: colors.magenta,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default Movements04Screen;
