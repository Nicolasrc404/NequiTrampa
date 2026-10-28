import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { useNav } from '../../navigation/nav';
import { Badge, Card, KeyValue, SectionTitle } from '../../components/backoffice/ui';
import { OperationDto } from '../../types/backoffice';
import { formatCents, formatDateTime, toneForStatus } from '../../utils/format';

export function ReversalCard({ r }: { r: OperationDto }) {
  const nav = useNav();
  return (
    <>
      <Card>
        <View style={st.rowBetween}>
          <Text style={st.ref}>{r.publicReference}</Text>
          <Badge label={r.status} tone={toneForStatus(r.status)} />
        </View>
        <Text style={st.amount}>{formatCents(r.amountCents)}</Text>
        <Text style={st.muted}>{r.currency}</Text>
        <KeyValue label="Motivo" value={r.reason} />
        <KeyValue label="Solicitado" value={formatDateTime(r.createdAt)} />
        <KeyValue label="Confirmado" value={formatDateTime(r.confirmedAt)} />
        <KeyValue label="Responsable" value={`${r.actorType} · ${r.actorId}`} />
      </Card>
      {r.originalOperationId && (
        <Card onPress={() => nav.push({ name: 'operation', id: r.originalOperationId!, tab: 'detail', area: 'finance' })}>
          <SectionTitle>Relación entre registros</SectionTitle>
          <KeyValue label="Operación original" value={r.originalOperationId} mono />
          <Text style={st.link}>Ver operación original</Text>
        </Card>
      )}
    </>
  );
}

const st = StyleSheet.create({
  amount: { fontSize: 24, fontWeight: '800', color: colors.boInk },
  link: { fontSize: 14, fontWeight: '700', color: colors.boPink, marginTop: 4 },

  muted: { fontSize: 12, color: colors.boMuted },
  ref: { fontSize: 14, fontWeight: '700', color: colors.boInk },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
