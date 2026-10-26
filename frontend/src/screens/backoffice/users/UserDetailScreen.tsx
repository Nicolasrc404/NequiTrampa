import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../../../theme/colors';
import { adminApi } from '../../../api/backoffice';
import { useAsync } from '../../../hooks/useAsync';
import { useNav } from '../../../navigation/nav';
import { Remote } from '../../../components/backoffice/Remote';
import { Badge, BoButton, BoScreen, Card, KeyValue, ReadOnlyNote } from '../../../components/backoffice/ui';
import { USER_STATUS_LABEL, formatCents, formatDateTime, toneForStatus } from '../../../utils/format';

export function UserDetailScreen({ id }: { id: string }) {
  const nav = useNav();
  const { state, reload } = useAsync(() => adminApi.user(id), [id]);

  return (
    <BoScreen title="Detalle de usuario" onBack={nav.back}>
      <Remote state={state} resource="Usuario" onRetry={reload} onBack={nav.back}>
        {({ user, roles }) => (
          <>
            <Card>
              <View style={st.rowBetween}>
                <Text style={st.code}>{user.transferCode}</Text>
                <Badge label={USER_STATUS_LABEL[user.status] ?? user.status} tone={toneForStatus(user.status)} />
              </View>
              <KeyValue label="ID de usuario" value={user.clientId} mono />
              <KeyValue label="Roles asignados" value={roles?.length ? roles.join(' · ') : 'No disponible'} />
              <KeyValue label="Estado de la billetera" value={user.walletStatus} />
              <KeyValue label="Saldo" value={formatCents(user.balanceCents)} />
              <KeyValue label="Zona horaria" value={user.timezone} />
              <KeyValue label="Fecha de creación" value={formatDateTime(user.createdAt)} />
            </Card>
            <BoButton label="Cambiar estado" onPress={() => nav.push({ name: 'userStatus', id: user.clientId })} />
            <BoButton label="Asignar roles" variant="secondary" onPress={() => nav.push({ name: 'userRoles', id: user.clientId })} />
            <ReadOnlyNote>Cambiar el estado no elimina al usuario ni modifica su saldo.</ReadOnlyNote>
          </>
        )}
      </Remote>
    </BoScreen>
  );
}

const st = StyleSheet.create({
  code: { fontSize: 16, fontWeight: '800', color: colors.boInk },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
