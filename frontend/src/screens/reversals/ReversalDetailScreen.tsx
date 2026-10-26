import React from 'react';
import { financeApi } from '../../api/backoffice';
import { useAsync } from '../../hooks/useAsync';
import { useNav } from '../../navigation/nav';
import { Remote } from '../../components/backoffice/Remote';
import { BoScreen, ReadOnlyNote } from '../../components/backoffice/ui';
import { ReversalCard } from './ReversalCard';

export function ReversalDetailScreen({ id }: { id: string }) {
  const nav = useNav();
  const { state, reload } = useAsync(() => financeApi.reversal(id), [id]);
  return (
    <BoScreen title="Detalle de reverso" subtitle="Operador financiero" badge="OPERADOR" onBack={nav.back}>
      <Remote state={state} resource="Reverso" onRetry={reload} onBack={nav.back}>
        {(r) => <ReversalCard r={r} />}
      </Remote>
      <ReadOnlyNote>Solo consulta · no modifica saldos ni registros.</ReadOnlyNote>
    </BoScreen>
  );
}
