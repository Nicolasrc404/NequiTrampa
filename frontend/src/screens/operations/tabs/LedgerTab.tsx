import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../../theme/colors';
import { requireBackoffice } from '../../../services/api';
import { useApiResource } from '../../../hooks/useApiResource';
import { useNav } from '../../../navigation/nav';
import { Remote } from '../../../components/backoffice/Remote';
import { Badge, Card, EmptyState, KeyValue, SectionTitle } from '../../../components/backoffice/ui';
import { formatCents } from '../../../utils/format';

export function LedgerTab({ id }: { id: string }) {
  const nav = useNav();
  const state = useApiResource((signal) => requireBackoffice().finance.getLedger(id, { signal }), [id]);
  return (
    <Remote state={state} resource="Ledger" onBack={nav.back}>
      {({ entries: ledgerEntries, balanced, publicReference }) => {
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

const st = StyleSheet.create({
  amount: { fontSize: 22, fontWeight: '800', color: colors.boInk },
  muted: { fontSize: 12, color: colors.boMuted },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 15, fontWeight: '800', color: colors.boInk },
});
