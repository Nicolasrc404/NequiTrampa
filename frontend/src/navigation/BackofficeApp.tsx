import React, { useEffect, useMemo, useState } from 'react';
import { appConfig } from '../config/appConfig';
import { sessionManager } from '../services/session/platform';
import type { SessionSnapshot } from '../services/session';
import { ApiError } from '../services/http';
import { BoRoute } from '../types/backoffice';
import { NavContext } from './nav';
import { BoScreen, ErrorState, SkeletonList, StateCard } from '../components/backoffice/ui';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { UsersListScreen } from '../screens/users/UsersListScreen';
import { UserDetailScreen } from '../screens/users/UserDetailScreen';
import { UserStatusScreen } from '../screens/users/UserStatusScreen';
import { UserRolesScreen } from '../screens/users/UserRolesScreen';
import { RolesScreen } from '../screens/users/RolesScreen';
import { CasesListScreen } from '../screens/cases/CasesListScreen';
import { CaseDetailScreen } from '../screens/cases/CaseDetailScreen';
import { CaseStatusScreen } from '../screens/cases/CaseStatusScreen';
import { CaseAssignScreen } from '../screens/cases/CaseAssignScreen';
import { CaseEscalateScreen } from '../screens/cases/CaseEscalateScreen';
import { CustomerSearchScreen } from '../screens/customers/CustomerSearchScreen';
import { CustomerProfileScreen } from '../screens/customers/CustomerProfileScreen';
import { CustomerOperationsScreen } from '../screens/customers/CustomerOperationsScreen';
import { OperationSearchScreen } from '../screens/operations/OperationSearchScreen';
import { OperationScreen } from '../screens/operations/OperationScreen';
import { ReversalCreateScreen } from '../screens/reversals/ReversalCreateScreen';
import { ReversalDetailScreen } from '../screens/reversals/ReversalDetailScreen';

const HOME: BoRoute = { name: 'home' };

function renderRoute(r: BoRoute): React.ReactNode {
  switch (r.name) {
    case 'home': return <HomeScreen />;
    case 'users': return <UsersListScreen />;
    case 'userDetail': return <UserDetailScreen id={r.id} />;
    case 'userStatus': return <UserStatusScreen id={r.id} />;
    case 'userRoles': return <UserRolesScreen id={r.id} />;
    case 'roles': return <RolesScreen />;
    case 'cases': return <CasesListScreen />;
    case 'caseDetail': return <CaseDetailScreen id={r.id} />;
    case 'caseStatus': return <CaseStatusScreen id={r.id} />;
    case 'caseAssign': return <CaseAssignScreen id={r.id} />;
    case 'caseEscalate': return <CaseEscalateScreen id={r.id} />;
    case 'customer': return <CustomerSearchScreen />;
    case 'customerProfile': return <CustomerProfileScreen id={r.id} />;
    case 'customerOperations': return <CustomerOperationsScreen id={r.id} />;
    case 'operationSearch': return <OperationSearchScreen area={r.area} />;
    case 'operation': return <OperationScreen id={r.id} tab={r.tab} area={r.area} />;
    case 'reversalCreate': return <ReversalCreateScreen operationId={r.operationId} />;
    case 'reversalDetail': return <ReversalDetailScreen id={r.id} />;
  }
}

/** Ruta → rol requerido, para no mostrar pantallas que el backend rechazaría con 403. */
function allowed(r: BoRoute, roles: readonly string[]): boolean {
  const staff = roles.some((x) => ['SOPORTE', 'OPERADOR_FINANCIERO', 'ADMIN'].includes(x));
  switch (r.name) {
    case 'home': return true;
    case 'users': case 'userDetail': case 'userStatus': case 'userRoles': case 'roles':
      return roles.includes('ADMIN');
    case 'reversalCreate': case 'reversalDetail':
      return roles.includes('OPERADOR_FINANCIERO');
    case 'operationSearch':
      return r.area === 'finance' ? roles.includes('OPERADOR_FINANCIERO') : staff;
    case 'operation':
      return r.area === 'finance' ? roles.includes('OPERADOR_FINANCIERO') : staff;
    default:
      return staff;
  }
}

export default function BackofficeApp() {
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(() => sessionManager.getSnapshot());
  const [stack, setStack] = useState<BoRoute[]>([HOME]);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = sessionManager.subscribe(setSnapshot);
    void sessionManager.restore();
    return unsubscribe;
  }, []);

  // Al cerrar o perder la sesión se vuelve al inicio y se olvida el correo.
  useEffect(() => {
    if (snapshot.status === 'anonymous') {
      setStack([HOME]);
      setEmail(null);
    }
  }, [snapshot.status]);

  const roles = snapshot.user?.roles ?? [];
  const nav = useMemo(
    () => ({
      push: (r: BoRoute) => setStack((s) => [...s, r]),
      replace: (r: BoRoute) => setStack((s) => [...s.slice(0, -1), r]),
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      home: () => setStack([HOME]),
      roles,
      who: email ?? snapshot.user?.uid ?? '',
    }),
    // `roles` cambia de identidad en cada render: se compara por contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roles.join(','), email, snapshot.user?.uid],
  );

  if (!appConfig.apiConfigured || !appConfig.identityApiKey) {
    return (
      <BoScreen title="Backoffice">
        <StateCard
          icon="settings-outline"
          title="La app no está configurada"
          message="Falta EXPO_PUBLIC_API_URL o EXPO_PUBLIC_IDENTITY_API_KEY. Revisa frontend/.env.example."
        />
      </BoScreen>
    );
  }

  switch (snapshot.status) {
    case 'initializing':
      return (
        <BoScreen title="Backoffice">
          <SkeletonList rows={3} />
        </BoScreen>
      );
    case 'unavailable':
      return (
        <BoScreen title="Backoffice">
          <ErrorState
            error={ApiError.fromTransport('network')}
            resource="Sesión"
            onRetry={() => void sessionManager.restore()}
          />
        </BoScreen>
      );
    case 'anonymous':
      return (
        <LoginScreen
          notice={snapshot.errorCode === 'invalid_session' ? 'Sesión vencida. Inicia sesión de nuevo.' : undefined}
          onSignedIn={setEmail}
        />
      );
    default:
      break;
  }

  const current = stack[stack.length - 1];
  return (
    <NavContext.Provider value={nav}>
      {allowed(current, roles) ? (
        renderRoute(current)
      ) : (
        <BoScreen title="Sin permisos" onBack={nav.back}>
          <ErrorState error={new ApiError({ kind: 'forbidden', status: 403 })} resource="Módulo" onBack={nav.back} />
        </BoScreen>
      )}
    </NavContext.Provider>
  );
}
