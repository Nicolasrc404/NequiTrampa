import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import colors from '../../theme/colors';
import { Module1DemoActions, Module1DemoState } from '../../types/module1';

export default function ProfileForm({ value, submitted, setValue }: Module1DemoState & Module1DemoActions) {
  return <View style={styles.card}><Text style={styles.title}>Actualiza tu información</Text><Text style={styles.label}>Nombre visible</Text><TextInput value={value} onChangeText={setValue} placeholder="Nicolás Ramírez" placeholderTextColor={colors.grayPlaceholder} style={styles.input} />{submitted && !value.trim() ? <Text style={styles.error}>El nombre es obligatorio.</Text> : null}</View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: colors.white, borderRadius: 22, padding: 20 }, title: { color: colors.navy, fontSize: 18, fontWeight: '800', marginBottom: 16 }, label: { color: colors.graySub, fontSize: 12, fontWeight: '700', marginBottom: 7 }, input: { minHeight: 52, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 13, paddingHorizontal: 14, color: colors.navy }, error: { color: '#C83232', fontSize: 12, fontWeight: '700', marginTop: 8 } });
