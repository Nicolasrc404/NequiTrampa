import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import colors from '../../theme/colors';

export default function ProjectionReferenceForm({ value, setValue }: { readonly value: string; readonly setValue: (value: string) => void }) {
  return <View style={styles.card}><Text style={styles.title}>Referencia de prueba</Text><TextInput value={value} onChangeText={setValue} placeholder="SIM-0001" placeholderTextColor={colors.grayPlaceholder} style={styles.input} /><Text style={styles.hint}>La referencia solo se conserva en memoria.</Text></View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: colors.white, borderRadius: 22, padding: 20 }, title: { color: colors.navy, fontSize: 18, fontWeight: '800', marginBottom: 16 }, input: { minHeight: 52, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 13, paddingHorizontal: 14, color: colors.navy }, hint: { color: colors.graySub, fontSize: 14, lineHeight: 21, marginTop: 12 } });
