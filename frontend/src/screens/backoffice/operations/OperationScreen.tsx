import React from 'react';
import { useNav } from '../../../navigation/nav';
import { BoScreen, ReadOnlyNote, Segmented } from '../../../components/backoffice/ui';
import { OperationArea, OperationTab } from '../../../types/backoffice';
import { OperationDetail } from './tabs/OperationDetailTab';
import { TimelineTab } from './tabs/TimelineTab';
import { LedgerTab } from './tabs/LedgerTab';
import { AuditTab } from './tabs/AuditTab';

const NOTE = 'Solo consulta · no modifica saldos ni registros.';

const TABS: Record<OperationArea, Array<{ value: OperationTab; label: string }>> = {
  support: [
    { value: 'detail', label: 'Detalle' },
    { value: 'timeline', label: 'Línea de tiempo' },
  ],
  finance: [
    { value: 'detail', label: 'Detalle' },
    { value: 'ledger', label: 'Ledger' },
    { value: 'audit', label: 'Auditoría' },
  ],
};

export function OperationScreen({ id, tab, area }: { id: string; tab: OperationTab; area: OperationArea }) {
  const nav = useNav();
  const setTab = (t: string) => nav.replace({ name: 'operation', id, tab: t as OperationTab, area });
  return (
    <BoScreen
      title={area === 'support' ? 'Investigación' : 'Operación financiera'}
      subtitle={id}
      badge={area === 'support' ? 'SOPORTE' : 'OPERADOR'}
      onBack={nav.back}
    >
      <Segmented options={TABS[area]} value={tab} onChange={setTab} />
      {tab === 'detail' && <OperationDetail id={id} area={area} />}
      {tab === 'timeline' && <TimelineTab id={id} />}
      {tab === 'ledger' && <LedgerTab id={id} />}
      {tab === 'audit' && <AuditTab id={id} />}
      <ReadOnlyNote>{NOTE}</ReadOnlyNote>
    </BoScreen>
  );
}
