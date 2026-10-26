import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { casesApi } from '../../api/backoffice';
import { useAction, useAsync } from '../../hooks/useAsync';
import { useNav } from '../../navigation/nav';
import { Remote } from '../../components/backoffice/Remote';
import { BoButton, BoInput, BoScreen, Card, EmptyState, InlineError, KeyValue, ReadOnlyNote, SectionTitle } from '../../components/backoffice/ui';
import { formatDateTime } from '../../utils/format';
import { NOTE, CaseBadges } from './CaseParts';

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

const st = StyleSheet.create({
  author: { fontSize: 14, fontWeight: '700', color: colors.boInk },
  body: { fontSize: 15, color: colors.boInk, lineHeight: 21 },

  muted: { fontSize: 12, color: colors.boMuted },
  ref: { fontSize: 13, color: colors.boFaint },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subject: { fontSize: 17, fontWeight: '800', color: colors.boInk },
});
