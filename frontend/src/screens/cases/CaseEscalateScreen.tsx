import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import colors from '../../theme/colors';
import { requireBackoffice } from '../../services/api';
import { useApiResource } from '../../hooks/useApiResource';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useNav } from '../../navigation/nav';
import { Remote } from '../../components/backoffice/Remote';
import { BoButton, BoInput, BoScreen, Card, InlineError, ReadOnlyNote } from '../../components/backoffice/ui';
import { SupportCase } from '../../types/backoffice';
import { CaseBadges, CaseResult } from './CaseParts';

export function CaseEscalateScreen({ id }: { id: string }) {
  const nav = useNav();
  const state = useApiResource((signal) => requireBackoffice().cases.get(id, { signal }), [id]);
  const [reason, setReason] = useState('');
  const action = useAsyncAction((id: string, reason: string) => requireBackoffice().cases.escalate(id, reason));
  const [done, setDone] = useState<SupportCase | null>(null);

  return (
    <BoScreen title="Escalamiento caso" subtitle="Gestión de soporte" badge="SOPORTE" onBack={nav.back}>
      <Remote state={state} resource="Caso" onBack={nav.back}>
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
                busy={action.isSubmitting}
                disabled={reason.trim().length < 3}
                onPress={async () => {
                  const r = await action.execute(id, reason.trim());
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
  ref: { fontSize: 13, color: colors.boFaint },
  subject: { fontSize: 17, fontWeight: '800', color: colors.boInk },
});
