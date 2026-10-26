import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { adminApi } from '../../api/backoffice';
import { useAction, useAsync } from '../../hooks/useAsync';
import { useNav } from '../../navigation/nav';
import { Remote } from '../../components/backoffice/Remote';
import {
  Badge,
  BoButton,
  BoInput,
  BoScreen,
  Card,
  EmptyState,
  InlineError,
  KeyValue,
  ReadOnlyNote,
  Segmented,
  SectionTitle,
  SuccessBanner,
} from '../../components/backoffice/ui';
import { ROLE_INFO, USER_STATUS_LABEL, formatCents, formatDateTime, toneForStatus } from '../../utils/format';

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

const NEW_STATUSES = ['ACTIVE', 'SUSPENDED', 'CLOSED'] as const;

export function UserStatusScreen({ id }: { id: string }) {
  const nav = useNav();
  const { state, reload } = useAsync(() => adminApi.user(id), [id]);
  const [next, setNext] = useState<string>('');
  const action = useAction(adminApi.setStatus);
  const [done, setDone] = useState<{ previousStatus: string; status: string } | null>(null);

  const apply = async () => {
    const r = await action.run(id, next);
    if (r) setDone(r);
  };

  return (
    <BoScreen title="Cambiar estado" onBack={nav.back}>
      <Remote state={state} resource="Usuario" onRetry={reload} onBack={nav.back}>
        {({ user }) =>
          done ? (
            <>
              <SuccessBanner title="Cambio de estado confirmado" message="La acción quedó registrada para auditoría." />
              <Card>
                <KeyValue label="Usuario" value={user.transferCode} />
                <KeyValue label="Estado anterior" value={USER_STATUS_LABEL[done.previousStatus] ?? done.previousStatus} />
                <KeyValue label="Nuevo estado" value={USER_STATUS_LABEL[done.status] ?? done.status} />
              </Card>
              <BoButton label="Volver a usuarios" onPress={nav.home} />
            </>
          ) : (
            <>
              <Card>
                <KeyValue label="Usuario" value={`${user.transferCode} · ${user.clientId}`} mono />
                <KeyValue label="Estado actual" value={USER_STATUS_LABEL[user.status] ?? user.status} />
              </Card>
              <SectionTitle>Nuevo estado</SectionTitle>
              <Segmented
                options={NEW_STATUSES.filter((x) => x !== user.status).map((x) => ({ value: x, label: USER_STATUS_LABEL[x] }))}
                value={next}
                onChange={setNext}
              />
              <InlineError error={action.error} />
              <BoButton label="Confirmar cambio" onPress={apply} busy={action.busy} disabled={!next} />
              <ReadOnlyNote>Suspender o cerrar congela la billetera. No elimina ni modifica el saldo.</ReadOnlyNote>
            </>
          )
        }
      </Remote>
    </BoScreen>
  );
}

export function UserRolesScreen({ id }: { id: string }) {
  const nav = useNav();
  const { state, reload } = useAsync(async () => {
    const [available, current] = await Promise.all([adminApi.roles(), adminApi.userRoles(id)]);
    return { available: available.roles, current: current.roles, uid: current.userId };
  }, [id]);
  const [selected, setSelected] = useState<string[] | null>(null);
  const action = useAction(adminApi.setRoles);
  const [done, setDone] = useState<{ before: string[]; after: string[] } | null>(null);

  return (
    <BoScreen title="Asignar roles" onBack={nav.back}>
      <Remote state={state} resource="Roles" onRetry={reload} onBack={nav.back}>
        {({ available, current, uid }) => {
          const value = selected ?? current;
          if (done)
            return (
              <>
                <SuccessBanner title="Roles actualizados" message="Surtirán efecto en el siguiente refresco de sesión del usuario." />
                <Card>
                  <KeyValue label="Roles anteriores" value={done.before.join(' · ')} />
                  <KeyValue label="Roles nuevos" value={done.after.join(' · ')} />
                </Card>
                <BoButton label="Volver a gestión" onPress={nav.home} />
              </>
            );
          const toggle = (r: string) => setSelected(value.includes(r) ? value.filter((x) => x !== r) : [...value, r]);
          return (
            <>
              <Card>
                <KeyValue label="Usuario" value={id} mono />
              </Card>
              <SectionTitle>Roles</SectionTitle>
              {available.map((r) => {
                const on = value.includes(r);
                return (
                  <Pressable key={r} onPress={() => toggle(r)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                    <Card>
                      <View style={st.rowBetween}>
                        <View style={{ flex: 1 }}>
                          <Text style={st.code}>{r}</Text>
                          <Text style={st.muted}>{ROLE_INFO[r] ?? ''}</Text>
                        </View>
                        <Ionicons name={on ? 'checkbox' : 'square-outline'} size={26} color={on ? colors.boPink : colors.boFaint} />
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
              <View style={st.warn}>
                <Ionicons name="warning-outline" size={18} color={colors.boWarnText} />
                <Text style={st.warnText}>Cambiar roles modifica el acceso del usuario.</Text>
              </View>
              <InlineError error={action.error} />
              <BoButton
                label="Guardar roles"
                busy={action.busy}
                disabled={value.length === 0}
                onPress={async () => {
                  const r = await action.run(uid, value);
                  if (r) setDone({ before: current, after: r.roles });
                }}
              />
            </>
          );
        }}
      </Remote>
    </BoScreen>
  );
}

export function RolesScreen() {
  const nav = useNav();
  const { state, reload } = useAsync(() => adminApi.roles(), []);
  return (
    <BoScreen title="Roles" subtitle="Permisos disponibles" badge="ADMIN" onBack={nav.back}>
      <Remote state={state} resource="Roles" onRetry={reload} onBack={nav.back}>
        {({ roles }) => (
          <>
            {roles.map((r) => (
              <Card key={r}>
                <Text style={st.code}>{r}</Text>
                <Text style={st.muted}>{ROLE_INFO[r] ?? ''}</Text>
              </Card>
            ))}
            <ReadOnlyNote>Los roles no se crean ni eliminan desde aquí.</ReadOnlyNote>
          </>
        )}
      </Remote>
    </BoScreen>
  );
}

const st = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  code: { fontSize: 16, fontWeight: '800', color: colors.boInk },
  id: { fontSize: 12, color: colors.boFaint, fontFamily: 'monospace' },
  muted: { fontSize: 13, color: colors.boMuted },
  warn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.boWarnBg,
    padding: 12,
    borderRadius: 12,
  },
  warnText: { flex: 1, color: colors.boWarnText, fontSize: 14, fontWeight: '600' },
});
