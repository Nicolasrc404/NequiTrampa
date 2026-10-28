import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import colors from '../../theme/colors';
import { casesApi } from '../../api/backoffice';
import { useAction, useAsync } from '../../hooks/useAsync';
import { useNav } from '../../navigation/nav';
import { Remote } from '../../components/backoffice/Remote';
import { BoButton, BoInput, BoScreen, Card, InlineError, KeyValue, ReadOnlyNote } from '../../components/backoffice/ui';
import { SupportCase } from '../../types/backoffice';
import { NOTE, CaseResult } from './CaseParts';

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

const st = StyleSheet.create({
  ref: { fontSize: 13, color: colors.boFaint },
  subject: { fontSize: 17, fontWeight: '800', color: colors.boInk },
});
