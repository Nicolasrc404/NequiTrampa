import React from 'react';
import { StyleSheet, Text } from 'react-native';
import colors from '../../../theme/colors';
import { adminApi } from '../../../api/backoffice';
import { useAsync } from '../../../hooks/useAsync';
import { useNav } from '../../../navigation/nav';
import { Remote } from '../../../components/backoffice/Remote';
import { BoScreen, Card, ReadOnlyNote } from '../../../components/backoffice/ui';
import { ROLE_INFO } from '../../../utils/format';

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
  code: { fontSize: 16, fontWeight: '800', color: colors.boInk },
  muted: { fontSize: 13, color: colors.boMuted },
});
