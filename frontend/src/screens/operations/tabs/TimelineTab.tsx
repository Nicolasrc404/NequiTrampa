import React from 'react';
import { requireBackoffice } from '../../../services/api';
import { useApiResource } from '../../../hooks/useApiResource';
import { useNav } from '../../../navigation/nav';
import { Remote } from '../../../components/backoffice/Remote';
import { Card, EmptyState, SectionTitle, Timeline } from '../../../components/backoffice/ui';
import { TIMELINE_STEP_LABEL, formatDateTime } from '../../../utils/format';

export function TimelineTab({ id }: { id: string }) {
  const nav = useNav();
  const state = useApiResource((signal) => requireBackoffice().support.getTimeline(id, { signal }), [id]);
  return (
    <Remote state={state} resource="Línea de tiempo" onBack={nav.back}>
      {({ timeline }) =>
        timeline.length === 0 ? (
          <EmptyState title="Sin eventos" message="Esta operación aún no tiene eventos registrados." />
        ) : (
          <Card>
            <SectionTitle right={`${timeline.length} eventos`}>Del primero al último · Colombia</SectionTitle>
            <Timeline
              items={timeline.map((t) => ({
                title: TIMELINE_STEP_LABEL[t.step] ?? t.step,
                time: formatDateTime(t.at, true),
                detail: t.detail,
                meta: t.eventId ? `Evento ${t.eventId}` : undefined,
              }))}
            />
          </Card>
        )
      }
    </Remote>
  );
}
