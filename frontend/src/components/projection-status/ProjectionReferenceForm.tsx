import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import colors from '../../theme/colors';

export default function ProjectionReferenceForm({ value, setValue, onSubmit, submitLabel = 'Consultar DEMO' }: { readonly value: string; readonly setValue: (value: string) => void; readonly onSubmit?: () => void; readonly submitLabel?: string }) {
  return <View style={styles.card}><Text style={styles.title}>Referencia de operación</Text><TextInput value={value} onChangeText={setValue} placeholder="SIM-0001" placeholderTextColor={colors.grayPlaceholder} style={styles.input} /><Text style={styles.hint}>{onSubmit ? 'Consulta el estado de proyección con permisos de soporte.' : 'La referencia solo se conserva en memoria DEMO.'}</Text>{onSubmit ? <Pressable onPress={onSubmit} disabled={!value.trim()} style={styles.button}><Text style={styles.buttonText}>{submitLabel}</Text></Pressable> : null}</View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: colors.white, borderRadius: 22, padding: 20 }, title: { color: colors.navy, fontSize: 18, fontWeight: '800', marginBottom: 16 }, input: { minHeight: 52, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 13, paddingHorizontal: 14, color: colors.navy }, hint: { color: colors.graySub, fontSize: 14, lineHeight: 21, marginTop: 12 }, button: { backgroundColor: colors.magenta, borderRadius: 12, marginTop: 16, paddingVertical: 13, alignItems: 'center' }, buttonText: { color: colors.white, fontWeight: '800' } });
