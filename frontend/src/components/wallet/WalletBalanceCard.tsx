import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { formatCopCents } from '../../utils/money';

export interface WalletBalanceCardProps {
  readonly onDetail: () => void;
  readonly onTransfer?: () => void;
  readonly onRecharge?: () => void;
  readonly balanceCents?: number;
  readonly isDemo?: boolean;
}

export default function WalletBalanceCard({ onDetail, onTransfer, onRecharge, balanceCents, isDemo = true }: WalletBalanceCardProps) {
  const hasRealBalance = !isDemo && balanceCents !== undefined;
  const realUnavailable = !isDemo && balanceCents === undefined;
  return <View style={styles.card}>
    <Text style={styles.label}>{hasRealBalance ? 'SALDO DISPONIBLE' : realUnavailable ? 'SALDO NO DISPONIBLE' : 'SALDO DEMO'}</Text><Text style={styles.balance}>{hasRealBalance ? formatCopCents(balanceCents) : realUnavailable ? '—' : '$ 1.250.000'}</Text><Text style={styles.hint}>{hasRealBalance ? 'COP · confirmado por el backend' : realUnavailable ? 'No se mostrará un saldo hasta confirmarlo con el backend' : 'COP · no corresponde a dinero real'}</Text>
    <View style={styles.actions}>
      <Pressable onPress={onTransfer} style={[styles.button, styles.transferButton]}>
        <Feather name="arrow-up-right" size={14} color={colors.white} />
        <Text style={styles.transferButtonText}>Enviar</Text>
      </Pressable>
      <Pressable onPress={onRecharge} style={styles.button}>
        <Feather name="plus" size={14} color={colors.navy} />
        <Text style={styles.buttonText}>Recargar</Text>
      </Pressable>
      <Pressable onPress={onDetail} style={styles.button}>
        <Feather name="file-text" size={14} color={colors.navy} />
        <Text style={styles.buttonText}>Extracto</Text>
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.navyCard, borderRadius: 26, padding: 24, minHeight: 190 },
  label: { color: colors.magentaLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  balance: { color: colors.white, fontSize: 38, fontWeight: '900', marginTop: 14 },
  hint: { color: '#B9B4D0', fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  buttonText: { color: colors.navy, fontSize: 12, fontWeight: '800' },
  transferButton: { backgroundColor: colors.magenta },
  transferButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
});
