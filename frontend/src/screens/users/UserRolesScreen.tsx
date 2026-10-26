import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { adminApi } from '../../api/backoffice';
import { useAction, useAsync } from '../../hooks/useAsync';
import { useNav } from '../../navigation/nav';
import { Remote } from '../../components/backoffice/Remote';
import { BoButton, BoScreen, Card, InlineError, KeyValue, SectionTitle, SuccessBanner } from '../../components/backoffice/ui';
import { ROLE_INFO } from '../../utils/format';

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

const st = StyleSheet.create({
  code: { fontSize: 16, fontWeight: '800', color: colors.boInk },
  muted: { fontSize: 13, color: colors.boMuted },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
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
