import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { formatCopCents } from '../../utils/money';

export default function WalletBalanceCard({ onDetail, onOptions, onRefresh, balanceCents, isDemo = true }: { readonly onDetail: () => void; readonly onOptions: () => void; readonly onRefresh?: () => void; readonly balanceCents?: number; readonly isDemo?: boolean }) {
  const hasRealBalance = !isDemo && balanceCents !== undefined;
  const realUnavailable = !isDemo && balanceCents === undefined;
  return <View style={styles.card}>
    <Text style={styles.label}>{hasRealBalance ? 'SALDO DISPONIBLE' : realUnavailable ? 'SALDO NO DISPONIBLE' : 'SALDO DEMO'}</Text><Text style={styles.balance}>{hasRealBalance ? formatCopCents(balanceCents) : realUnavailable ? '—' : '$ 1.250.000'}</Text><Text style={styles.hint}>{hasRealBalance ? 'COP · confirmado por el backend' : realUnavailable ? 'No se mostrará un saldo hasta confirmarlo con el backend' : 'COP · no corresponde a dinero real'}</Text>
    <View style={styles.actions}><Pressable onPress={onDetail} style={styles.button}><Text style={styles.buttonText}>Ver detalle</Text></Pressable><Pressable onPress={onOptions} style={styles.button}><Text style={styles.buttonText}>Opciones</Text></Pressable>{!isDemo && onRefresh ? <Pressable onPress={onRefresh} style={styles.button}><Text style={styles.buttonText}>Actualizar</Text></Pressable> : null}</View>
  </View>;
}

const styles = StyleSheet.create({ card: { backgroundColor: colors.navyCard, borderRadius: 26, padding: 24, minHeight: 190 }, label: { color: colors.magentaLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 }, balance: { color: colors.white, fontSize: 38, fontWeight: '900', marginTop: 14 }, hint: { color: '#B9B4D0', fontSize: 12, marginTop: 4 }, actions: { flexDirection: 'row', gap: 10, marginTop: 22 }, button: { backgroundColor: colors.white, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }, buttonText: { color: colors.navy, fontSize: 12, fontWeight: '800' } });
