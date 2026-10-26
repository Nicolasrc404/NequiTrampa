import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../../theme/colors';
import { requireBackoffice } from '../../../services/api';
import { useApiResource } from '../../../hooks/useApiResource';
import { useNav } from '../../../navigation/nav';
import { Remote } from '../../../components/backoffice/Remote';
import { Badge, BoButton, Card, KeyValue, SectionTitle } from '../../../components/backoffice/ui';
import { OPERATION_TYPE_LABEL, formatCents, formatDateTime, toneForStatus } from '../../../utils/format';
import { OperationArea } from '../../../types/backoffice';

export function OperationDetail({ id, area }: { id: string; area: OperationArea }) {
  const nav = useNav();
  const state = useApiResource(
    (signal) =>
      area === 'support'
        ? requireBackoffice().support.getOperation(id, { signal })
        : requireBackoffice().finance.getOperation(id, { signal }),
    [id, area],
  );
  return (
    <Remote state={state} resource="Operación" onBack={nav.back}>
      {(o) => (
        <>
          <Card>
            <View style={st.rowBetween}>
              <Badge label={o.status} tone={toneForStatus(o.status)} />
              <Text style={st.muted}>{OPERATION_TYPE_LABEL[o.type] ?? o.type}</Text>
            </View>
            <Text style={st.amount}>{formatCents(o.amountCents)}</Text>
            <Text style={st.muted}>{o.currency}</Text>
          </Card>
          <Card>
            <SectionTitle>Datos de trazabilidad</SectionTitle>
            <KeyValue label="Referencia" value={o.publicReference} />
            <KeyValue label="ID de operación" value={o.operationId} mono />
            <KeyValue label="Actor" value={`${o.actorType} · ${o.actorId}`} />
            <KeyValue label="Creada · Colombia" value={formatDateTime(o.createdAt)} />
            <KeyValue label="Confirmada · Colombia" value={formatDateTime(o.confirmedAt)} />
            {o.originalOperationId ? <KeyValue label="Operación original" value={o.originalOperationId} mono /> : null}
            {o.reason ? <KeyValue label="Motivo" value={o.reason} /> : null}
          </Card>
          {area === 'finance' && o.type === 'INTERNAL_TRANSFER' && o.status === 'COMPLETED' && (
            <BoButton label="Solicitar reverso" variant="secondary" onPress={() => nav.push({ name: 'reversalCreate', operationId: o.publicReference })} />
          )}
        </>
      )}
    </Remote>
  );
}

const st = StyleSheet.create({
  amount: { fontSize: 22, fontWeight: '800', color: colors.boInk },
  muted: { fontSize: 12, color: colors.boMuted },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
