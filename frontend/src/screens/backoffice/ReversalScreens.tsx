import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { financeApi } from '../../api/backoffice';
import { newIdempotencyKey } from '../../api/http';
import { useAction, useAsync } from '../../hooks/useAsync';
import { useNav } from '../../navigation/nav';
import { Remote } from '../../components/backoffice/Remote';
import {
  Badge,
  BoButton,
  BoInput,
  BoScreen,
  Card,
  InlineError,
  KeyValue,
  ReadOnlyNote,
  SectionTitle,
  SuccessBanner,
} from '../../components/backoffice/ui';
import { OperationDto } from '../../types/backoffice';
import { formatCents, formatDateTime, toneForStatus } from '../../utils/format';

function ReversalCard({ r }: { r: OperationDto }) {
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

export function ReversalCreateScreen({ operationId }: { operationId?: string }) {
  const nav = useNav();
  const [opId, setOpId] = useState(operationId ?? '');
  const [reason, setReason] = useState('');
  // Misma llave al reintentar el mismo envío; nueva llave si cambia el contenido.
  const key = useRef(newIdempotencyKey());
  const action = useAction((o: string, r: string, k: string) => financeApi.reverse(o, r, k));
  const [created, setCreated] = useState<OperationDto | null>(null);

  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    key.current = newIdempotencyKey();
    set(v);
  };
  const valid = opId.trim().length > 0 && reason.trim().length >= 5;

  return (
    <BoScreen title="Solicitud de reverso" subtitle="Operador financiero" badge="OPERADOR" onBack={nav.back}>
      {created ? (
        <>
          <SuccessBanner title="Reverso creado" message="El reverso se registró y conserva la operación original y su historial." />
          <ReversalCard r={created} />
          <BoButton label="Ver reverso" onPress={() => nav.replace({ name: 'reversalDetail', id: created.publicReference })} />
        </>
      ) : (
        <>
          <BoInput label="Operación original" value={opId} onChangeText={edit(setOpId)} placeholder="Referencia pública o ID" />
          <BoInput
            label="Motivo (5–256 caracteres)"
            value={reason}
            onChangeText={edit(setReason)}
            multiline
            maxLength={256}
            autoCapitalize="sentences"
          />
          <InlineError error={action.error} />
          <BoButton
            label="Solicitar reverso"
            variant="danger"
            busy={action.busy}
            disabled={!valid}
            onPress={async () => {
              const r = await action.run(opId.trim(), reason.trim(), key.current);
              if (r) setCreated(r);
            }}
          />
          <ReadOnlyNote>Conserva la operación original y su historial. Genera una operación compensatoria.</ReadOnlyNote>
        </>
      )}
    </BoScreen>
  );
}

export function ReversalDetailScreen({ id }: { id: string }) {
  const nav = useNav();
  const { state, reload } = useAsync(() => financeApi.reversal(id), [id]);
  return (
    <BoScreen title="Detalle de reverso" subtitle="Operador financiero" badge="OPERADOR" onBack={nav.back}>
      <Remote state={state} resource="Reverso" onRetry={reload} onBack={nav.back}>
        {(r) => <ReversalCard r={r} />}
      </Remote>
      <ReadOnlyNote>Solo consulta · no modifica saldos ni registros.</ReadOnlyNote>
    </BoScreen>
  );
}

const st = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ref: { fontSize: 14, fontWeight: '700', color: colors.boInk },
  amount: { fontSize: 24, fontWeight: '800', color: colors.boInk },
  muted: { fontSize: 12, color: colors.boMuted },
  link: { fontSize: 14, fontWeight: '700', color: colors.boPink, marginTop: 4 },
});
