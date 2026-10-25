import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { MovementItem } from '../../types/movements';

interface Movements05ScreenProps {
  movement?: MovementItem;
  onBack?: () => void;
}

export const Movements05Screen: React.FC<Movements05ScreenProps> = ({
  movement,
  onBack,
}) => {
  // Default fallback data matching Stitch mockup if none passed
  const item: MovementItem = movement || {
    id: 'op_demo_02',
    reference: 'REC-000071',
    title: 'Recarga simulada',
    type: 'RECHARGE',
    categoryLabel: 'Recarga',
    timestamp: '9:02 a. m.',
    formattedDate: '8 oct 2026 · 9:02 a. m.',
    amount: 300000,
    balanceAfter: 1250000,
    status: 'Completada',
  };

  const isPositive = item.amount > 0;
  const formattedAmount = `${isPositive ? '+ ' : '- '}$ ${Math.abs(item.amount).toLocaleString('es-CO')}`;
  const formattedBalance = `$ ${item.balanceAfter.toLocaleString('es-CO')}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.wrapper}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={onBack}
            >
              <Feather name="chevron-left" size={24} color={colors.navy} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detalle del movimiento</Text>
          </View>

          {/* Card 1: Top Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summarySubtitle}>{item.title}</Text>
            <Text style={styles.summaryAmount}>{formattedAmount}</Text>
            <Text style={styles.summaryStatus}>{item.status}</Text>
          </View>

          {/* Card 2: Details List Card */}
          <View style={styles.detailsCard}>
            {/* Row 1: Referencia */}
            <View style={[styles.detailRow, styles.rowBorder]}>
              <Text style={styles.detailLabel}>Referencia</Text>
              <Text style={styles.detailValueBold}>{item.reference}</Text>
            </View>

            {/* Row 2: Fecha */}
            <View style={[styles.detailRow, styles.rowBorder]}>
              <Text style={styles.detailLabel}>Fecha</Text>
              <Text style={styles.detailValue}>{item.formattedDate}</Text>
            </View>

            {/* Row 3: Tipo */}
            <View style={[styles.detailRow, styles.rowBorder]}>
              <Text style={styles.detailLabel}>Tipo</Text>
              <Text style={styles.detailValue}>{item.categoryLabel}</Text>
            </View>

            {/* Row 4: Saldo después */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Saldo después</Text>
              <Text style={styles.detailValue}>{formattedBalance}</Text>
            </View>
          </View>
        </View>

        {/* Bottom Action Button */}
        <View style={styles.footerAction}>
          <TouchableOpacity
            style={styles.returnButton}
            activeOpacity={0.85}
            onPress={onBack}
          >
            <Text style={styles.returnButtonText}>Volver a movimientos</Text>
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
  content: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
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
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  summarySubtitle: {
    fontSize: 14.5,
    fontWeight: '500',
    color: colors.graySub,
    marginBottom: 6,
  },
  summaryAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.5,
  },
  summaryStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.graySub,
    marginTop: 6,
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 17,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.grayBorder,
  },
  detailLabel: {
    fontSize: 15,
    color: colors.graySub,
    fontWeight: '400',
  },
  detailValue: {
    fontSize: 15,
    color: colors.navy,
    fontWeight: '700',
  },
  detailValueBold: {
    fontSize: 15,
    color: colors.navy,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footerAction: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  returnButton: {
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
  returnButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

export default Movements05Screen;
