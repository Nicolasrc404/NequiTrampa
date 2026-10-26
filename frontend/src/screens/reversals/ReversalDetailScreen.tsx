import React from 'react';
import { requireBackoffice } from '../../services/api';
import { useApiResource } from '../../hooks/useApiResource';
import { useNav } from '../../navigation/nav';
import { Remote } from '../../components/backoffice/Remote';
import { BoScreen, ReadOnlyNote } from '../../components/backoffice/ui';
import { ReversalCard } from './ReversalCard';

export function ReversalDetailScreen({ id }: { id: string }) {
  const nav = useNav();
  const state = useApiResource((signal) => requireBackoffice().finance.getReversal(id, { signal }), [id]);
  return (
    <BoScreen title="Detalle de reverso" subtitle="Operador financiero" badge="OPERADOR" onBack={nav.back}>
      <Remote state={state} resource="Reverso" onBack={nav.back}>
        {(r) => <ReversalCard r={r} />}
      </Remote>
      <ReadOnlyNote>Solo consulta · no modifica saldos ni registros.</ReadOnlyNote>
    </BoScreen>
  );
}
