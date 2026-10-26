import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../theme/colors';
import { sessionEmail, signOut } from '../../../api/auth';
import { useNav } from '../../../navigation/nav';
import { BoButton, BoScreen, Card, EmptyState } from '../../../components/backoffice/ui';
import { BoRoute } from '../../../types/backoffice';

interface Entry {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
  route: BoRoute;
}

const SUPPORT: Entry[] = [
  { icon: 'chatbubbles-outline', title: 'Casos de soporte', hint: 'Listado, estado, asignación y escalamiento', route: { name: 'cases' } },
  { icon: 'person-circle-outline', title: 'Consulta de clientes', hint: 'Perfil y operaciones del cliente', route: { name: 'customer' } },
  { icon: 'git-branch-outline', title: 'Investigación de operación', hint: 'Detalle y línea de tiempo', route: { name: 'operationSearch', area: 'support' } },
];

const FINANCE: Entry[] = [
  { icon: 'receipt-outline', title: 'Operaciones financieras', hint: 'Detalle, ledger y auditoría', route: { name: 'operationSearch', area: 'finance' } },
  { icon: 'return-down-back-outline', title: 'Solicitar reverso', hint: 'Compensa una operación completada', route: { name: 'reversalCreate' } },
];

const ADMIN: Entry[] = [
  { icon: 'people-outline', title: 'Usuarios', hint: 'Listado, estado y roles', route: { name: 'users' } },
  { icon: 'key-outline', title: 'Roles', hint: 'Permisos disponibles', route: { name: 'roles' } },
];

/** Módulos visibles según los roles del token (el backend vuelve a validar cada llamada). */
export function modulesFor(roles: string[]): Array<{ section: string; entries: Entry[] }> {
  const staff = roles.some((r) => ['SOPORTE', 'OPERADOR_FINANCIERO', 'ADMIN'].includes(r));
  const out: Array<{ section: string; entries: Entry[] }> = [];
  if (staff) out.push({ section: 'Soporte', entries: SUPPORT });
  if (roles.includes('OPERADOR_FINANCIERO')) out.push({ section: 'Operación financiera', entries: FINANCE });
  if (roles.includes('ADMIN')) out.push({ section: 'Administración', entries: ADMIN });
  return out;
}

export function HomeScreen() {
  const nav = useNav();
  const groups = modulesFor(nav.roles);

  return (
    <BoScreen title="Inicio" subtitle={sessionEmail()} badge={nav.roles.find((r) => r !== 'CLIENTE') ?? undefined}>
      {groups.length === 0 ? (
        <EmptyState title="Sin módulos disponibles" message="Tu cuenta no tiene un rol de personal. Pide acceso a un administrador." />
      ) : (
        groups.map((g) => (
          <View key={g.section} style={{ gap: 10 }}>
            <Text style={st.section}>{g.section}</Text>
            {g.entries.map((e) => (
              <Card key={e.title} onPress={() => nav.push(e.route)}>
                <View style={st.row}>
                  <View style={st.icon}>
                    <Ionicons name={e.icon} size={22} color={colors.boPink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.title}>{e.title}</Text>
                    <Text style={st.hint}>{e.hint}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.boFaint} />
                </View>
              </Card>
            ))}
          </View>
        ))
      )}
      <BoButton label="Cerrar sesión" variant="secondary" onPress={signOut} />
    </BoScreen>
  );
}

const st = StyleSheet.create({
  section: { fontSize: 14, fontWeight: '700', color: colors.boMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.boPinkSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: colors.boInk },
  hint: { fontSize: 13, color: colors.boMuted },
});
