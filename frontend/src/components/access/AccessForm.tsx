import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import colors from '../../theme/colors';
import { Module1DemoActions, Module1DemoState } from '../../types/module1';

export type AccessFormProps = Module1DemoState & Module1DemoActions;

export default function AccessForm({ value, showSecret, submitted, setValue, toggleSecret }: AccessFormProps) {
  return <View style={styles.card}>
    <Text style={styles.title}>Ingresa a tu cuenta</Text>
    <Text style={styles.label}>Correo o celular</Text>
    <TextInput value={value} onChangeText={setValue} placeholder="ejemplo@correo.com" placeholderTextColor={colors.grayPlaceholder} style={styles.input} autoCapitalize="none" keyboardType="email-address" />
    <Text style={styles.label}>Contraseña</Text>
    <View style={styles.secretRow}>
      <TextInput value={showSecret ? value : '••••••••'} onChangeText={setValue} style={[styles.input, styles.secretInput]} secureTextEntry={!showSecret} />
      <Pressable onPress={toggleSecret} style={styles.show}><Text style={styles.link}>{showSecret ? 'Ocultar' : 'Ver'}</Text></Pressable>
    </View>
    {submitted && !value.trim() ? <Text style={styles.error}>Ingresa un dato para continuar.</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 20 },
  title: { color: colors.navy, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  label: { color: colors.graySub, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 7 },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 13, paddingHorizontal: 14, color: colors.navy, fontSize: 15 },
  secretRow: { flexDirection: 'row', alignItems: 'center' },
  secretInput: { flex: 1 },
  show: { marginLeft: -64, padding: 12 },
  link: { color: colors.magenta, fontWeight: '800', fontSize: 12 },
  error: { color: '#C83232', fontSize: 12, fontWeight: '700', marginTop: 8 },
});
