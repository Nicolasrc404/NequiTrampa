import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../../theme/colors';
import { casesApi } from '../../../api/backoffice';
import { useAsync } from '../../../hooks/useAsync';
import { useNav } from '../../../navigation/nav';
import { Remote } from '../../../components/backoffice/Remote';
import { Badge, BoScreen, Card, EmptyState, ReadOnlyNote, SectionTitle, Segmented } from '../../../components/backoffice/ui';
import { CASE_STATUS_LABEL, PRIORITY_LABEL, formatDateTime, toneForStatus } from '../../../utils/format';
import { NOTE } from './CaseParts';

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  ...(['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'] as const).map((v) => ({ value: v, label: CASE_STATUS_LABEL[v] })),
];

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

const st = StyleSheet.create({
  muted: { fontSize: 12, color: colors.boMuted },
  ref: { fontSize: 13, color: colors.boFaint },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subject: { fontSize: 17, fontWeight: '800', color: colors.boInk },
});
