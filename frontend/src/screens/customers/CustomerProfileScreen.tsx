import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';
import { requireBackoffice } from '../../services/api';
import { useApiResource } from '../../hooks/useApiResource';
import { useNav } from '../../navigation/nav';
import { Remote } from '../../components/backoffice/Remote';
import { Badge, BoButton, BoScreen, Card, KeyValue, ReadOnlyNote } from '../../components/backoffice/ui';
import { USER_STATUS_LABEL, formatCents, formatDateTime, toneForStatus } from '../../utils/format';

const NOTE = 'Solo consulta · no modifica datos ni saldos';

export function CustomerProfileScreen({ id }: { id: string }) {
  const nav = useNav();
  const state = useApiResource((signal) => requireBackoffice().support.getClient(id, { signal }), [id]);
  return (
    <BoScreen title="Perfil del cliente" subtitle="Customer Lookup" badge="SOPORTE" onBack={nav.back}>
      <Remote state={state} resource="Cliente" onBack={nav.back}>
        {(c) => (
          <>
            <Card>
              <View style={st.rowBetween}>
                <Text style={st.code}>{c.transferCode}</Text>
                <Badge label={USER_STATUS_LABEL[c.status] ?? c.status} tone={toneForStatus(c.status)} />
              </View>
              <KeyValue label="ID del cliente" value={c.clientId} mono />
              <KeyValue label="Estado de la billetera" value={c.walletStatus} />
              <KeyValue label="Saldo" value={formatCents(c.balanceCents)} />
              <KeyValue label="Zona horaria" value={c.timezone} />
              <KeyValue label="Fecha de registro" value={formatDateTime(c.createdAt)} />
            </Card>
            <BoButton label="Ver operaciones" onPress={() => nav.push({ name: 'customerOperations', id: c.clientId })} />
            <ReadOnlyNote>{NOTE}</ReadOnlyNote>
          </>
        )}
      </Remote>
    </BoScreen>
  );
}

const st = StyleSheet.create({
  code: { fontSize: 18, fontWeight: '800', color: colors.boInk },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
