import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { casesApi } from '../../api/backoffice';
import { useAction, useAsync } from '../../hooks/useAsync';
import { useNav } from '../../navigation/nav';
import { Remote } from '../../components/backoffice/Remote';
import {
  Badge,
  BoButton,
  BoInput,
  BoScreen,
  Card,
  EmptyState,
  InlineError,
  KeyValue,
  ReadOnlyNote,
  SectionTitle,
  Segmented,
  SuccessBanner,
} from '../../components/backoffice/ui';
import { CASE_STATUS_LABEL, PRIORITY_LABEL, formatDateTime, toneForStatus } from '../../utils/format';
import { SupportCase } from '../../types/backoffice';

const NOTE = 'Solo gestión de casos · no modifica saldos';

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  ...(['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'] as const).map((v) => ({ value: v, label: CASE_STATUS_LABEL[v] })),
];

const CaseBadges = ({ c }: { c: SupportCase }) => (
  <View style={st.badges}>
    <Badge label={PRIORITY_LABEL[c.priority] ?? c.priority} tone={toneForStatus(c.priority)} />
    <Badge label={CASE_STATUS_LABEL[c.status] ?? c.status} tone={toneForStatus(c.status)} />
  </View>
);

export function CasesListScreen() {
  const nav = useNav();
  const [status, setStatus] = useState('');
  const { state, reload } = useAsync(() => casesApi.list(status || undefined), [status]);

  return (
    <BoScreen title="Casos de soporte" subtitle="Gestión de soporte" badge="SOPORTE" onBack={nav.back}>
      <Segmented options={STATUS_FILTERS} value={status} onChange={setStatus} />
      <Remote state={state} resource="Casos" onRetry={reload} onBack={nav.back}>
        {({ items }) =>
          items.length === 0 ? (
            <EmptyState title="Sin casos" message="No hay casos con este estado por ahora." />
          ) : (
            <>
              <SectionTitle right={`${items.length} ${items.length === 1 ? 'caso' : 'casos'}`}>Casos del equipo</SectionTitle>
              {items.map((c) => (
                <Card key={c.id} onPress={() => nav.push({ name: 'caseDetail', id: c.id })}>
                  <View style={st.rowBetween}>
                    <Text style={st.ref}>{c.id}</Text>
                    <Badge label={PRIORITY_LABEL[c.priority] ?? c.priority} tone={toneForStatus(c.priority)} />
                  </View>
                  <Text style={st.subject}>{c.subject}</Text>
                  <Text style={st.muted}>Cliente · {c.clientId}</Text>
                  <View style={st.rowBetween}>
                    <Badge label={CASE_STATUS_LABEL[c.status] ?? c.status} tone={toneForStatus(c.status)} />
                    <Text style={st.muted}>{c.assignedTo ? `Responsable · ${c.assignedTo}` : 'Sin asignar'}</Text>
                  </View>
                  <Text style={[st.muted, { textAlign: 'right' }]}>{formatDateTime(c.createdAt)}</Text>
                </Card>
              ))}
            </>
          )
        }
      </Remote>
      <ReadOnlyNote>{NOTE}</ReadOnlyNote>
    </BoScreen>
  );
}

export function CaseDetailScreen({ id }: { id: string }) {
  const nav = useNav();
  const { state, reload } = useAsync(() => casesApi.get(id), [id]);
  const [body, setBody] = useState('');
  const reply = useAction(casesApi.reply);

  return (
    <BoScreen title="Detalle del caso" subtitle="Gestión de soporte" badge="SOPORTE" onBack={nav.back}>
      <Remote state={state} resource="Caso" onRetry={reload} onBack={nav.back}>
        {({ case: c, messages }) => {
          const closed = c.status === 'CLOSED';
          return (
            <>
              <Card>
                <Text style={st.ref}>{c.id}</Text>
                <Text style={st.subject}>{c.subject}</Text>
                <CaseBadges c={c} />
                <KeyValue label="Cliente" value={c.clientId} mono />
                <KeyValue label="Responsable" value={c.assignedTo ?? 'Sin asignar'} />
                {c.description ? <KeyValue label="Descripción" value={c.description} /> : null}
                {c.escalationReason ? <KeyValue label={`Escalamiento (nivel ${c.escalationLevel ?? 1})`} value={c.escalationReason} /> : null}
                <KeyValue label="Creado" value={formatDateTime(c.createdAt)} />
                <KeyValue label="Última actualización" value={formatDateTime(c.updatedAt)} />
              </Card>

              {!closed && (
                <View style={{ gap: 10 }}>
                  <BoButton label="Actualizar estado" onPress={() => nav.push({ name: 'caseStatus', id })} />
                  <BoButton label="Asignar responsable" variant="secondary" onPress={() => nav.push({ name: 'caseAssign', id })} />
                  {c.status !== 'RESOLVED' && (
                    <BoButton label="Escalar caso" variant="secondary" onPress={() => nav.push({ name: 'caseEscalate', id })} />
                  )}
                </View>
              )}
              <BoButton
                label="Ver cliente"
                variant="secondary"
                onPress={() => nav.push({ name: 'customerProfile', id: c.clientId })}
              />

              <SectionTitle>Conversación e historial</SectionTitle>
              {messages.length === 0 ? (
                <EmptyState title="Sin mensajes" message="Aún no hay mensajes en este caso." />
              ) : (
                messages.map((m) => (
                  <Card key={m.id}>
                    <View style={st.rowBetween}>
                      <Text style={st.author}>{m.authorId === c.createdBy ? 'Creador del caso' : m.authorId}</Text>
                      <Text style={st.muted}>{formatDateTime(m.createdAt)}</Text>
                    </View>
                    <Text style={st.body}>{m.body}</Text>
                  </Card>
                ))
              )}

              {!closed && (
                <>
                  <BoInput
                    label="Responder"
                    value={body}
                    onChangeText={setBody}
                    multiline
                    maxLength={2000}
                    autoCapitalize="sentences"
                    placeholder="Escribe un mensaje"
                  />
                  <InlineError error={reply.error} />
                  <BoButton
                    label="Enviar respuesta"
                    busy={reply.busy}
                    disabled={!body.trim()}
                    onPress={async () => {
                      if (await reply.run(id, body.trim())) {
                        setBody('');
                        reload();
                      }
                    }}
                  />
                </>
              )}
              <ReadOnlyNote>{NOTE}</ReadOnlyNote>
            </>
          );
        }}
      </Remote>
    </BoScreen>
  );
}

function CaseResult({ c, title, message }: { c: SupportCase; title: string; message: string }) {
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

const NEXT_STATUSES = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];

export function CaseStatusScreen({ id }: { id: string }) {
  const nav = useNav();
  const { state, reload } = useAsync(() => casesApi.get(id), [id]);
  const [next, setNext] = useState('');
  const action = useAction(casesApi.setStatus);
  const [done, setDone] = useState<{ before: string; case: SupportCase } | null>(null);

  return (
    <BoScreen title="Actualizar estado" subtitle="Gestión de soporte" badge="SOPORTE" onBack={nav.back}>
      <Remote state={state} resource="Caso" onRetry={reload} onBack={nav.back}>
        {({ case: c }) =>
          done ? (
            <CaseResult
              c={done.case}
              title="Estado actualizado correctamente"
              message={`El caso pasó de ${CASE_STATUS_LABEL[done.before]} a ${CASE_STATUS_LABEL[done.case.status] ?? done.case.status}.`}
            />
          ) : (
            <>
              <Card>
                <Text style={st.ref}>{c.id}</Text>
                <Text style={st.subject}>{c.subject}</Text>
                <KeyValue label="Estado actual" value={CASE_STATUS_LABEL[c.status] ?? c.status} />
              </Card>
              <SectionTitle>Cambio de estado</SectionTitle>
              <Segmented
                options={NEXT_STATUSES.filter((x) => x !== c.status).map((x) => ({ value: x, label: CASE_STATUS_LABEL[x] }))}
                value={next}
                onChange={setNext}
              />
              <InlineError error={action.error} />
              <BoButton
                label="Guardar estado"
                busy={action.busy}
                disabled={!next}
                onPress={async () => {
                  const r = await action.run(id, next);
                  if (r) setDone({ before: c.status, case: r });
                }}
              />
              <ReadOnlyNote>{NOTE}</ReadOnlyNote>
            </>
          )
        }
      </Remote>
    </BoScreen>
  );
}

export function CaseAssignScreen({ id }: { id: string }) {
  const nav = useNav();
  const { state, reload } = useAsync(() => casesApi.get(id), [id]);
  const [assignee, setAssignee] = useState('');
  const action = useAction(casesApi.assign);
  const [done, setDone] = useState<SupportCase | null>(null);

  return (
    <BoScreen title="Asignar responsable" subtitle="Gestión de soporte" badge="SOPORTE" onBack={nav.back}>
      <Remote state={state} resource="Caso" onRetry={reload} onBack={nav.back}>
        {({ case: c }) =>
          done ? (
            <CaseResult c={done} title="Caso asignado correctamente" message={`${done.assignedTo} es el responsable de este caso.`} />
          ) : (
            <>
              <Card>
                <Text style={st.ref}>{c.id}</Text>
                <Text style={st.subject}>{c.subject}</Text>
                <KeyValue label="Responsable actual" value={c.assignedTo ?? 'Sin asignar'} />
              </Card>
              <BoInput label="uid del responsable" value={assignee} onChangeText={setAssignee} placeholder="uid de Identity Platform" />
              <InlineError error={action.error} />
              <BoButton
                label="Asignar"
                busy={action.busy}
                disabled={!assignee.trim()}
                onPress={async () => {
                  const r = await action.run(id, assignee.trim());
                  if (r) setDone(r);
                }}
              />
              <ReadOnlyNote>{NOTE}</ReadOnlyNote>
            </>
          )
        }
      </Remote>
    </BoScreen>
  );
}

export function CaseEscalateScreen({ id }: { id: string }) {
  const nav = useNav();
  const { state, reload } = useAsync(() => casesApi.get(id), [id]);
  const [reason, setReason] = useState('');
  const action = useAction(casesApi.escalate);
  const [done, setDone] = useState<SupportCase | null>(null);

  return (
    <BoScreen title="Escalamiento caso" subtitle="Gestión de soporte" badge="SOPORTE" onBack={nav.back}>
      <Remote state={state} resource="Caso" onRetry={reload} onBack={nav.back}>
        {({ case: c }) =>
          done ? (
            <>
              <CaseResult c={done} title="Escalamiento creado" message="El caso se envió para una revisión especializada." />
            </>
          ) : (
            <>
              <Card>
                <Text style={st.ref}>{c.id}</Text>
                <Text style={st.subject}>{c.subject}</Text>
                <CaseBadges c={c} />
              </Card>
              <BoInput
                label="Motivo del escalamiento (3–500 caracteres)"
                value={reason}
                onChangeText={setReason}
                multiline
                maxLength={500}
                autoCapitalize="sentences"
              />
              <InlineError error={action.error} />
              <BoButton
                label="Escalar caso"
                busy={action.busy}
                disabled={reason.trim().length < 3}
                onPress={async () => {
                  const r = await action.run(id, reason.trim());
                  if (r) setDone(r);
                }}
              />
              <ReadOnlyNote>Escalar un caso no modifica saldos ni operaciones.</ReadOnlyNote>
            </>
          )
        }
      </Remote>
    </BoScreen>
  );
}

const st = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badges: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  ref: { fontSize: 13, color: colors.boFaint },
  subject: { fontSize: 17, fontWeight: '800', color: colors.boInk },
  muted: { fontSize: 12, color: colors.boMuted },
  author: { fontSize: 14, fontWeight: '700', color: colors.boInk },
  body: { fontSize: 15, color: colors.boInk, lineHeight: 21 },
});
