import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../../theme/colors';
import { supportApi } from '../../../api/backoffice';
import { useAsync } from '../../../hooks/useAsync';
import { useNav } from '../../../navigation/nav';
import { Remote } from '../../../components/backoffice/Remote';
import { Badge, BoScreen, Card, EmptyState, ReadOnlyNote, Segmented, SectionTitle } from '../../../components/backoffice/ui';
import { OPERATION_TYPE_LABEL, formatCents, formatDateTime, toneForStatus } from '../../../utils/format';

const NOTE = 'Solo consulta · no modifica datos ni saldos';

const TYPE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'INTERNAL_TRANSFER', label: 'Transferencias' },
  { value: 'SIMULATED_RECHARGE', label: 'Recargas' },
  { value: 'REVERSAL', label: 'Reversos' },
  { value: 'ADMIN_ADJUSTMENT', label: 'Ajustes' },
];

export function CustomerOperationsScreen({ id }: { id: string }) {
  const nav = useNav();
  const [type, setType] = useState('');
  const { state, reload } = useAsync(() => supportApi.clientOperations(id), [id]);
  return (
    <BoScreen title="Operaciones del cliente" subtitle="Customer Lookup" badge="SOPORTE" onBack={nav.back}>
      <Segmented options={TYPE_FILTERS} value={type} onChange={setType} />
      <Remote state={state} resource="Operaciones" onRetry={reload} onBack={nav.back}>
        {({ items }) => {
          // El backend no filtra por tipo: se filtra en cliente sobre lo ya cargado.
          const rows = type ? items.filter((o) => o.type === type) : items;
          return rows.length === 0 ? (
            <EmptyState title="Sin operaciones" message="Este cliente no tiene operaciones para mostrar." />
          ) : (
            <>
              <SectionTitle right={`${rows.length} ${rows.length === 1 ? 'operación' : 'operaciones'}`}>Más recientes primero</SectionTitle>
              {rows.map((o) => (
                <Card key={o.operationId} onPress={() => nav.push({ name: 'operation', id: o.publicReference, tab: 'detail', area: 'support' })}>
                  <View style={st.rowBetween}>
                    <Text style={st.ref}>{o.publicReference}</Text>
                    <Badge label={o.status} tone={toneForStatus(o.status)} />
                  </View>
                  <Text style={st.title}>{OPERATION_TYPE_LABEL[o.type] ?? o.type}</Text>
                  <Text style={st.amount}>
                    {o.currency} {formatCents(o.amountCents)}
                  </Text>
                  <Text style={st.muted}>{formatDateTime(o.createdAt)}</Text>
                  <Text style={st.link}>Ver detalle</Text>
                </Card>
              ))}
            </>
          );
        }}
      </Remote>
      <ReadOnlyNote>{NOTE}</ReadOnlyNote>
    </BoScreen>
  );
}

const st = StyleSheet.create({
  amount: { fontSize: 15, fontWeight: '700', color: colors.boInk },
  link: { fontSize: 14, fontWeight: '700', color: colors.boPink, marginTop: 4 },

  muted: { fontSize: 12, color: colors.boMuted },
  ref: { fontSize: 13, color: colors.boFaint },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 16, fontWeight: '800', color: colors.boInk },
});
