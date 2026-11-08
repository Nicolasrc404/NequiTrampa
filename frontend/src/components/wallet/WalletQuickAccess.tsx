import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';

export interface WalletQuickAccessProps {
  readonly onBeneficiaries?: () => void;
  readonly onGoals?: () => void;
  readonly onBudgets?: () => void;
  readonly onCash?: () => void;
  readonly onCategories?: () => void;
  readonly onRefresh?: () => void;
}

interface QuickAccessItem {
  readonly key: string;
  readonly label: string;
  readonly icon: React.ComponentProps<typeof Feather>['name'];
  readonly onPress?: () => void;
}

export default function WalletQuickAccess({
  onBeneficiaries,
  onGoals,
  onBudgets,
  onCash,
  onCategories,
  onRefresh,
}: WalletQuickAccessProps) {
  const allItems: QuickAccessItem[] = [
    { key: 'beneficiaries', label: 'Beneficiarios', icon: 'users', onPress: onBeneficiaries },
    { key: 'goals', label: 'Metas', icon: 'target', onPress: onGoals },
    { key: 'budgets', label: 'Presupuestos', icon: 'bar-chart-2', onPress: onBudgets },
    { key: 'cash', label: 'Efectivo', icon: 'dollar-sign', onPress: onCash },
    { key: 'categories', label: 'Categorías', icon: 'grid', onPress: onCategories },
    { key: 'refresh', label: 'Actualizar', icon: 'refresh-cw', onPress: onRefresh },
  ];
  const items = allItems.filter((item) => item.onPress);

  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Accesos rápidos</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map((item) => (
          <Pressable key={item.key} onPress={item.onPress} style={styles.item}>
            <View style={styles.iconCircle}>
              <Feather name={item.icon} size={18} color={colors.navy} />
            </View>
            <Text style={styles.itemLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.graySub,
    marginBottom: 10,
    marginLeft: 2,
  },
  row: {
    gap: 16,
    paddingRight: 4,
  },
  item: {
    alignItems: 'center',
    width: 68,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.stateIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
    textAlign: 'center',
  },
});
