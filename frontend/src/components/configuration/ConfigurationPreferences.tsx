import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import colors from '../../theme/colors';

export default function ConfigurationPreferences({ enabled, setEnabled }: { readonly enabled: boolean; readonly setEnabled: (value: boolean) => void }) {
  return <View style={styles.card}><Text style={styles.title}>Controles locales</Text>{[['Notificaciones', 'Avisos de actividad'], ['Biometría simulada', 'No modifica tu seguridad real'], ['Tema automático', 'Preferencia de apariencia']].map(([label, hint]) => <View key={label} style={styles.row}><View style={styles.copy}><Text style={styles.label}>{label}</Text><Text style={styles.hint}>{hint}</Text></View><Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: colors.grayBorder, true: colors.magentaLight }} thumbColor={enabled ? colors.magenta : colors.graySub} /></View>)}</View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: colors.white, borderRadius: 22, padding: 20 }, title: { color: colors.navy, fontSize: 18, fontWeight: '800', marginBottom: 4 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.grayBorder }, copy: { flex: 1, paddingRight: 12 }, label: { color: colors.navy, fontSize: 15, fontWeight: '800' }, hint: { color: colors.graySub, fontSize: 12, marginTop: 4 } });
