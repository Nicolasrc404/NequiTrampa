import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { financeApi, supportApi } from '../../api/backoffice';
import { useAsync } from '../../hooks/useAsync';
import { useNav } from '../../navigation/nav';
import { Remote } from '../../components/backoffice/Remote';
import {
  Badge,
  BoButton,
  BoInput,
  BoScreen,
  Card,
  EmptyState,
  KeyValue,
  ReadOnlyNote,
  Segmented,
  SectionTitle,
  Timeline,
} from '../../components/backoffice/ui';
import { OPERATION_TYPE_LABEL, formatCents, formatDateTime, toneForStatus } from '../../utils/format';
import { OperationTab } from '../../types/backoffice';

type Area = 'support' | 'finance';

const NOTE = 'Solo consulta · no modifica saldos ni registros.';

export function OperationSearchScreen({ area }: { area: Area }) {
  const nav = useNav();
  const [id, setId] = useState('');
  const go = () => id.trim() && nav.push({ name: 'operation', id: id.trim(), tab: 'detail', area });
  return (
    <BoScreen
      title={area === 'support' ? 'Investigación de operación' : 'Operaciones financieras'}
      subtitle={area === 'support' ? 'Investigación' : 'Operador financiero'}
      badge={area === 'support' ? 'SOPORTE' : 'OPERADOR'}
      onBack={nav.back}
    >
      <BoInput
        label="Identificador de operación"
        value={id}
        onChangeText={setId}
        placeholder="Referencia pública o ID de la operación"
        returnKeyType="search"
        onSubmitEditing={go}
      />
      <BoButton label="Consultar" disabled={!id.trim()} onPress={go} />
      <ReadOnlyNote>{NOTE}</ReadOnlyNote>
    </BoScreen>
  );
}

const TABS: Record<Area, Array<{ value: OperationTab; label: string }>> = {
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

export function OperationScreen({ id, tab, area }: { id: string; tab: OperationTab; area: Area }) {
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

function OperationDetail({ id, area }: { id: string; area: Area }) {
  const nav = useNav();
  const { state, reload } = useAsync(() => (area === 'support' ? supportApi.operation(id) : financeApi.operation(id)), [id, area]);
  return (
    <Remote state={state} resource="Operación" onRetry={reload} onBack={nav.back}>
      {(o) => (
        <>
          <Card>
            <View style={st.rowBetween}>
              <Badge label={o.status} tone={toneForStatus(o.status)} />
              <Text style={st.muted}>{OPERATION_TYPE_LABEL[o.type] ?? o.type}</Text>
            </View>
            <Text style={st.amount}>{formatCents(o.amountCents)}</Text>
            <Text style={st.muted}>{o.currency}</Text>
          </Card>
          <Card>
            <SectionTitle>Datos de trazabilidad</SectionTitle>
            <KeyValue label="Referencia" value={o.publicReference} />
            <KeyValue label="ID de operación" value={o.operationId} mono />
            <KeyValue label="Actor" value={`${o.actorType} · ${o.actorId}`} />
            <KeyValue label="Creada · Colombia" value={formatDateTime(o.createdAt)} />
            <KeyValue label="Confirmada · Colombia" value={formatDateTime(o.confirmedAt)} />
            {o.originalOperationId ? <KeyValue label="Operación original" value={o.originalOperationId} mono /> : null}
            {o.reason ? <KeyValue label="Motivo" value={o.reason} /> : null}
          </Card>
          {area === 'finance' && o.type === 'TRANSFER' && o.status === 'COMPLETED' && (
            <BoButton label="Solicitar reverso" variant="secondary" onPress={() => nav.push({ name: 'reversalCreate', operationId: o.publicReference })} />
          )}
        </>
      )}
    </Remote>
  );
}

function TimelineTab({ id }: { id: string }) {
  const nav = useNav();
  const { state, reload } = useAsync(() => supportApi.timeline(id), [id]);
  return (
    <Remote state={state} resource="Línea de tiempo" onRetry={reload} onBack={nav.back}>
      {({ timeline }) =>
        timeline.length === 0 ? (
          <EmptyState title="Sin eventos" message="Esta operación aún no tiene eventos registrados." />
        ) : (
          <Card>
            <SectionTitle right={`${timeline.length} eventos`}>Del primero al último · Colombia</SectionTitle>
            <Timeline
              items={timeline.map((t) => ({
                title: t.step,
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

function LedgerTab({ id }: { id: string }) {
  const nav = useNav();
  const { state, reload } = useAsync(() => financeApi.ledger(id), [id]);
  return (
    <Remote state={state} resource="Ledger" onRetry={reload} onBack={nav.back}>
      {({ ledgerEntries, balanced, publicReference }) => {
        if (ledgerEntries.length === 0) return <EmptyState title="Sin asientos" message="La operación no tiene asientos de ledger." />;
        const debits = ledgerEntries.filter((e) => e.deltaCents < 0).reduce((a, e) => a - e.deltaCents, 0);
        const credits = ledgerEntries.filter((e) => e.deltaCents > 0).reduce((a, e) => a + e.deltaCents, 0);
        return (
          <>
            <SectionTitle right={`${ledgerEntries.length} asientos`}>{`Asientos de ${publicReference}`}</SectionTitle>
            {ledgerEntries.map((e) => (
              <Card key={e.entryNo}>
                <View style={st.rowBetween}>
                  <Text style={st.title}>{e.accountType}</Text>
                  <Text style={[st.amount, { color: e.deltaCents < 0 ? colors.boDangerText : colors.boOkText }]}>
                    {e.deltaCents < 0 ? 'Débito ' : 'Crédito '}
                    {formatCents(Math.abs(e.deltaCents))}
                  </Text>
                </View>
                <Text style={st.muted}>{e.clientId ? `Cliente ${e.clientId}` : `Cuenta ${e.accountId}`}</Text>
                <Text style={st.muted}>
                  Saldo {formatCents(e.balanceBeforeCents)} → {formatCents(e.balanceAfterCents)}
                </Text>
              </Card>
            ))}
            <Card>
              <KeyValue label="Total débitos" value={formatCents(debits)} />
              <KeyValue label="Total créditos" value={formatCents(credits)} />
              <KeyValue label="Diferencia contable" value={formatCents(credits - debits)} />
              <Badge label={balanced ? 'Asientos balanceados' : 'Asientos desbalanceados'} tone={balanced ? 'ok' : 'danger'} />
            </Card>
          </>
        );
      }}
    </Remote>
  );
}

function AuditTab({ id }: { id: string }) {
  const nav = useNav();
  const { state, reload } = useAsync(() => financeApi.audit(id), [id]);
  return (
    <Remote state={state} resource="Auditoría" onRetry={reload} onBack={nav.back}>
      {({ auditEntries }) =>
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

const st = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 15, fontWeight: '800', color: colors.boInk },
  amount: { fontSize: 22, fontWeight: '800', color: colors.boInk },
  muted: { fontSize: 12, color: colors.boMuted },
});
