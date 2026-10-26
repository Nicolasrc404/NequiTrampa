import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import colors from '../../theme/colors';
import { requireBackoffice } from '../../services/api';
import { useApiResource } from '../../hooks/useApiResource';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useNav } from '../../navigation/nav';
import { Remote } from '../../components/backoffice/Remote';
import { BoButton, BoScreen, Card, InlineError, KeyValue, ReadOnlyNote, SectionTitle, Segmented } from '../../components/backoffice/ui';
import { CASE_STATUS_LABEL } from '../../utils/format';
import { SupportCase } from '../../types/backoffice';
import { NOTE, CaseResult } from './CaseParts';

const NEXT_STATUSES = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];

export function CaseStatusScreen({ id }: { id: string }) {
  const nav = useNav();
  const state = useApiResource((signal) => requireBackoffice().cases.get(id, { signal }), [id]);
  const [next, setNext] = useState('');
  const action = useAsyncAction((id: string, status: string) => requireBackoffice().cases.setStatus(id, status));
  const [done, setDone] = useState<{ before: string; case: SupportCase } | null>(null);

  return (
    <BoScreen title="Actualizar estado" subtitle="Gestión de soporte" badge="SOPORTE" onBack={nav.back}>
      <Remote state={state} resource="Caso" onBack={nav.back}>
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
                busy={action.isSubmitting}
                disabled={!next}
                onPress={async () => {
                  const r = await action.execute(id, next);
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

const st = StyleSheet.create({
  ref: { fontSize: 13, color: colors.boFaint },
  subject: { fontSize: 17, fontWeight: '800', color: colors.boInk },
});
