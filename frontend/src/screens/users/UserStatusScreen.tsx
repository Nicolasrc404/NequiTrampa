import React, { useState } from 'react';
import { requireBackoffice } from '../../services/api';
import { useApiResource } from '../../hooks/useApiResource';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useNav } from '../../navigation/nav';
import { Remote } from '../../components/backoffice/Remote';
import { BoButton, BoScreen, Card, InlineError, KeyValue, ReadOnlyNote, Segmented, SectionTitle, SuccessBanner } from '../../components/backoffice/ui';
import { USER_STATUS_LABEL } from '../../utils/format';

const NEW_STATUSES = ['ACTIVE', 'SUSPENDED', 'CLOSED'] as const;

export function UserStatusScreen({ id }: { id: string }) {
  const nav = useNav();
  const state = useApiResource((signal) => requireBackoffice().admin.getUser(id, { signal }), [id]);
  const [next, setNext] = useState<string>('');
  const action = useAsyncAction((id: string, status: string) => requireBackoffice().admin.setUserStatus(id, status));
  const [done, setDone] = useState<{ previousStatus: string; status: string } | null>(null);

  const apply = async () => {
    const r = await action.execute(id, next);
    if (r) setDone(r);
  };

  return (
    <BoScreen title="Cambiar estado" onBack={nav.back}>
      <Remote state={state} resource="Usuario" onBack={nav.back}>
        {({ user }) =>
          done ? (
            <>
              <SuccessBanner title="Cambio de estado confirmado" message="La acción quedó registrada para auditoría." />
              <Card>
                <KeyValue label="Usuario" value={user.transferCode} />
                <KeyValue label="Estado anterior" value={USER_STATUS_LABEL[done.previousStatus] ?? done.previousStatus} />
                <KeyValue label="Nuevo estado" value={USER_STATUS_LABEL[done.status] ?? done.status} />
              </Card>
              <BoButton label="Volver a usuarios" onPress={nav.home} />
            </>
          ) : (
            <>
              <Card>
                <KeyValue label="Usuario" value={`${user.transferCode} · ${user.clientId}`} mono />
                <KeyValue label="Estado actual" value={USER_STATUS_LABEL[user.status] ?? user.status} />
              </Card>
              <SectionTitle>Nuevo estado</SectionTitle>
              <Segmented
                options={NEW_STATUSES.filter((x) => x !== user.status).map((x) => ({ value: x, label: USER_STATUS_LABEL[x] }))}
                value={next}
                onChange={setNext}
              />
              <InlineError error={action.error} />
              <BoButton label="Confirmar cambio" onPress={apply} busy={action.isSubmitting} disabled={!next} />
              <ReadOnlyNote>Suspender o cerrar congela la billetera. No elimina ni modifica el saldo.</ReadOnlyNote>
            </>
          )
        }
      </Remote>
    </BoScreen>
  );
}
