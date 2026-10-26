import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../../theme/colors';
import { adminApi } from '../../../api/backoffice';
import { useAsync } from '../../../hooks/useAsync';
import { useNav } from '../../../navigation/nav';
import { Remote } from '../../../components/backoffice/Remote';
import { Badge, BoInput, BoScreen, Card, EmptyState, Segmented, SectionTitle } from '../../../components/backoffice/ui';
import { USER_STATUS_LABEL, formatDateTime, toneForStatus } from '../../../utils/format';

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'SUSPENDED', label: 'Suspendidos' },
  { value: 'CLOSED', label: 'Cerrados' },
];

export function UsersListScreen() {
  const nav = useNav();
  const [status, setStatus] = useState('');
  const [lookup, setLookup] = useState('');
  const { state, reload } = useAsync(() => adminApi.users(1, 50, status || undefined), [status]);

  return (
    <BoScreen title="Usuarios" subtitle="Administración" badge="ADMIN" onBack={nav.back}>
      <BoInput
        label="Buscar por ID, código de transferencia o uid"
        value={lookup}
        onChangeText={setLookup}
        placeholder="Ej. un client_id"
        returnKeyType="search"
        onSubmitEditing={() => lookup.trim() && nav.push({ name: 'userDetail', id: lookup.trim() })}
      />
      <Segmented options={STATUS_FILTERS} value={status} onChange={setStatus} />
      <Remote state={state} resource="Usuarios" onRetry={reload} onBack={nav.back}>
        {({ users, total }) =>
          users.length === 0 ? (
            <EmptyState title="Sin usuarios" message="No hay usuarios que coincidan con el filtro." />
          ) : (
            <>
              <SectionTitle right={`${total} en total`}>Clientes</SectionTitle>
              {users.map((u) => (
                <Card key={u.clientId} onPress={() => nav.push({ name: 'userDetail', id: u.clientId })}>
                  <View style={st.rowBetween}>
                    <Text style={st.code}>{u.transferCode}</Text>
                    <Badge label={USER_STATUS_LABEL[u.status] ?? u.status} tone={toneForStatus(u.status)} />
                  </View>
                  <Text style={st.id} numberOfLines={1}>
                    {u.clientId}
                  </Text>
                  <Text style={st.muted}>Registro · {formatDateTime(u.createdAt)}</Text>
                </Card>
              ))}
            </>
          )
        }
      </Remote>
    </BoScreen>
  );
}

const st = StyleSheet.create({
  code: { fontSize: 16, fontWeight: '800', color: colors.boInk },
  id: { fontSize: 12, color: colors.boFaint, fontFamily: 'monospace' },
  muted: { fontSize: 13, color: colors.boMuted },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
