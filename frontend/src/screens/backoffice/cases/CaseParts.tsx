import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../../theme/colors';
import { useNav } from '../../../navigation/nav';
import { Badge, BoButton, Card, KeyValue, ReadOnlyNote, SuccessBanner } from '../../../components/backoffice/ui';
import { CASE_STATUS_LABEL, PRIORITY_LABEL, toneForStatus } from '../../../utils/format';
import { SupportCase } from '../../../types/backoffice';

export const NOTE = 'Solo gestión de casos · no modifica saldos';

export const CaseBadges = ({ c }: { c: SupportCase }) => (
  <View style={st.badges}>
    <Badge label={PRIORITY_LABEL[c.priority] ?? c.priority} tone={toneForStatus(c.priority)} />
    <Badge label={CASE_STATUS_LABEL[c.status] ?? c.status} tone={toneForStatus(c.status)} />
  </View>
);

export function CaseResult({ c, title, message }: { c: SupportCase; title: string; message: string }) {
  const nav = useNav();
  return (
    <>
      <SuccessBanner title={title} message={message} />
      <Card>
        <Text style={st.ref}>{c.id}</Text>
        <Text style={st.subject}>{c.subject}</Text>
        <CaseBadges c={c} />
        <KeyValue label="Responsable" value={c.assignedTo ?? 'Sin asignar'} />
      </Card>
      <BoButton label="Volver al detalle" onPress={nav.back} />
      <ReadOnlyNote>{NOTE}</ReadOnlyNote>
    </>
  );
}

const st = StyleSheet.create({
  badges: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  ref: { fontSize: 13, color: colors.boFaint },
  subject: { fontSize: 17, fontWeight: '800', color: colors.boInk },
});
