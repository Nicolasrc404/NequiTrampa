import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRoles, hasSession, subscribeSession } from '../api/auth';
import { ApiError } from '../api/http';
import { BoRoute } from '../types/backoffice';
import { NavContext } from './nav';
import { BoScreen, ErrorState, SkeletonList } from '../components/backoffice/ui';
import { LoginScreen } from '../screens/backoffice/auth/LoginScreen';
import { HomeScreen } from '../screens/backoffice/home/HomeScreen';
import { UsersListScreen } from '../screens/backoffice/users/UsersListScreen';
import { UserDetailScreen } from '../screens/backoffice/users/UserDetailScreen';
import { UserStatusScreen } from '../screens/backoffice/users/UserStatusScreen';
import { UserRolesScreen } from '../screens/backoffice/users/UserRolesScreen';
import { RolesScreen } from '../screens/backoffice/users/RolesScreen';
import { CasesListScreen } from '../screens/backoffice/cases/CasesListScreen';
import { CaseDetailScreen } from '../screens/backoffice/cases/CaseDetailScreen';
import { CaseStatusScreen } from '../screens/backoffice/cases/CaseStatusScreen';
import { CaseAssignScreen } from '../screens/backoffice/cases/CaseAssignScreen';
import { CaseEscalateScreen } from '../screens/backoffice/cases/CaseEscalateScreen';
import { CustomerSearchScreen } from '../screens/backoffice/customers/CustomerSearchScreen';
import { CustomerProfileScreen } from '../screens/backoffice/customers/CustomerProfileScreen';
import { CustomerOperationsScreen } from '../screens/backoffice/customers/CustomerOperationsScreen';
import { OperationSearchScreen } from '../screens/backoffice/operations/OperationSearchScreen';
import { OperationScreen } from '../screens/backoffice/operations/OperationScreen';
import { ReversalCreateScreen } from '../screens/backoffice/reversals/ReversalCreateScreen';
import { ReversalDetailScreen } from '../screens/backoffice/reversals/ReversalDetailScreen';

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
function allowed(r: BoRoute, roles: string[]): boolean {
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
  const [signedIn, setSignedIn] = useState(hasSession());
  const [wasSignedIn, setWasSignedIn] = useState(false);
  const [stack, setStack] = useState<BoRoute[]>([HOME]);
  const [roles, setRoles] = useState<string[] | null>(null);
  const [rolesError, setRolesError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      subscribeSession(() => {
        const on = hasSession();
        setSignedIn(on);
        if (on) setWasSignedIn(true);
        else {
          setRoles(null);
          setStack([HOME]);
        }
      }),
    [],
  );

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    setRolesError(null);
    fetchRoles().then(
      (r) => alive && setRoles(r),
      (e) => alive && setRolesError(e instanceof ApiError ? e : new ApiError(500, 'Error inesperado.')),
    );
    return () => {
      alive = false;
    };
  }, [signedIn, attempt]);

  const nav = useMemo(
    () => ({
      push: (r: BoRoute) => setStack((s) => [...s, r]),
      replace: (r: BoRoute) => setStack((s) => [...s.slice(0, -1), r]),
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      home: () => setStack([HOME]),
      roles: roles ?? [],
    }),
    [roles],
  );
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!signedIn) return <LoginScreen notice={wasSignedIn ? 'Sesión vencida. Inicia sesión de nuevo.' : undefined} />;
  if (rolesError)
    return (
      <BoScreen title="Backoffice">
        <ErrorState error={rolesError} resource="Sesión" onRetry={retry} />
      </BoScreen>
    );
  if (!roles)
    return (
      <BoScreen title="Backoffice">
        <SkeletonList rows={3} />
      </BoScreen>
    );

  const current = stack[stack.length - 1];
  return (
    <NavContext.Provider value={nav}>
      {allowed(current, roles) ? (
        renderRoute(current)
      ) : (
        <BoScreen title="Sin permisos" onBack={nav.back}>
          <ErrorState error={new ApiError(403, 'Forbidden')} resource="Módulo" onBack={nav.back} />
        </BoScreen>
      )}
    </NavContext.Provider>
  );
}
