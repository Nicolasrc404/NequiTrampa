import React from 'react';
import { requireBackoffice } from '../../../services/api';
import { useApiResource } from '../../../hooks/useApiResource';
import { useNav } from '../../../navigation/nav';
import { Remote } from '../../../components/backoffice/Remote';
import { Card, EmptyState, SectionTitle, Timeline } from '../../../components/backoffice/ui';
import { formatDateTime } from '../../../utils/format';

export function AuditTab({ id }: { id: string }) {
  const nav = useNav();
  const state = useApiResource((signal) => requireBackoffice().finance.getAudit(id, { signal }), [id]);
  return (
    <Remote state={state} resource="Auditoría" onBack={nav.back}>
      {({ entries: auditEntries }) =>
        auditEntries.length === 0 ? (
          <EmptyState title="Sin registros" message="No hay acciones de auditoría asociadas a esta operación." />
        ) : (
          <Card>
            <SectionTitle right={`${auditEntries.length} eventos`}>Línea de tiempo de auditoría</SectionTitle>
            <Timeline
              items={auditEntries.map((a) => ({
                title: String(a.action ?? 'EVENTO'),
                time: formatDateTime(a.occurredAt, true),
                meta: `Actor: ${String(a.actorId ?? '—')}`,
                detail: typeof a.details === 'string' ? a.details : undefined,
              }))}
            />
          </Card>
        )
      }
    </Remote>
  );
}
