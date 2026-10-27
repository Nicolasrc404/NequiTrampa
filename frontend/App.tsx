import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, SafeAreaView, StyleSheet, View } from 'react-native';
import colors from './src/theme/colors';
import { appConfig } from './src/config/appConfig';
import BackofficeApp from './src/navigation/BackofficeApp';
import SimulationBanner from './src/components/common/SimulationBanner';
import LoadingState from './src/components/common/states/LoadingState';
import ErrorState from './src/components/common/states/ErrorState';
import SessionGate, {
  type SessionGateReason,
} from './src/components/common/SessionGate';
import { sessionManager } from './src/services/session/platform';
import { apiClient } from './src/services/api';
import { createApiServices } from './src/services/factories';
import {
  useAnalytics,
  useBeneficiaries,
  useBudgets,
  useCashRegister,
  useCategories,
  useGoals,
  useMovements,
  useRecharges,
  useTransferReceipt,
  useTransfers,
  useWalletBalance,
} from './src/hooks/useApiData';
import { FinancialOperation } from './src/services/financialOperation';
import { classifyOperationFailure } from './src/services/operationFailure';
import { asApiError } from './src/services/http';
import { routeCategoryFailure } from './src/services/categorySubmission';
import { mapTransfer } from './src/services/mappers/transferMapper';
import { mapRechargeResult } from './src/services/mappers/rechargeMapper';
import { mapCategory } from './src/services/mappers/categoryMapper';
import { mapCashResult } from './src/services/mappers/cashMapper';
import { mapBudget } from './src/services/mappers/budgetMapper';
import { mapGoal } from './src/services/mappers/goalMapper';
import { mapBeneficiary } from './src/services/mappers/beneficiaryMapper';
import {
  formatLongDateLabel,
  formatMonthPeriodLabel,
} from './src/utils/datetime';

// ── Movements imports ──────────────────────────────────────
import { MovementsState, MovementItem } from './src/types/movements';
import { DEMO_MOVEMENTS } from './src/data/demoMovements';

import Movements01Screen from './src/screens/movements/Movements01Screen';
import Movements02Screen from './src/screens/movements/Movements02Screen';
import Movements03Screen from './src/screens/movements/Movements03Screen';
import Movements04Screen from './src/screens/movements/Movements04Screen';
import Movements05Screen from './src/screens/movements/Movements05Screen';
import Movements06Screen from './src/screens/movements/Movements06Screen';
import Movements07Screen from './src/screens/movements/Movements07Screen';
import Movements08Screen from './src/screens/movements/Movements08Screen';

// ── Beneficiaries imports ──────────────────────────────────
import { BeneficiariesState, BeneficiaryItem } from './src/types/beneficiaries';
import { DEMO_BENEFICIARY_TO_DELETE } from './src/data/demoBeneficiaries';

import Beneficiaries01Screen from './src/screens/beneficiaries/Beneficiaries01Screen';
import Beneficiaries02Screen from './src/screens/beneficiaries/Beneficiaries02Screen';
import Beneficiaries03Screen from './src/screens/beneficiaries/Beneficiaries03Screen';
import Beneficiaries04Screen from './src/screens/beneficiaries/Beneficiaries04Screen';
import Beneficiaries05Screen from './src/screens/beneficiaries/Beneficiaries05Screen';
import Beneficiaries06Screen from './src/screens/beneficiaries/Beneficiaries06Screen';
import Beneficiaries07Screen from './src/screens/beneficiaries/Beneficiaries07Screen';
import Beneficiaries08Screen from './src/screens/beneficiaries/Beneficiaries08Screen';
import Beneficiaries09Screen from './src/screens/beneficiaries/Beneficiaries09Screen';
import Beneficiaries10Screen from './src/screens/beneficiaries/Beneficiaries10Screen';
import Beneficiaries11Screen from './src/screens/beneficiaries/Beneficiaries11Screen';
import Beneficiaries12Screen from './src/screens/beneficiaries/Beneficiaries12Screen';
import Beneficiaries13Screen from './src/screens/beneficiaries/Beneficiaries13Screen';
import Beneficiaries14Screen from './src/screens/beneficiaries/Beneficiaries14Screen';

// ── Categories imports ─────────────────────────────────────
import { CategoriesState, CategoryItem } from './src/types/categories';
import {
  DEMO_CATEGORY_TO_EDIT,
  DEMO_EXPENSE_CATEGORIES,
  DEMO_INCOME_CATEGORIES,
} from './src/data/demoCategories';

import Categories01Screen from './src/screens/categories/Categories01Screen';
import Categories02Screen from './src/screens/categories/Categories02Screen';
import Categories03Screen from './src/screens/categories/Categories03Screen';
import Categories04Screen from './src/screens/categories/Categories04Screen';
import Categories05Screen from './src/screens/categories/Categories05Screen';
import Categories06Screen from './src/screens/categories/Categories06Screen';
import Categories07Screen from './src/screens/categories/Categories07Screen';
import Categories08Screen from './src/screens/categories/Categories08Screen';

// ── Transfers imports ──────────────────────────────────────
import {
  TransfersState,
  TransferDraft,
  TransferItem,
  TransferRecipient,
} from './src/types/transfers';
import {
  DEMO_TRANSFER_BALANCE_AFTER_CENTS,
  DEMO_TRANSFER_DETAIL,
  DEMO_TRANSFER_DRAFT,
} from './src/data/demoTransfers';

import Transfers01Screen from './src/screens/transfers/Transfers01Screen';
import Transfers02Screen from './src/screens/transfers/Transfers02Screen';
import Transfers03Screen from './src/screens/transfers/Transfers03Screen';
import Transfers04Screen from './src/screens/transfers/Transfers04Screen';
import Transfers05Screen from './src/screens/transfers/Transfers05Screen';
import Transfers06Screen from './src/screens/transfers/Transfers06Screen';
import Transfers07Screen from './src/screens/transfers/Transfers07Screen';
import Transfers08Screen from './src/screens/transfers/Transfers08Screen';
import Transfers09Screen from './src/screens/transfers/Transfers09Screen';
import Transfers10Screen from './src/screens/transfers/Transfers10Screen';
import Transfers11Screen from './src/screens/transfers/Transfers11Screen';
import Transfers12Screen from './src/screens/transfers/Transfers12Screen';
import Transfers13Screen from './src/screens/transfers/Transfers13Screen';
import Transfers14Screen from './src/screens/transfers/Transfers14Screen';
import Transfers15Screen from './src/screens/transfers/Transfers15Screen';
import Transfers16Screen from './src/screens/transfers/Transfers16Screen';
import Transfers17Screen from './src/screens/transfers/Transfers17Screen';
import Transfers18Screen from './src/screens/transfers/Transfers18Screen';
import Transfers19Screen from './src/screens/transfers/Transfers19Screen';
import Transfers20Screen from './src/screens/transfers/Transfers20Screen';
import Transfers21Screen from './src/screens/transfers/Transfers21Screen';
import Transfers22Screen from './src/screens/transfers/Transfers22Screen';

// ── Recharges imports ──────────────────────────────────────
import { RechargesState, RechargeDraft, RechargeResult } from './src/types/recharges';
import { DEMO_RECHARGE_DRAFT } from './src/data/demoRecharges';

import Recharges01Screen from './src/screens/recharges/Recharges01Screen';
import Recharges02Screen from './src/screens/recharges/Recharges02Screen';
import Recharges03Screen from './src/screens/recharges/Recharges03Screen';
import Recharges04Screen from './src/screens/recharges/Recharges04Screen';
import Recharges05Screen from './src/screens/recharges/Recharges05Screen';
import Recharges06Screen from './src/screens/recharges/Recharges06Screen';
import Recharges07Screen from './src/screens/recharges/Recharges07Screen';
import Recharges08Screen from './src/screens/recharges/Recharges08Screen';
import Recharges09Screen from './src/screens/recharges/Recharges09Screen';
import Recharges10Screen from './src/screens/recharges/Recharges10Screen';

// ── Cash imports ───────────────────────────────────────────
import { CashDirection, CashResult, CashState } from './src/types/cash';
import { formatCashAmount } from './src/data/demoCash';
import type { CashFormSubmit } from './src/screens/cash/Cash02Screen';

import Cash01Screen from './src/screens/cash/Cash01Screen';
import Cash02Screen from './src/screens/cash/Cash02Screen';
import Cash03Screen from './src/screens/cash/Cash03Screen';
import Cash04Screen from './src/screens/cash/Cash04Screen';
import Cash05Screen from './src/screens/cash/Cash05Screen';
import Cash06Screen from './src/screens/cash/Cash06Screen';
import Cash07Screen from './src/screens/cash/Cash07Screen';
import Cash08Screen from './src/screens/cash/Cash08Screen';
import Cash09Screen from './src/screens/cash/Cash09Screen';
import Cash10Screen from './src/screens/cash/Cash10Screen';
import Cash11Screen from './src/screens/cash/Cash11Screen';
import Cash12Screen from './src/screens/cash/Cash12Screen';

// ── Budgets imports ────────────────────────────────────────
import { BudgetItem, BudgetsState } from './src/types/budgets';
import { formatBudgetAmount } from './src/data/demoBudgets';
import type { BudgetFormSubmit } from './src/screens/budgets/Budgets04Screen';
import type { BudgetUpdateSubmit } from './src/screens/budgets/Budgets05Screen';

import Budgets01Screen from './src/screens/budgets/Budgets01Screen';
import Budgets02Screen from './src/screens/budgets/Budgets02Screen';
import Budgets03Screen from './src/screens/budgets/Budgets03Screen';
import Budgets04Screen from './src/screens/budgets/Budgets04Screen';
import Budgets05Screen from './src/screens/budgets/Budgets05Screen';
import Budgets06Screen from './src/screens/budgets/Budgets06Screen';
import Budgets07Screen from './src/screens/budgets/Budgets07Screen';
import Budgets08Screen from './src/screens/budgets/Budgets08Screen';
import Budgets09Screen from './src/screens/budgets/Budgets09Screen';
import Budgets10Screen from './src/screens/budgets/Budgets10Screen';
import Budgets11Screen from './src/screens/budgets/Budgets11Screen';
import Budgets12Screen from './src/screens/budgets/Budgets12Screen';
import Budgets13Screen from './src/screens/budgets/Budgets13Screen';

// ── Goals imports ──────────────────────────────────────────
import { GoalItem, GoalsState } from './src/types/goals';
import { formatGoalAmount } from './src/data/demoGoals';
import type { GoalFormSubmit } from './src/screens/goals/Goals05Screen';

import Goals01Screen from './src/screens/goals/Goals01Screen';
import Goals02Screen from './src/screens/goals/Goals02Screen';
import Goals03Screen from './src/screens/goals/Goals03Screen';
import Goals04Screen from './src/screens/goals/Goals04Screen';
import Goals05Screen from './src/screens/goals/Goals05Screen';
import Goals06Screen from './src/screens/goals/Goals06Screen';
import Goals07Screen from './src/screens/goals/Goals07Screen';
import Goals08Screen from './src/screens/goals/Goals08Screen';
import Goals09Screen from './src/screens/goals/Goals09Screen';
import Goals10Screen from './src/screens/goals/Goals10Screen';
import Goals11Screen from './src/screens/goals/Goals11Screen';
import Goals12Screen from './src/screens/goals/Goals12Screen';
import Goals13Screen from './src/screens/goals/Goals13Screen';

// ── Analytics imports ──────────────────────────────────────
import { AnalyticsState, AnalyticsTab } from './src/types/analytics';

import Analytics01Screen from './src/screens/analytics/Analytics01Screen';
import Analytics02Screen from './src/screens/analytics/Analytics02Screen';
import Analytics03Screen from './src/screens/analytics/Analytics03Screen';
import Analytics04Screen from './src/screens/analytics/Analytics04Screen';
import Analytics05Screen from './src/screens/analytics/Analytics05Screen';
import Analytics06Screen from './src/screens/analytics/Analytics06Screen';
import Analytics07Screen from './src/screens/analytics/Analytics07Screen';
import Analytics08Screen from './src/screens/analytics/Analytics08Screen';
import Analytics09Screen from './src/screens/analytics/Analytics09Screen';
import Analytics10Screen from './src/screens/analytics/Analytics10Screen';

// ── Stitch Modulo 1 (35 pantallas, modo DEMO aislado) ─────
import Module1ScreenRenderer from './src/components/common/Module1ScreenRenderer';
import { Module1ScreenKey } from './src/types/module1';

// ── Dev preview bar (multi-module) ─────────────────────────
import DevStateBarMulti from './src/components/common/DevStateBarMulti';

// ── App state union ────────────────────────────────────────
type AppState =
  | MovementsState
  | BeneficiariesState
  | CategoriesState
  | TransfersState
  | RechargesState
  | CashState
  | BudgetsState
  | GoalsState
  | AnalyticsState
  | Module1ScreenKey;

// ── Aislamiento del modo DEMO ──────────────────────────────
// `appConfig.demoModeEnabled` solo puede ser true en builds de desarrollo.
const demoEnabled = appConfig.demoModeEnabled;

/**
 * Pantallas de éxito que hoy se alcanzan sin respuesta del backend.
 * Solo se muestran en modo DEMO y siempre acompañadas de `SimulationBanner`.
 */
const SIMULATED_SUCCESS_STATES: ReadonlySet<AppState> = new Set<AppState>([
  'Transfers_04',
  'Recharges_02',
  'Cash_04',
  'Cash_05',
  'Budgets_09',
  'Goals_04',
  'Beneficiaries_05',
  'Categories_05',
]);

type SessionGateState = 'loading' | 'ready' | SessionGateReason;

/**
 * Guardia de actor: descarta respuestas que llegan después de un cambio de
 * sesión. Evita aplicar una operación al usuario equivocado.
 */
function actorGuard(): () => boolean {
  const actor = sessionManager.getSnapshot().user?.uid ?? null;
  return () => {
    const snapshot = sessionManager.getSnapshot();
    return (
      snapshot.status === 'authenticated' &&
      (snapshot.user?.uid ?? null) === actor
    );
  };
}

/**
 * Fuera de DEMO la app exige una sesión válida antes de renderizar cualquier
 * módulo. No existe todavía pantalla de login (BLOQUEADA por diseño), así que
 * el gate solo informa y permite reintentar la validación.
 */
function MainApp() {
  const [currentState, setCurrentState] = useState<AppState>(
    demoEnabled ? 'Access_01' : 'Movements_01',
  );
  const [selectedMovement, setSelectedMovement] = useState<MovementItem>(
    DEMO_MOVEMENTS[1],
  );
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem>(
    DEMO_CATEGORY_TO_EDIT,
  );
  const [transferDraft, setTransferDraft] =
    useState<TransferDraft>(DEMO_TRANSFER_DRAFT);
  const [selectedTransfer, setSelectedTransfer] =
    useState<TransferItem>(DEMO_TRANSFER_DETAIL);
  const [rechargeDraft, setRechargeDraft] =
    useState<RechargeDraft>(DEMO_RECHARGE_DRAFT);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryDeleting, setCategoryDeleting] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<{
    readonly name: string;
    readonly type: CategoryItem['type'];
  }>({ name: '', type: 'gasto' });
  const [categoryFormError, setCategoryFormError] = useState<string | null>(
    null,
  );

  // ── Fase 8: borradores y selección de escrituras ───────────
  const [beneficiaryDraft, setBeneficiaryDraft] = useState({
    code: '',
    alias: '',
  });
  const [beneficiarySubmitting, setBeneficiarySubmitting] = useState(false);
  const [beneficiaryDeleting, setBeneficiaryDeleting] = useState(false);
  const [createdBeneficiary, setCreatedBeneficiary] =
    useState<BeneficiaryItem | null>(null);
  const [selectedBeneficiary, setSelectedBeneficiary] =
    useState<BeneficiaryItem | null>(null);
  const [deletedBeneficiary, setDeletedBeneficiary] =
    useState<BeneficiaryItem | null>(null);

  const [cashDraft, setCashDraft] = useState<{
    readonly direction: CashDirection;
    readonly input: CashFormSubmit;
  } | null>(null);
  const [cashSubmitting, setCashSubmitting] = useState(false);
  const [cashResult, setCashResult] = useState<CashResult | null>(null);
  const [cashRejected, setCashRejected] = useState<{
    readonly attemptedCents: number;
    readonly categoryName: string;
    readonly errorReference: string | null;
  } | null>(null);

  const [budgetDraft, setBudgetDraft] = useState<{
    readonly mode: 'create' | 'update';
    readonly categoryId: string;
    readonly categoryName: string;
    readonly period: string;
    readonly limitCents: number;
  } | null>(null);
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetItem | null>(
    null,
  );
  const [createdBudget, setCreatedBudget] = useState<BudgetItem | null>(null);
  const [budgetConflictName, setBudgetConflictName] = useState<string | null>(
    null,
  );
  const [budgetErrorReference, setBudgetErrorReference] = useState<
    string | null
  >(null);

  const [goalDraft, setGoalDraft] = useState<{
    readonly mode: 'create' | 'update';
    readonly name: string;
    readonly targetCents: number;
    readonly targetDate: string;
  } | null>(null);
  const [goalSubmitting, setGoalSubmitting] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalItem | null>(null);
  const [createdGoal, setCreatedGoal] = useState<GoalItem | null>(null);
  const [updatedGoal, setUpdatedGoal] = useState<GoalItem | null>(null);
  const [goalInvalid, setGoalInvalid] = useState<{
    readonly name: string;
    readonly targetCents: number;
    readonly targetDate: string;
  } | null>(null);
  const [goalErrorReference, setGoalErrorReference] = useState<string | null>(
    null,
  );

  // ── Gate de sesión (bypass explícito en DEMO) ──────────────
  const sessionGateRequired = !demoEnabled;
  const [sessionGate, setSessionGate] = useState<SessionGateState>(() => {
    if (!sessionGateRequired) return 'ready';
    return appConfig.apiConfigured ? 'loading' : 'configuration';
  });

  // ── Servicios reales (deshabilitados por completo en DEMO) ─
  const services = useMemo(
    () => (apiClient ? createApiServices(apiClient) : null),
    [],
  );
  const realReady = !demoEnabled && sessionGate === 'ready' && services !== null;

  const balance = useWalletBalance(services, realReady);
  const ownClientId = balance.data?.clientId ?? null;
  const movements = useMovements(services, realReady);
  const transfers = useTransfers(services, realReady, ownClientId);
  const recharges = useRecharges(services, realReady);
  const receipt = useTransferReceipt(
    services,
    realReady && currentState === 'Transfers_22',
    currentState === 'Transfers_22' ? selectedTransfer.id : null,
  );

  const beneficiaries = useBeneficiaries(services, realReady);
  const beneficiariesStatus = beneficiaries.status;
  const beneficiariesCount = beneficiaries.data?.length ?? 0;
  const beneficiariesError = beneficiaries.error;
  const categories = useCategories(services, realReady);
  const cashRegister = useCashRegister(services, realReady);
  const budgets = useBudgets(services, realReady);
  const goals = useGoals(services, realReady);
  const analytics = useAnalytics(services, realReady);

  const reloadBalance = balance.reload;
  const reloadMovements = movements.reload;
  const reloadTransfers = transfers.reload;
  const reloadRecharges = recharges.reload;

  // Valores primitivos para que los efectos no dependan de objetos recreados.
  const movementsStatus = movements.status;
  const movementsCount = movements.items.length;
  const movementsErrorKind = movements.error?.kind ?? null;
  const transfersStatus = transfers.status;
  const transfersCount = transfers.data?.length ?? 0;
  const transfersErrorKind = transfers.error?.kind ?? null;
  const balanceStatus = balance.status;
  const rechargesStatus = recharges.status;
  const rechargesCount = recharges.data?.length ?? 0;
  const rechargesErrorKind = recharges.error?.kind ?? null;
  const receiptFailure = receipt.error
    ? classifyOperationFailure(receipt.error)
    : null;

  const categoriesStatus = categories.status;
  const categoriesCount = categories.data?.length ?? 0;
  const categoriesError = categories.error;
  const cashStatus = cashRegister.status;
  const cashError = cashRegister.error;
  const budgetsStatus = budgets.status;
  const budgetsCount = budgets.data?.length ?? 0;
  const budgetsError = budgets.error;
  const goalsStatus = goals.status;
  const goalsError = goals.error;
  const analyticsStatus = analytics.status;
  const analyticsError = analytics.error;

  /** Periodo del mes en curso, usado si el backend no devuelve presupuestos. */
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Una intención = una clave. El guardia impide doble envío.
  const transferOperation = useMemo(
    () => new FinancialOperation({ scope: 'transfers.create' }),
    [],
  );
  const rechargeOperation = useMemo(
    () => new FinancialOperation({ scope: 'recharges.create' }),
    [],
  );
  // Escrituras de la Fase 8. Cada intención tiene su propia instancia: una
  // clave por intención y bloqueo de doble envío local.
  const beneficiaryOperation = useMemo(
    () => new FinancialOperation({ scope: 'beneficiaries.create' }),
    [],
  );
  const beneficiaryDeleteOperation = useMemo(
    () => new FinancialOperation({ scope: 'beneficiaries.remove' }),
    [],
  );
  const cashOperation = useMemo(
    () => new FinancialOperation({ scope: 'cash.create' }),
    [],
  );
  const budgetCreateOperation = useMemo(
    () => new FinancialOperation({ scope: 'budgets.create' }),
    [],
  );
  const budgetUpdateOperation = useMemo(
    () => new FinancialOperation({ scope: 'budgets.update' }),
    [],
  );
  const goalCreateOperation = useMemo(
    () => new FinancialOperation({ scope: 'goals.create' }),
    [],
  );
  const goalUpdateOperation = useMemo(
    () => new FinancialOperation({ scope: 'goals.update' }),
    [],
  );
  const transferAttempt = useRef<string | null>(null);

  const [transferUncertain, setTransferUncertain] = useState(false);
  const [rechargeSubmitting, setRechargeSubmitting] = useState(false);
  const [rechargeResult, setRechargeResult] = useState<RechargeResult | null>(
    null,
  );

  // Última pantalla visible: permite descartar respuestas que llegan después
  // de que el usuario abandonó el formulario que inició la operación.
  const currentStateRef = useRef(currentState);
  currentStateRef.current = currentState;

  useEffect(() => {
    if (!sessionGateRequired || !appConfig.apiConfigured) return;

    let active = true;
    const unsubscribe = sessionManager.subscribe((snapshot) => {
      if (!active) return;
      switch (snapshot.status) {
        case 'authenticated':
          setSessionGate('ready');
          break;
        case 'anonymous':
          setSessionGate('signed-out');
          break;
        case 'unavailable':
          setSessionGate(
            snapshot.errorCode === 'configuration' ? 'configuration' : 'unavailable',
          );
          break;
        default:
          setSessionGate('loading');
      }
    });

    void sessionManager.restore();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [sessionGateRequired]);

  const handleRetrySession = useCallback(() => {
    setSessionGate('loading');
    void sessionManager.restore();
  }, []);

  const handleTransferRecipient = (recipient: TransferRecipient) => {
    setTransferDraft((current) => ({ ...current, recipient }));
  };

  /**
   * Navega a una pantalla de éxito SOLO con el modo DEMO activo.
   * Fuera de DEMO no se fabrica ningún comprobante ni se simula un error de
   * servidor: se informa que la función aún no está conectada al backend.
   */
  const openSimulatedSuccess = (target: AppState) => {
    if (demoEnabled) {
      setCurrentState(target);
      return;
    }
    Alert.alert(
      'Función no disponible',
      'Esta operación todavía no está conectada al servidor. No se guardó ningún cambio.',
    );
  };

  const handleTransferSimulatedSuccess = () => {
    if (!demoEnabled) {
      setCurrentState('Transfers_14');
      return;
    }
    setSelectedTransfer({
      id: 'sim-trf-preview',
      reference: 'SIM-TRF-0001',
      direction: 'sent',
      counterpartyName: transferDraft.recipient.name,
      counterpartyCode: transferDraft.recipient.code,
      amountCents: transferDraft.amountCents,
      occurredAtLabel: 'Ahora · SIMULACIÓN',
      message: transferDraft.message,
      statusLabel: 'Simulada · no ejecutada',
      balanceAfterCents: DEMO_TRANSFER_BALANCE_AFTER_CENTS,
    });
    setCurrentState('Transfers_04');
  };

  const handleSelectMovement = (item: MovementItem) => {
    setSelectedMovement(item);
    setCurrentState('Movements_05');
  };

  // ── Movimientos: skeleton / vacío / error según la API ─────
  useEffect(() => {
    if (demoEnabled || !realReady) return;
    if (currentState !== 'Movements_01' && currentState !== 'Movements_03') {
      return;
    }
    if (movementsStatus === 'loading' || movementsStatus === 'idle') {
      if (currentState !== 'Movements_03') setCurrentState('Movements_03');
      return;
    }
    if (movementsStatus === 'error') {
      setCurrentState(
        movementsErrorKind === 'unauthorized' ? 'Movements_07' : 'Movements_08',
      );
      return;
    }
    if (movementsStatus === 'success') {
      setCurrentState(
        movementsCount === 0 ? 'Movements_02' : 'Movements_01',
      );
    }
  }, [
    currentState,
    demoEnabled,
    movementsCount,
    movementsErrorKind,
    movementsStatus,
    realReady,
  ]);

  // ── Beneficiarios: skeleton / vacío / error del listado ────
  useEffect(() => {
    if (demoEnabled || !realReady) return;
    if (
      currentState !== 'Beneficiaries_01' &&
      currentState !== 'Beneficiaries_02' &&
      currentState !== 'Beneficiaries_03' &&
      currentState !== 'Beneficiaries_13'
    ) {
      return;
    }
    if (
      beneficiariesStatus === 'loading' ||
      beneficiariesStatus === 'idle'
    ) {
      if (currentState !== 'Beneficiaries_03') {
        setCurrentState('Beneficiaries_03');
      }
      return;
    }
    if (beneficiariesStatus === 'error') {
      setCurrentState(
        beneficiariesError?.kind === 'unauthorized'
          ? 'Beneficiaries_11'
          : 'Beneficiaries_13',
      );
      return;
    }
    if (beneficiariesStatus === 'success') {
      setCurrentState(
        beneficiariesCount === 0 ? 'Beneficiaries_02' : 'Beneficiaries_01',
      );
    }
  }, [
    beneficiariesCount,
    beneficiariesError,
    beneficiariesStatus,
    currentState,
    demoEnabled,
    realReady,
  ]);

  // ── Transferencias: skeleton / vacío / error del historial ─
  useEffect(() => {
    if (demoEnabled || !realReady) return;
    if (currentState !== 'Transfers_15' && currentState !== 'Transfers_17') {
      return;
    }
    if (!ownClientId && balanceStatus === 'error') {
      setCurrentState('Transfers_18');
      return;
    }
    if (transfersStatus === 'loading' || transfersStatus === 'idle') {
      if (currentState !== 'Transfers_17') setCurrentState('Transfers_17');
      return;
    }
    if (transfersStatus === 'error') {
      setCurrentState(
        transfersErrorKind === 'unauthorized' ? 'Transfers_06' : 'Transfers_18',
      );
      return;
    }
    if (transfersStatus === 'success') {
      setCurrentState(transfersCount === 0 ? 'Transfers_16' : 'Transfers_15');
    }
  }, [
    balanceStatus,
    currentState,
    demoEnabled,
    ownClientId,
    realReady,
    transfersCount,
    transfersErrorKind,
    transfersStatus,
  ]);

  // ── Recargas: vacío / error del historial ──────────────────
  useEffect(() => {
    if (demoEnabled || !realReady) return;
    if (currentState !== 'Recharges_08') return;
    if (rechargesStatus === 'error') {
      setCurrentState(
        rechargesErrorKind === 'unauthorized' ? 'Recharges_04' : 'Recharges_07',
      );
      return;
    }
    if (rechargesStatus === 'success' && rechargesCount === 0) {
      setCurrentState('Recharges_09');
    }
  }, [
    currentState,
    demoEnabled,
    realReady,
    rechargesCount,
    rechargesErrorKind,
    rechargesStatus,
  ]);

  // ── Categorías / Efectivo / Presupuestos / Metas / Analítica ──
  // Los estados con diseño propio navegan a su pantalla; los módulos sin
  // estados diseñados (Categorías, Efectivo) muestran el estado reutilizable
  // dentro de la pantalla principal.
  useEffect(() => {
    if (demoEnabled || !realReady) return;
    if (currentState !== 'Categories_01') return;

    if (categoriesStatus === 'success' && categoriesCount === 0) {
      setCurrentState('Categories_02');
    }
  }, [
    categoriesCount,
    categoriesStatus,
    currentState,
    demoEnabled,
    realReady,
  ]);

  useEffect(() => {
    if (demoEnabled || !realReady) return;
    if (
      currentState !== 'Cash_01' &&
      currentState !== 'Budgets_01' &&
      currentState !== 'Budgets_03'
    ) {
      return;
    }

    if (currentState === 'Cash_01') {
      if (cashError?.kind === 'unauthorized') setCurrentState('Cash_08');
      return;
    }

    if (budgetsStatus === 'loading' || budgetsStatus === 'idle') {
      if (currentState !== 'Budgets_03') setCurrentState('Budgets_03');
      return;
    }
    if (budgetsStatus === 'error') {
      if (budgetsError?.kind === 'unauthorized') {
        setCurrentState('Budgets_13');
      } else if (currentState !== 'Budgets_03') {
        setCurrentState('Budgets_03');
      }
      return;
    }
    if (budgetsStatus === 'success') {
      setCurrentState(budgetsCount === 0 ? 'Budgets_02' : 'Budgets_01');
    }
  }, [
    budgetsCount,
    budgetsError,
    budgetsStatus,
    cashError,
    currentState,
    demoEnabled,
    realReady,
  ]);

  useEffect(() => {
    if (demoEnabled || !realReady) return;
    if (currentState !== 'Goals_01' || goalsStatus !== 'error') return;
    setCurrentState(goalsError?.kind === 'unauthorized' ? 'Goals_02' : 'Goals_03');
  }, [
    currentState,
    demoEnabled,
    goalsError,
    goalsStatus,
    realReady,
  ]);

  useEffect(() => {
    if (demoEnabled || !realReady) return;
    if (analyticsStatus !== 'error') return;

    const errorState: {
      readonly unauthorized?: AppState;
      readonly other?: AppState;
    } =
      currentState === 'Analytics_01'
        ? { unauthorized: 'Analytics_03', other: 'Analytics_04' }
        : currentState === 'Analytics_05'
          ? { unauthorized: 'Analytics_06', other: 'Analytics_07' }
          : currentState === 'Analytics_08'
            ? { unauthorized: 'Analytics_09', other: 'Analytics_10' }
            : {};

    if (analyticsError?.kind === 'unauthorized' && errorState.unauthorized) {
      setCurrentState(errorState.unauthorized);
    } else if (errorState.other) {
      setCurrentState(errorState.other);
    }
  }, [
    analyticsError,
    analyticsStatus,
    currentState,
    demoEnabled,
    realReady,
  ]);

  // ── Envío real de transferencia (una sola vez por intención) ─
  useEffect(() => {
    if (demoEnabled || !realReady || !services) return;
    if (currentState !== 'Transfers_03') return;
    if (transferAttempt.current !== null) return;

    const fingerprint = `${transferDraft.recipient.code}|${transferDraft.amountCents}|${transferDraft.message}`;
    transferAttempt.current = fingerprint;
    let active = true;
    const actor = sessionManager.getSnapshot().user?.uid ?? null;
    const isSameActor = () => {
      const snapshot = sessionManager.getSnapshot();
      return (
        snapshot.status === 'authenticated' &&
        (snapshot.user?.uid ?? null) === actor
      );
    };

    void (async () => {
      const outcome = await transferOperation.run(
        fingerprint,
        (idempotencyKey) =>
          services.transfers.create(
            {
              destinationTransferCode: transferDraft.recipient.code,
              amountCents: transferDraft.amountCents,
              description: transferDraft.message,
            },
            { idempotencyKey },
          ),
      );
      transferAttempt.current = null;

      // Respuesta tardía tras abandonar la pantalla o cambiar de actor: se
      // descarta y no se navega. La operación pudo aplicarse, así que un
      // reintento posterior conserva la misma Idempotency-Key.
      if (!active || !isSameActor()) return;

      if (outcome.status === 'confirmed' && outcome.value) {
        const dto = outcome.value;
        try {
          setSelectedTransfer(
            mapTransfer(dto, { ownClientId: dto.originClientId }),
          );
        } catch {
          setCurrentState('Transfers_13');
          return;
        }
        setTransferUncertain(false);
        reloadBalance();
        reloadMovements();
        reloadTransfers();
        setCurrentState('Transfers_04');
        return;
      }

      if (outcome.status === 'blocked') return;
      if (outcome.status === 'cancelled') {
        setCurrentState('Transfers_01');
        return;
      }

      const failure = classifyOperationFailure(outcome.error);
      switch (failure) {
        case 'session':
          setCurrentState('Transfers_06');
          break;
        case 'not_found':
          setCurrentState('Transfers_07');
          break;
        case 'conflict':
          setCurrentState('Transfers_08');
          break;
        case 'insufficient_funds':
          setCurrentState('Transfers_09');
          reloadBalance();
          break;
        case 'limit_exceeded':
          setCurrentState('Transfers_11');
          break;
        case 'rate_limited':
          setCurrentState('Transfers_12');
          break;
        case 'validation':
          setCurrentState('Transfers_05');
          break;
        case 'unavailable':
          setCurrentState('Transfers_14');
          break;
        case 'uncertain':
          // Resultado desconocido: refrescar para verificar antes de reintentar.
          setTransferUncertain(true);
          reloadBalance();
          reloadMovements();
          reloadTransfers();
          setCurrentState('Transfers_13');
          break;
        default:
          setTransferUncertain(false);
          setCurrentState('Transfers_13');
      }
    })();

    return () => {
      active = false;
    };
  }, [
    currentState,
    demoEnabled,
    realReady,
    reloadBalance,
    reloadMovements,
    reloadTransfers,
    services,
    transferDraft,
    transferOperation,
  ]);

  // ── Recarga real (idempotente, sin doble envío) ────────────
  const handleRecharge = async () => {
    if (demoEnabled) {
      setRechargeResult(null);
      openSimulatedSuccess('Recharges_02');
      return;
    }
    if (!services || !realReady) {
      if (sessionGate !== 'ready') return;
      Alert.alert(
        'Servicio no disponible',
        'No hay conexión con el servidor. No se realizó ninguna recarga.',
      );
      return;
    }
    if (rechargeSubmitting) return;

    setRechargeSubmitting(true);
    const actor = sessionManager.getSnapshot().user?.uid ?? null;
    const isSameActor = () => {
      const snapshot = sessionManager.getSnapshot();
      return (
        snapshot.status === 'authenticated' &&
        (snapshot.user?.uid ?? null) === actor
      );
    };
    const shouldApplyResponse = () =>
      isSameActor() && currentStateRef.current === 'Recharges_01';

    try {
      const fingerprint = `recharge|${rechargeDraft.amountCents}`;
      const outcome = await rechargeOperation.run(
        fingerprint,
        (idempotencyKey) =>
          services.recharges.create(
            { amountCents: rechargeDraft.amountCents },
            { idempotencyKey },
          ),
      );

      if (!shouldApplyResponse()) return;

      if (outcome.status === 'confirmed' && outcome.value) {
        const dto = outcome.value;
        let confirmedBalance: number | null = null;
        try {
          const wallet = await services.wallet.getBalance();
          confirmedBalance = wallet.availableBalanceCents;
        } catch {
          // Sin saldo confirmado no se inventa uno: la tarjeta lo omite.
          confirmedBalance = null;
        }
        if (!shouldApplyResponse()) return;
        setRechargeResult(mapRechargeResult(dto, confirmedBalance));
        reloadBalance();
        reloadMovements();
        reloadRecharges();
        setCurrentState('Recharges_02');
        return;
      }

      if (outcome.status === 'blocked' || outcome.status === 'cancelled') {
        return;
      }

      // El backend rechaza los métodos simulados fuera de entornos
      // autorizados. No es un fallo de red ni un 500: no se inventa un cobro.
      if (
        (outcome.error?.problem.code ?? '').toUpperCase() ===
        'SIMULATED_METHOD_NOT_ALLOWED'
      ) {
        Alert.alert(
          'Recargas no disponibles',
          'Este entorno no tiene habilitados los métodos de recarga simulada. No se realizó ningún cobro.',
        );
        return;
      }

      const failure = classifyOperationFailure(outcome.error);
      switch (failure) {
        case 'session':
          setCurrentState('Recharges_04');
          break;
        case 'validation':
          setCurrentState('Recharges_03');
          break;
        case 'limit_exceeded':
          setCurrentState('Recharges_05');
          break;
        case 'rate_limited':
          setCurrentState('Recharges_06');
          break;
        case 'uncertain':
          reloadBalance();
          reloadMovements();
          reloadRecharges();
          setCurrentState('Recharges_07');
          break;
        default:
          setCurrentState('Recharges_07');
      }
    } finally {
      setRechargeSubmitting(false);
    }
  };

  const handleCategoryDraft = (
    name: string,
    _color: string,
    type: CategoryItem['type'],
  ) => {
    const safeName = name || 'Mercado';
    setSelectedCategory({
      id: `sim-cat-${Date.now()}`,
      name: safeName,
      type,
      movementsCount: 0,
      formattedAmount: '$ 0',
      initialLetter: safeName.charAt(0).toUpperCase(),
    });
    openSimulatedSuccess('Categories_05');
  };

  /**
   * Crea o actualiza una categoría. El tipo solo se envía al crear: en la
   * edición es inmutable y el backend responde 422 si se intenta cambiar.
   */
  const handleCategorySubmit = async (
    name: string,
    _color: string,
    type: CategoryItem['type'],
  ) => {
    const origin = currentStateRef.current;
    const mode = origin === 'Categories_04' ? 'update' : 'create';

    setCategoryDraft({ name, type });
    setCategoryFormError(null);

    if (demoEnabled) {
      if (mode === 'update') {
        const safeName = name || selectedCategory.name;
        setSelectedCategory({
          ...selectedCategory,
          name: safeName,
          type,
          initialLetter: safeName.charAt(0).toUpperCase(),
        });
        setCurrentState('Categories_01');
        return;
      }
      handleCategoryDraft(name, _color, type);
      return;
    }

    if (!services || !realReady) {
      if (sessionGate !== 'ready') return;
      Alert.alert(
        'Servicio no disponible',
        'No hay conexión con el servidor. No se guardó la categoría.',
      );
      return;
    }
    if (categorySubmitting) return;

    setCategorySubmitting(true);
    const actor = sessionManager.getSnapshot().user?.uid ?? null;
    const isSameActor = () => {
      const snapshot = sessionManager.getSnapshot();
      return (
        snapshot.status === 'authenticated' &&
        (snapshot.user?.uid ?? null) === actor
      );
    };
    const shouldApplyResponse = () =>
      isSameActor() && currentStateRef.current === origin;

    try {
      const dto =
        mode === 'update'
          ? await services.categories.update(selectedCategory.id, { name })
          : await services.categories.create({ name, type });
      const mapped = mapCategory(dto);
      categories.reload();

      if (!shouldApplyResponse()) return;

      setSelectedCategory(mapped);
      setCurrentState(mode === 'update' ? 'Categories_01' : 'Categories_05');
    } catch (error) {
      if (!shouldApplyResponse()) return;

      const failure = classifyOperationFailure(error);
      const route = routeCategoryFailure(failure, mode);
      const message = asApiError(error).toUserMessage();

      switch (route) {
        case 'conflict':
          setCurrentState('Categories_06');
          break;
        case 'validation':
          setCategoryFormError(message.message);
          setCurrentState('Categories_07');
          break;
        case 'session':
          // `apiClient.onUnauthorized` invalida la sesión y muestra el gate.
          break;
        case 'reload':
          Alert.alert(message.title, message.message);
          categories.reload();
          setCurrentState('Categories_01');
          break;
        default:
          Alert.alert(message.title, message.message);
      }
    } finally {
      setCategorySubmitting(false);
    }
  };

  /** Desactiva la categoría (soft delete). El historial no se modifica. */
  const handleCategoryDelete = async () => {
    if (demoEnabled) {
      setCurrentState('Categories_01');
      return;
    }
    if (!services || !realReady) {
      if (sessionGate !== 'ready') return;
      Alert.alert(
        'Servicio no disponible',
        'No hay conexión con el servidor. No se eliminó la categoría.',
      );
      return;
    }
    if (categoryDeleting) return;

    setCategoryDeleting(true);
    const origin = currentStateRef.current;
    const actor = sessionManager.getSnapshot().user?.uid ?? null;
    const isSameActor = () => {
      const snapshot = sessionManager.getSnapshot();
      return (
        snapshot.status === 'authenticated' &&
        (snapshot.user?.uid ?? null) === actor
      );
    };
    const shouldApplyResponse = () =>
      isSameActor() && currentStateRef.current === origin;

    try {
      await services.categories.deactivate(selectedCategory.id);
      categories.reload();
      if (!shouldApplyResponse()) return;
      setCurrentState('Categories_01');
    } catch (error) {
      if (!shouldApplyResponse()) return;

      const failure = classifyOperationFailure(error);
      const route = routeCategoryFailure(failure, 'delete');
      const message = asApiError(error).toUserMessage();

      if (route === 'reload') {
        Alert.alert(message.title, message.message);
        categories.reload();
        setCurrentState('Categories_01');
      } else if (route !== 'session') {
        Alert.alert(message.title, message.message);
      }
    } finally {
      setCategoryDeleting(false);
    }
  };

  // ── Fase 8: escrituras de beneficiarios ────────────────────
  const startTransferToBeneficiary = (beneficiary: BeneficiaryItem) => {
    setTransferDraft((current) => ({
      ...current,
      recipient: {
        id: beneficiary.id,
        name: beneficiary.name,
        code: beneficiary.code,
        initialLetter: beneficiary.initialLetter,
      },
    }));
    setCurrentState('Transfers_01');
  };

  const handleCreateBeneficiary = async (code: string, alias: string) => {
    const safeCode = code.trim().toUpperCase();
    const safeName = alias.trim() || safeCode;
    setBeneficiaryDraft({ code, alias });

    if (demoEnabled) {
      openSimulatedSuccess('Beneficiaries_05');
      return;
    }
    if (!services || !realReady) {
      if (sessionGate !== 'ready') return;
      Alert.alert(
        'Servicio no disponible',
        'No hay conexión con el servidor. No se agregó el beneficiario.',
      );
      return;
    }
    if (beneficiarySubmitting) return;

    const origin = currentStateRef.current;
    const isSameActor = actorGuard();
    const shouldApply = () =>
      isSameActor() && currentStateRef.current === origin;

    setBeneficiarySubmitting(true);
    try {
      const outcome = await beneficiaryOperation.run(
        `beneficiaries.create|${safeCode}|${safeName}`,
        () =>
          services.beneficiaries.create({
            name: safeName,
            transferCode: safeCode,
          }),
      );

      if (outcome.status === 'confirmed' && outcome.value) {
        const mapped = mapBeneficiary(outcome.value);
        beneficiaries.reload();
        if (!shouldApply()) return;
        setCreatedBeneficiary(mapped);
        setBeneficiaryDraft({ code: '', alias: '' });
        setCurrentState('Beneficiaries_05');
        return;
      }
      if (outcome.status === 'blocked' || outcome.status === 'cancelled') {
        return;
      }

      const failure = classifyOperationFailure(outcome.error);
      const apiError = asApiError(outcome.error);
      const problemCode = (apiError.problem.code ?? '').toUpperCase();

      if (!shouldApply()) return;

      if (failure === 'session') {
        setCurrentState('Beneficiaries_12');
        return;
      }
      if (failure === 'conflict' || problemCode === 'BENEFICIARY_DUPLICATE') {
        setCurrentState('Beneficiaries_08');
        return;
      }
      if (problemCode === 'BENEFICIARY_SELF') {
        setCurrentState('Beneficiaries_09');
        return;
      }
      if (
        failure === 'not_found' ||
        problemCode === 'BENEFICIARY_CODE_NOT_FOUND'
      ) {
        setCurrentState('Beneficiaries_07');
        return;
      }
      if (failure === 'validation') {
        setCurrentState('Beneficiaries_06');
        return;
      }

      // 403, 5xx o resultado incierto: no se afirma que el beneficiario se
      // agregó. Se conserva el borrador para un nuevo intento consciente.
      const message = apiError.toUserMessage();
      const reference = apiError.requestId
        ? ` Referencia: ${apiError.requestId}.`
        : '';
      Alert.alert(message.title, `${message.message}${reference}`);
    } finally {
      setBeneficiarySubmitting(false);
    }
  };

  const handleDeleteBeneficiary = async () => {
    const target = selectedBeneficiary;
    if (!target) {
      Alert.alert(
        'Beneficiario no seleccionado',
        'Vuelve a la lista y mantén presionado el beneficiario que quieres eliminar.',
      );
      setCurrentState('Beneficiaries_01');
      return;
    }

    if (demoEnabled) {
      setDeletedBeneficiary(target);
      setSelectedBeneficiary(null);
      setCurrentState('Beneficiaries_10');
      return;
    }
    if (!services || !realReady) {
      if (sessionGate !== 'ready') return;
      Alert.alert(
        'Servicio no disponible',
        'No hay conexión con el servidor. No se eliminó el beneficiario.',
      );
      return;
    }
    if (beneficiaryDeleting) return;

    const origin = currentStateRef.current;
    const isSameActor = actorGuard();
    const shouldApply = () =>
      isSameActor() && currentStateRef.current === origin;

    setBeneficiaryDeleting(true);
    try {
      const outcome = await beneficiaryDeleteOperation.run(
        `beneficiaries.remove|${target.id}`,
        () => services.beneficiaries.remove(target.id),
      );

      if (outcome.status === 'confirmed') {
        beneficiaries.reload();
        if (!shouldApply()) return;
        setDeletedBeneficiary(target);
        setSelectedBeneficiary(null);
        setCurrentState('Beneficiaries_10');
        return;
      }
      if (outcome.status === 'blocked' || outcome.status === 'cancelled') {
        return;
      }

      const failure = classifyOperationFailure(outcome.error);
      const apiError = asApiError(outcome.error);
      if (!shouldApply()) return;

      if (failure === 'session') {
        setCurrentState('Beneficiaries_11');
        return;
      }
      if (failure === 'not_found') {
        beneficiaries.reload();
        Alert.alert(
          'Beneficiario no encontrado',
          'Este beneficiario ya no está en tu lista.',
        );
        setSelectedBeneficiary(null);
        setCurrentState('Beneficiaries_01');
        return;
      }
      const message = apiError.toUserMessage();
      Alert.alert(message.title, message.message);
    } finally {
      setBeneficiaryDeleting(false);
    }
  };

  // ── Fase 8: escrituras de efectivo ─────────────────────────
  const submitCash = async (
    direction: CashDirection,
    input: CashFormSubmit,
  ) => {
    setCashDraft({ direction, input });
    setCashResult(null);
    setCashRejected(null);

    if (demoEnabled) {
      setCurrentState(direction === 'income' ? 'Cash_04' : 'Cash_05');
      return;
    }
    if (!services || !realReady) {
      if (sessionGate !== 'ready') return;
      Alert.alert(
        'Servicio no disponible',
        'No hay conexión con el servidor. No se guardó el registro.',
      );
      return;
    }
    if (cashSubmitting) return;

    const origin = currentStateRef.current;
    const isSameActor = actorGuard();
    const shouldApply = () =>
      isSameActor() && currentStateRef.current === origin;

    // El backend es la fuente de verdad del saldo: se refrescan los listados
    // afectados sin calcular saldos en el cliente.
    const refreshCashViews = () => {
      cashRegister.reload();
      reloadMovements();
      budgets.reload();
      analytics.reload();
    };

    setCashSubmitting(true);
    try {
      const outcome = await cashOperation.run(
        `cash.create|${direction}|${input.amountCents}|${input.categoryId ?? ''}|${input.note}`,
        (idempotencyKey) =>
          services.cash.createMovement(
            {
              direction,
              amountCents: input.amountCents,
              categoryId: input.categoryId,
              note: input.note,
            },
            { idempotencyKey },
          ),
      );

      if (outcome.status === 'confirmed' && outcome.value) {
        const mapped = mapCashResult(outcome.value);
        setCashResult(mapped);
        setCashDraft(null);
        refreshCashViews();
        if (!shouldApply()) return;
        setCurrentState(direction === 'income' ? 'Cash_04' : 'Cash_05');
        return;
      }
      if (outcome.status === 'blocked' || outcome.status === 'cancelled') {
        return;
      }

      const failure = classifyOperationFailure(outcome.error);
      const apiError = asApiError(outcome.error);
      const problemCode = (apiError.problem.code ?? '').toUpperCase();

      if (failure === 'insufficient_funds') {
        cashRegister.reload();
      }
      if (!shouldApply()) return;

      switch (failure) {
        case 'session':
          setCurrentState('Cash_08');
          break;
        case 'insufficient_funds':
          setCashRejected({
            attemptedCents: input.amountCents,
            categoryName: input.categoryName,
            errorReference: apiError.requestId ?? null,
          });
          setCurrentState('Cash_07');
          break;
        case 'not_found':
          if (problemCode === 'CATEGORY_NOT_FOUND') {
            // La categoría ya no sirve: se limpia del borrador para que el
            // usuario elija otra sin reenviar el identificador rechazado.
            setCashDraft({
              direction,
              input: { ...input, categoryId: null },
            });
            setCashRejected({
              attemptedCents: input.amountCents,
              categoryName: input.categoryName,
              errorReference: apiError.requestId ?? null,
            });
            setCurrentState('Cash_09');
          } else {
            setCashRejected({
              attemptedCents: input.amountCents,
              categoryName: input.categoryName,
              errorReference: apiError.requestId ?? null,
            });
            setCurrentState('Cash_11');
          }
          break;
        case 'conflict':
          setCurrentState('Cash_10');
          break;
        case 'validation':
        case 'forbidden': {
          const message = apiError.toUserMessage();
          Alert.alert(message.title, message.message);
          break;
        }
        default:
          setCashRejected({
            attemptedCents: input.amountCents,
            categoryName: input.categoryName,
            errorReference: apiError.requestId ?? null,
          });
          setCurrentState('Cash_11');
      }
    } finally {
      setCashSubmitting(false);
    }
  };

  const handleCashSubmit = (input: CashFormSubmit) => {
    const direction: CashDirection =
      currentStateRef.current === 'Cash_02' ? 'income' : 'expense';
    void submitCash(direction, input);
  };

  const retryCash = () => {
    if (!cashDraft) {
      setCurrentState('Cash_01');
      return;
    }
    void submitCash(cashDraft.direction, cashDraft.input);
  };

  // ── Fase 8: escrituras de presupuestos ─────────────────────
  const submitBudget = async (
    mode: 'create' | 'update',
    draft: {
      readonly categoryId: string;
      readonly categoryName: string;
      readonly period: string;
      readonly limitCents: number;
    },
  ) => {
    setBudgetDraft({ mode, ...draft });
    setBudgetErrorReference(null);

    if (demoEnabled) {
      if (mode === 'create') {
        setCreatedBudget(null);
        setCurrentState('Budgets_09');
      } else {
        setCurrentState('Budgets_01');
      }
      return;
    }
    if (!services || !realReady) {
      if (sessionGate !== 'ready') return;
      Alert.alert(
        'Servicio no disponible',
        'No hay conexión con el servidor. No se guardó el presupuesto.',
      );
      return;
    }
    if (mode === 'update' && !selectedBudget) {
      Alert.alert(
        'Presupuesto no seleccionado',
        'Elige un presupuesto de la lista para editarlo.',
      );
      setCurrentState('Budgets_01');
      return;
    }
    if (budgetSubmitting) return;

    const origin = currentStateRef.current;
    const isSameActor = actorGuard();
    const shouldApply = () =>
      isSameActor() && currentStateRef.current === origin;
    const operation =
      mode === 'create' ? budgetCreateOperation : budgetUpdateOperation;
    const fingerprint =
      mode === 'create'
        ? `budgets.create|${draft.categoryId}|${draft.period}|${draft.limitCents}`
        : `budgets.update|${selectedBudget?.id ?? ''}|${draft.limitCents}`;

    setBudgetSubmitting(true);
    try {
      // El backend de presupuestos no implementa Idempotency-Key: la clave
      // local solo impide el doble envío mientras la solicitud está en curso.
      const outcome = await operation.run(fingerprint, () =>
        mode === 'create'
          ? services.budgets.create({
              categoryId: draft.categoryId,
              period: draft.period,
              limitCents: draft.limitCents,
            })
          : services.budgets.update(selectedBudget?.id ?? '', {
              limitCents: draft.limitCents,
            }),
      );

      if (outcome.status === 'confirmed' && outcome.value) {
        const mapped = mapBudget(outcome.value);
        budgets.reload();
        if (!shouldApply()) return;
        if (mode === 'create') {
          setCreatedBudget(mapped);
          setBudgetDraft(null);
          setCurrentState('Budgets_09');
        } else {
          setSelectedBudget(mapped);
          setBudgetDraft(null);
          setCurrentState('Budgets_01');
        }
        return;
      }
      if (outcome.status === 'blocked' || outcome.status === 'cancelled') {
        return;
      }

      const failure = classifyOperationFailure(outcome.error);
      const apiError = asApiError(outcome.error);
      const problemCode = (apiError.problem.code ?? '').toUpperCase();
      if (!shouldApply()) return;

      if (failure === 'session') {
        setCurrentState('Budgets_13');
        return;
      }
      if (failure === 'conflict') {
        setBudgetConflictName(draft.categoryName);
        setCurrentState('Budgets_10');
        return;
      }
      if (failure === 'not_found') {
        budgets.reload();
        Alert.alert(
          'Presupuesto no encontrado',
          'Este presupuesto ya no está disponible. Actualizamos la lista.',
        );
        setSelectedBudget(null);
        setCurrentState('Budgets_01');
        return;
      }
      if (failure === 'validation') {
        // 422: se conserva el borrador y se pide corregir sin inventar datos.
        const message = apiError.toUserMessage();
        const detail =
          problemCode === 'INVALID_CATEGORY'
            ? 'La categoría no existe o está inactiva. Elige otra.'
            : problemCode === 'BUDGET_SCOPE_IMMUTABLE'
              ? 'La categoría y el periodo no se pueden cambiar.'
              : message.message;
        Alert.alert(message.title, detail);
        return;
      }
      if (failure === 'forbidden') {
        const message = apiError.toUserMessage();
        Alert.alert(message.title, message.message);
        return;
      }

      setBudgetErrorReference(apiError.requestId ?? null);
      setCurrentState('Budgets_12');
    } finally {
      setBudgetSubmitting(false);
    }
  };

  const handleCreateBudget = (input: BudgetFormSubmit) => {
    void submitBudget('create', input);
  };

  const handleUpdateBudget = (input: BudgetUpdateSubmit) => {
    if (!selectedBudget) {
      Alert.alert(
        'Presupuesto no seleccionado',
        'Elige un presupuesto de la lista para editarlo.',
      );
      setCurrentState('Budgets_01');
      return;
    }
    void submitBudget('update', {
      categoryId: selectedBudget.categoryId ?? '',
      categoryName: selectedBudget.category,
      period: selectedBudget.period ?? currentPeriod,
      limitCents: input.limitCents,
    });
  };

  const retryBudget = () => {
    if (!budgetDraft) {
      setCurrentState('Budgets_01');
      return;
    }
    void submitBudget(budgetDraft.mode, budgetDraft);
  };

  const editBudgetFromConflict = () => {
    const existing = (budgets.data ?? []).find(
      (item) =>
        item.categoryId === budgetDraft?.categoryId &&
        item.period === budgetDraft?.period,
    );
    if (existing) {
      setSelectedBudget(existing);
      setCurrentState('Budgets_05');
      return;
    }
    budgets.reload();
    Alert.alert(
      'Actualizamos la lista',
      'El presupuesto existente no estaba en la lista cargada. Búscalo de nuevo para editarlo.',
    );
    setCurrentState('Budgets_01');
  };

  // ── Fase 8: escrituras de metas ────────────────────────────
  const submitGoal = async (
    mode: 'create' | 'update',
    draft: {
      readonly name: string;
      readonly targetCents: number;
      readonly targetDate: string;
    },
  ) => {
    setGoalDraft({ mode, ...draft });
    setGoalErrorReference(null);

    if (demoEnabled) {
      if (mode === 'create') {
        setCreatedGoal(null);
        setCurrentState('Goals_04');
      } else {
        setUpdatedGoal(null);
        setCurrentState('Goals_09');
      }
      return;
    }
    if (!services || !realReady) {
      if (sessionGate !== 'ready') return;
      Alert.alert(
        'Servicio no disponible',
        'No hay conexión con el servidor. No se guardó la meta.',
      );
      return;
    }
    if (mode === 'update' && !selectedGoal) {
      Alert.alert(
        'Meta no seleccionada',
        'Elige una meta de la lista para editarla.',
      );
      setCurrentState('Goals_01');
      return;
    }
    if (goalSubmitting) return;

    const origin = currentStateRef.current;
    const isSameActor = actorGuard();
    const shouldApply = () =>
      isSameActor() && currentStateRef.current === origin;
    const operation =
      mode === 'create' ? goalCreateOperation : goalUpdateOperation;
    const fingerprint =
      mode === 'create'
        ? `goals.create|${draft.name}|${draft.targetCents}|${draft.targetDate}`
        : `goals.update|${selectedGoal?.id ?? ''}|${draft.name}|${draft.targetCents}|${draft.targetDate}`;

    setGoalSubmitting(true);
    try {
      // El backend de metas no implementa Idempotency-Key: la clave local solo
      // impide el doble envío mientras la solicitud está en curso.
      const outcome = await operation.run(fingerprint, () =>
        mode === 'create'
          ? services.goals.create({
              name: draft.name,
              targetCents: draft.targetCents,
              targetDate: draft.targetDate,
            })
          : services.goals.update(selectedGoal?.id ?? '', {
              name: draft.name,
              targetCents: draft.targetCents,
              targetDate: draft.targetDate,
            }),
      );

      if (outcome.status === 'confirmed' && outcome.value) {
        const mapped = mapGoal(outcome.value);
        goals.reload();
        if (!shouldApply()) return;
        if (mode === 'create') {
          setCreatedGoal(mapped);
          setGoalDraft(null);
          setCurrentState('Goals_04');
        } else {
          setUpdatedGoal(mapped);
          setSelectedGoal(mapped);
          setGoalDraft(null);
          setCurrentState('Goals_09');
        }
        return;
      }
      if (outcome.status === 'blocked' || outcome.status === 'cancelled') {
        return;
      }

      const failure = classifyOperationFailure(outcome.error);
      const apiError = asApiError(outcome.error);
      const problemCode = (apiError.problem.code ?? '').toUpperCase();
      if (!shouldApply()) return;

      if (failure === 'session') {
        setCurrentState(mode === 'create' ? 'Goals_06' : 'Goals_11');
        return;
      }
      if (failure === 'not_found') {
        goals.reload();
        if (mode === 'update') {
          setSelectedGoal(null);
          setCurrentState('Goals_12');
        } else {
          Alert.alert(
            'Meta no encontrada',
            'La meta que intentabas editar ya no está disponible.',
          );
          setCurrentState('Goals_01');
        }
        return;
      }
      if (failure === 'conflict') {
        // 409: se conserva el borrador para cambiar el nombre.
        const message = apiError.toUserMessage();
        Alert.alert(message.title, message.message);
        return;
      }
      if (failure === 'validation') {
        if (problemCode === 'INVALID_TARGET_DATE') {
          setGoalInvalid({
            name: draft.name,
            targetCents: draft.targetCents,
            targetDate: draft.targetDate,
          });
          setCurrentState('Goals_07');
        } else {
          const message = apiError.toUserMessage();
          Alert.alert(message.title, message.message);
        }
        return;
      }
      if (failure === 'forbidden') {
        const message = apiError.toUserMessage();
        Alert.alert(message.title, message.message);
        return;
      }

      setGoalErrorReference(apiError.requestId ?? null);
      setCurrentState(mode === 'create' ? 'Goals_08' : 'Goals_13');
    } finally {
      setGoalSubmitting(false);
    }
  };

  const handleCreateGoal = (input: GoalFormSubmit) => {
    void submitGoal('create', input);
  };

  const handleUpdateGoal = (input: GoalFormSubmit) => {
    if (!selectedGoal) {
      Alert.alert('Meta no seleccionada', 'Elige una meta de la lista para editarla.');
      setCurrentState('Goals_01');
      return;
    }
    void submitGoal('update', input);
  };

  const retryCreateGoal = () => {
    if (!goalDraft) {
      setCurrentState('Goals_05');
      return;
    }
    void submitGoal('create', goalDraft);
  };

  const retryUpdateGoal = () => {
    if (!goalDraft) {
      setCurrentState('Goals_01');
      return;
    }
    void submitGoal('update', goalDraft);
  };

  // Categorías disponibles para los formularios de escritura.
  const expenseCategories = demoEnabled
    ? DEMO_EXPENSE_CATEGORIES
    : (categories.data ?? []).filter((item) => item.type === 'gasto');
  const incomeCategories = demoEnabled
    ? DEMO_INCOME_CATEGORIES
    : (categories.data ?? []).filter((item) => item.type === 'ingreso');

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />

      {sessionGateRequired && sessionGate !== 'ready' ? (
        <View style={styles.screenContainer}>
          {sessionGate === 'loading' ? (
            <LoadingState
              message="Validando sesión…"
              hint="Estamos confirmando tu acceso con el servidor."
            />
          ) : (
            <SessionGate
              reason={sessionGate}
              onRetry={handleRetrySession}
            />
          )}
        </View>
      ) : (
        <>
          {/* ── DEV preview bar (solo en modo DEMO) ── */}
          {demoEnabled ? (
            <DevStateBarMulti
              currentState={currentState}
              onSelectState={setCurrentState}
            />
          ) : null}

          {/* ── Aviso obligatorio en pantallas de éxito simuladas ── */}
          {demoEnabled && SIMULATED_SUCCESS_STATES.has(currentState) ? (
            <SimulationBanner />
          ) : null}

          {/* ── Screen render ── */}
          <View style={styles.screenContainer}>
            {/* ── MOVEMENTS MODULE ── */}
        {currentState === 'Movements_01' && (
          <Movements01Screen
            onOpenFilter={() => setCurrentState('Movements_04')}
            onSelectMovement={handleSelectMovement}
            movements={demoEnabled ? undefined : movements.items}
            sectionTitle={demoEnabled ? 'Hoy' : 'Movimientos recientes'}
          />
        )}
        {currentState === 'Movements_02' && (
          <Movements02Screen
            onOpenFilter={() => setCurrentState('Movements_04')}
            onRechargePress={() => setCurrentState('Recharges_01')}
          />
        )}
        {currentState === 'Movements_03' && (
          <Movements03Screen
            onOpenFilter={() => setCurrentState('Movements_04')}
          />
        )}
        {currentState === 'Movements_04' && (
          <Movements04Screen
            onBack={() => setCurrentState('Movements_01')}
            onApplyFilters={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Movements_05' && (
          <Movements05Screen
            movement={selectedMovement}
            onBack={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Movements_06' && (
          <Movements06Screen onBack={() => setCurrentState('Movements_01')} />
        )}
        {currentState === 'Movements_07' && (
          <Movements07Screen
            onLoginPress={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Movements_08' && (
          <Movements08Screen
            onRetryPress={() => setCurrentState('Movements_01')}
          />
        )}

        {/* ── BENEFICIARIES MODULE ── */}
        {currentState === 'Beneficiaries_01' && (
          <Beneficiaries01Screen
            onBack={() => setCurrentState('Movements_01')}
            onAddBeneficiary={() => setCurrentState('Beneficiaries_04')}
            onSendTobeneficiary={(item) => startTransferToBeneficiary(item)}
            onLongPressBeneficiary={(item) => {
              setSelectedBeneficiary(item);
              setCurrentState('Beneficiaries_14');
            }}
            beneficiaries={
              demoEnabled
                ? undefined
                : beneficiariesStatus === 'success'
                  ? beneficiaries.data ?? []
                  : []
            }
          />
        )}
        {currentState === 'Beneficiaries_02' && (
          <Beneficiaries02Screen
            onBack={() => setCurrentState('Movements_01')}
            onAddBeneficiary={() => setCurrentState('Beneficiaries_04')}
          />
        )}
        {currentState === 'Beneficiaries_03' && (
          <Beneficiaries03Screen
            onBack={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Beneficiaries_04' && (
          <Beneficiaries04Screen
            onBack={() => setCurrentState('Beneficiaries_01')}
            onSubmit={handleCreateBeneficiary}
            submitting={beneficiarySubmitting}
            initialCode={beneficiaryDraft.code || undefined}
            initialAlias={beneficiaryDraft.alias || undefined}
          />
        )}
        {currentState === 'Beneficiaries_05' && (
          <Beneficiaries05Screen
            beneficiary={createdBeneficiary ?? undefined}
            onGoToList={() => setCurrentState('Beneficiaries_01')}
            onSendMoney={() => {
              if (createdBeneficiary) {
                startTransferToBeneficiary(createdBeneficiary);
              } else {
                setCurrentState('Transfers_01');
              }
            }}
          />
        )}
        {currentState === 'Beneficiaries_06' && (
          <Beneficiaries06Screen
            onBack={() => setCurrentState('Beneficiaries_04')}
            onRetry={handleCreateBeneficiary}
            initialCode={beneficiaryDraft.code || undefined}
            initialAlias={beneficiaryDraft.alias || undefined}
          />
        )}
        {currentState === 'Beneficiaries_07' && (
          <Beneficiaries07Screen
            onBack={() => setCurrentState('Beneficiaries_01')}
            onTryAgain={() => setCurrentState('Beneficiaries_04')}
            searchedCode={beneficiaryDraft.code.trim().toUpperCase() || undefined}
          />
        )}
        {currentState === 'Beneficiaries_08' && (
          <Beneficiaries08Screen
            onBack={() => setCurrentState('Beneficiaries_04')}
            onGoToList={() => setCurrentState('Beneficiaries_01')}
            duplicateName={
              beneficiaryDraft.alias.trim() ||
              beneficiaryDraft.code.trim().toUpperCase() ||
              undefined
            }
          />
        )}
        {currentState === 'Beneficiaries_09' && (
          <Beneficiaries09Screen
            onBack={() => setCurrentState('Beneficiaries_01')}
            onTryAgain={() => setCurrentState('Beneficiaries_04')}
          />
        )}
        {currentState === 'Beneficiaries_10' && (
          <Beneficiaries10Screen
            beneficiary={deletedBeneficiary ?? undefined}
            onGoToList={() => setCurrentState('Beneficiaries_01')}
            onAddNew={() => setCurrentState('Beneficiaries_04')}
          />
        )}
        {currentState === 'Beneficiaries_11' && (
          <Beneficiaries11Screen
            onLoginPress={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Beneficiaries_12' && (
          <Beneficiaries12Screen
            onLoginPress={() => setCurrentState('Movements_01')}
            onBack={() => setCurrentState('Beneficiaries_04')}
          />
        )}
        {currentState === 'Beneficiaries_13' && (
          <Beneficiaries13Screen
            onRetry={() => {
              beneficiaries.reload();
              setCurrentState('Beneficiaries_01');
            }}
            onBack={() => setCurrentState('Movements_01')}
            errorReference={
              demoEnabled ? undefined : beneficiariesError?.requestId ?? null
            }
          />
        )}
        {currentState === 'Beneficiaries_14' && (
          <Beneficiaries14Screen
            beneficiary={selectedBeneficiary ?? undefined}
            onConfirmDelete={handleDeleteBeneficiary}
            onCancel={() => setCurrentState('Beneficiaries_01')}
            submitting={beneficiaryDeleting}
          />
        )}

        {/* ── CATEGORIES MODULE ── */}
        {currentState === 'Categories_01' &&
          (demoEnabled ? (
            <Categories01Screen
              onBack={() => setCurrentState('Movements_01')}
              onCreate={() => setCurrentState('Categories_03')}
              onSelectCategory={(category) => {
                setSelectedCategory(category);
                setCurrentState('Categories_04');
              }}
              onTabPress={(tab) => {
                if (tab === 'inicio' || tab === 'movimientos') {
                  setCurrentState('Movements_01');
                }
              }}
            />
          ) : categoriesStatus === 'loading' || categoriesStatus === 'idle' ? (
            <LoadingState
              message="Cargando categorías…"
              hint="Consultando tus categorías y el catálogo del sistema."
            />
          ) : categoriesStatus === 'error' ? (
            <ErrorState
              error={categoriesError}
              onRetry={categories.reload}
              onSecondary={() => setCurrentState('Movements_01')}
            />
          ) : (
            <Categories01Screen
              onBack={() => setCurrentState('Movements_01')}
              onCreate={() => setCurrentState('Categories_03')}
              onSelectCategory={(category) => {
                setSelectedCategory(category);
                setCurrentState('Categories_04');
              }}
              categories={categories.data ?? []}
              demo={false}
            />
          ))}
        {currentState === 'Categories_02' && (
          <Categories02Screen
            onBack={() => setCurrentState('Movements_01')}
            onCreateCategory={() => setCurrentState('Categories_03')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Categories_03' && (
          <Categories03Screen
            onBack={() => setCurrentState('Categories_01')}
            onSubmit={handleCategorySubmit}
            onCancel={() => setCurrentState('Categories_01')}
            submitting={categorySubmitting}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Categories_04' && (
          <Categories04Screen
            categoryName={selectedCategory.name}
            categoryType={selectedCategory.type}
            isSystem={selectedCategory.isSystem === true}
            onBack={() => setCurrentState('Categories_01')}
            onSave={handleCategorySubmit}
            onDelete={() => setCurrentState('Categories_08')}
            onCancel={() => setCurrentState('Categories_01')}
            submitting={categorySubmitting}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Categories_05' && (
          <Categories05Screen
            categoryName={selectedCategory.name}
            onCreateBudget={() => setCurrentState('Budgets_04')}
            onViewCategories={() => setCurrentState('Categories_01')}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Categories_06' && (
          <Categories06Screen
            onBack={() => setCurrentState('Categories_03')}
            onCreate={handleCategorySubmit}
            onViewCategories={() => setCurrentState('Categories_01')}
            initialName={categoryDraft.name || selectedCategory.name}
            initialType={categoryDraft.type}
            submitting={categorySubmitting}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Categories_07' && (
          <Categories07Screen
            onBack={() => setCurrentState('Categories_03')}
            onSubmit={handleCategorySubmit}
            onCancel={() => setCurrentState('Categories_01')}
            initialName={categoryDraft.name}
            initialType={categoryDraft.type}
            errorMessage={categoryFormError ?? undefined}
            submitting={categorySubmitting}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Categories_08' && (
          <Categories08Screen
            categoryName={selectedCategory.name}
            onConfirmDelete={handleCategoryDelete}
            onCancel={() => setCurrentState('Categories_04')}
            submitting={categoryDeleting}
            demo={demoEnabled}
          />
        )}

        {/* ── TRANSFERS MODULE ── */}
        {currentState === 'Transfers_01' && (
          <Transfers01Screen
            recipient={transferDraft.recipient}
            amountCents={transferDraft.amountCents}
            message={transferDraft.message}
            onMessageChange={(message) =>
              setTransferDraft((current) => ({ ...current, message }))
            }
            onBack={() => setCurrentState('Transfers_15')}
            onSelectRecipient={() => setCurrentState('Transfers_02')}
            onContinue={() => setCurrentState('Transfers_02')}
          />
        )}
        {currentState === 'Transfers_02' && (
          <Transfers02Screen
            selectedRecipientId={transferDraft.recipient.id}
            onBack={() => setCurrentState('Transfers_01')}
            onSelectRecipient={handleTransferRecipient}
            onContinue={(recipient) => {
              handleTransferRecipient(recipient);
              setCurrentState('Transfers_03');
            }}
          />
        )}
        {currentState === 'Transfers_03' && (
          <Transfers03Screen onShowDemoResult={demoEnabled ? handleTransferSimulatedSuccess : undefined} />
        )}
        {currentState === 'Transfers_04' && (
          <Transfers04Screen
            recipient={transferDraft.recipient}
            amountCents={transferDraft.amountCents}
            reference={selectedTransfer.reference}
            onViewReceipt={() => setCurrentState('Transfers_22')}
            onGoHome={() => setCurrentState('Movements_01')}
            balanceAfterCents={demoEnabled ? undefined : null}
            demoMode={demoEnabled}
          />
        )}
        {currentState === 'Transfers_05' && (
          <Transfers05Screen
            onBack={() => setCurrentState('Transfers_01')}
            onContinue={() => setCurrentState('Transfers_02')}
          />
        )}
        {currentState === 'Transfers_06' && (
          <Transfers06Screen
            onLogin={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Transfers_07' && (
          <Transfers07Screen
            onCorrectRecipient={() => setCurrentState('Transfers_02')}
            onCancel={() => setCurrentState('Transfers_15')}
          />
        )}
        {currentState === 'Transfers_08' && (
          <Transfers08Screen
            onViewReceipt={() => setCurrentState('Transfers_22')}
            onGoHome={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Transfers_09' && (
          <Transfers09Screen
            onReload={() => setCurrentState('Movements_01')}
            onChangeAmount={() => setCurrentState('Transfers_01')}
          />
        )}
        {currentState === 'Transfers_10' && (
          <Transfers10Screen
            onChangeAmount={() => setCurrentState('Transfers_01')}
            onCancel={() => setCurrentState('Transfers_15')}
          />
        )}
        {currentState === 'Transfers_11' && (
          <Transfers11Screen
            onChangeAmount={() => setCurrentState('Transfers_01')}
            onCancel={() => setCurrentState('Transfers_15')}
          />
        )}
        {currentState === 'Transfers_12' && (
          <Transfers12Screen
            onDismiss={() => setCurrentState('Transfers_15')}
          />
        )}
        {currentState === 'Transfers_13' && (
          <Transfers13Screen
            onViewMovements={() => setCurrentState('Transfers_15')}
            onRetry={() => setCurrentState('Transfers_01')}
            uncertain={transferUncertain}
            demoMode={demoEnabled}
          />
        )}
        {currentState === 'Transfers_14' && (
          <Transfers14Screen
            onRetry={() => setCurrentState('Transfers_01')}
            onGoHome={() => setCurrentState('Movements_01')}
            demoMode={demoEnabled}
          />
        )}
        {currentState === 'Transfers_15' && (
          <Transfers15Screen
            onBack={() => setCurrentState('Movements_01')}
            onSelectTransfer={(transfer) => {
              setSelectedTransfer(transfer);
              setCurrentState('Transfers_19');
            }}
            transfers={demoEnabled ? undefined : transfers.data ?? []}
            demoMode={demoEnabled}
          />
        )}
        {currentState === 'Transfers_16' && (
          <Transfers16Screen
            onBack={() => setCurrentState('Movements_01')}
            onSendMoney={() => setCurrentState('Transfers_01')}
          />
        )}
        {currentState === 'Transfers_17' && (
          <Transfers17Screen
            onBack={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Transfers_18' && (
          <Transfers18Screen
            onBack={() => setCurrentState('Movements_01')}
            onRetry={() => setCurrentState('Transfers_15')}
          />
        )}
        {currentState === 'Transfers_19' && (
          <Transfers19Screen
            transfer={selectedTransfer}
            onBack={() => setCurrentState('Transfers_15')}
            onViewReceipt={() => setCurrentState('Transfers_22')}
            demoMode={demoEnabled}
          />
        )}
        {currentState === 'Transfers_20' && (
          <Transfers20Screen
            onBack={() => setCurrentState('Transfers_15')}
            onViewTransfers={() => setCurrentState('Transfers_15')}
          />
        )}
        {currentState === 'Transfers_21' && (
          <Transfers21Screen
            onBack={() => setCurrentState('Transfers_15')}
            onViewTransfers={() => setCurrentState('Transfers_15')}
          />
        )}
        {currentState === 'Transfers_22' &&
          (demoEnabled ? (
            <Transfers22Screen
              transfer={selectedTransfer}
              onBack={() => setCurrentState('Transfers_19')}
              demoMode
            />
          ) : receipt.status === 'success' && receipt.data ? (
            <Transfers22Screen
              receipt={receipt.data}
              onBack={() => setCurrentState('Transfers_19')}
              demoMode={false}
            />
          ) : receipt.status === 'error' ? (
            receiptFailure === 'not_found' ? (
              <Transfers20Screen
                onBack={() => setCurrentState('Transfers_15')}
                onViewTransfers={() => setCurrentState('Transfers_15')}
              />
            ) : receiptFailure === 'forbidden' ? (
              <Transfers21Screen
                onBack={() => setCurrentState('Transfers_15')}
                onViewTransfers={() => setCurrentState('Transfers_15')}
              />
            ) : receiptFailure === 'session' ? (
              <Transfers06Screen
                onLogin={() => setCurrentState('Movements_01')}
              />
            ) : receiptFailure === 'unavailable' ? (
              <Transfers14Screen
                onRetry={() => receipt.reload()}
                onGoHome={() => setCurrentState('Movements_01')}
                demoMode={false}
              />
            ) : (
              <Transfers13Screen
                onViewMovements={() => setCurrentState('Transfers_15')}
                onRetry={() => receipt.reload()}
                uncertain={receiptFailure === 'uncertain'}
                demoMode={false}
              />
            )
          ) : (
            <LoadingState
              message="Cargando comprobante…"
              hint="Confirmando el comprobante con el servidor."
            />
          ))}

        {/* ── RECHARGES MODULE ── */}
        {currentState === 'Recharges_01' && (
          <Recharges01Screen
            amountCents={rechargeDraft.amountCents}
            onAmountChange={(amountCents) =>
              setRechargeDraft({ amountCents })
            }
            submitting={rechargeSubmitting}
            onBack={() => setCurrentState('Recharges_08')}
            onContinue={() => {
              void handleRecharge();
            }}
          />
        )}
        {currentState === 'Recharges_02' && (
          <Recharges02Screen
            amountCents={rechargeDraft.amountCents}
            result={rechargeResult ?? undefined}
            onGoHome={() => setCurrentState('Movements_01')}
            onViewHistory={() => setCurrentState('Recharges_08')}
            demoMode={demoEnabled}
          />
        )}
        {currentState === 'Recharges_03' && (
          <Recharges03Screen
            onBack={() => setCurrentState('Recharges_01')}
            onContinue={() => setCurrentState('Recharges_01')}
            onSelectAmount={(amountCents) => {
              setRechargeDraft({ amountCents });
              setCurrentState('Recharges_01');
            }}
          />
        )}
        {currentState === 'Recharges_04' && (
          <Recharges04Screen
            onLogin={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Recharges_05' && (
          <Recharges05Screen
            onChangeAmount={() => setCurrentState('Recharges_01')}
            onCancel={() => setCurrentState('Recharges_08')}
          />
        )}
        {currentState === 'Recharges_06' && (
          <Recharges06Screen
            onDismiss={() => setCurrentState('Recharges_08')}
          />
        )}
        {currentState === 'Recharges_07' && (
          <Recharges07Screen
            onRetry={() => setCurrentState('Recharges_01')}
            onGoHome={() => setCurrentState('Movements_01')}
            demoMode={demoEnabled}
          />
        )}
        {currentState === 'Recharges_08' &&
          (!demoEnabled && rechargesStatus === 'loading' ? (
            <LoadingState
              message="Cargando recargas…"
              hint="Consultando tus recargas confirmadas."
            />
          ) : (
            <Recharges08Screen
              onBack={() => setCurrentState('Movements_01')}
              onNewRecharge={() => setCurrentState('Recharges_01')}
              onTabPress={(tab) => {
                if (tab === 'inicio' || tab === 'movimientos') {
                  setCurrentState('Movements_01');
                }
              }}
              recharges={demoEnabled ? undefined : recharges.data ?? []}
            />
          ))}
        {currentState === 'Recharges_09' && (
          <Recharges09Screen
            onBack={() => setCurrentState('Movements_01')}
            onStartRecharge={() => setCurrentState('Recharges_01')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
        {currentState === 'Recharges_10' && (
          <Recharges10Screen
            onBack={() => setCurrentState('Movements_01')}
            onStartRecharge={() => setCurrentState('Recharges_01')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}

        {/* ── CASH MODULE ── */}
        {currentState === 'Cash_01' &&
          (demoEnabled ? (
            <Cash01Screen
              onBack={() => setCurrentState('Movements_01')}
              onRegisterExpense={() => setCurrentState('Cash_03')}
              onRegisterIncome={() => setCurrentState('Cash_02')}
              onViewHistory={() => setCurrentState('Cash_12')}
              onTabPress={(tab) => {
                if (tab === 'inicio' || tab === 'movimientos') {
                  setCurrentState('Movements_01');
                }
              }}
            />
          ) : cashStatus === 'loading' || cashStatus === 'idle' ? (
            <LoadingState
              message="Cargando tu efectivo…"
              hint="Consultando el saldo y los movimientos recientes."
            />
          ) : cashStatus === 'error' ? (
            <ErrorState
              error={cashError}
              onRetry={cashRegister.reload}
              onSecondary={() => setCurrentState('Movements_01')}
            />
          ) : (
            <Cash01Screen
              onBack={() => setCurrentState('Movements_01')}
              onRegisterExpense={() => setCurrentState('Cash_03')}
              onRegisterIncome={() => setCurrentState('Cash_02')}
              onViewHistory={() => setCurrentState('Cash_12')}
              onTabPress={(tab) => {
                if (tab === 'inicio' || tab === 'movimientos') {
                  setCurrentState('Movements_01');
                }
              }}
              availableCents={cashRegister.balance?.availableCents}
              recentTransactions={cashRegister.transactions}
              demo={false}
            />
          ))}
        {currentState === 'Cash_02' && (
          <Cash02Screen
            onBack={() => setCurrentState('Cash_01')}
            onSubmit={handleCashSubmit}
            onCancel={() => setCurrentState('Cash_01')}
            submitting={cashSubmitting}
            demo={demoEnabled}
            categories={incomeCategories}
            initialAmountText={
              cashDraft?.direction === 'income'
                ? formatCashAmount(cashDraft.input.amountCents)
                : undefined
            }
            initialNote={
              cashDraft?.direction === 'income'
                ? cashDraft.input.note
                : undefined
            }
            initialCategoryId={
              cashDraft?.direction === 'income'
                ? cashDraft.input.categoryId
                : undefined
            }
            initialCategoryName={
              cashDraft?.direction === 'income'
                ? cashDraft.input.categoryName
                : undefined
            }
          />
        )}
        {currentState === 'Cash_03' && (
          <Cash03Screen
            onBack={() => setCurrentState('Cash_01')}
            onSubmit={handleCashSubmit}
            onCancel={() => setCurrentState('Cash_01')}
            submitting={cashSubmitting}
            demo={demoEnabled}
            categories={expenseCategories}
            availableCents={
              demoEnabled ? undefined : cashRegister.balance?.availableCents
            }
            initialAmountText={
              cashDraft?.direction === 'expense'
                ? formatCashAmount(cashDraft.input.amountCents)
                : undefined
            }
            initialNote={
              cashDraft?.direction === 'expense'
                ? cashDraft.input.note
                : undefined
            }
            initialCategoryId={
              cashDraft?.direction === 'expense'
                ? cashDraft.input.categoryId
                : undefined
            }
            initialCategoryName={
              cashDraft?.direction === 'expense'
                ? cashDraft.input.categoryName
                : undefined
            }
          />
        )}
        {currentState === 'Cash_04' && (
          <Cash04Screen
            result={cashResult ?? undefined}
            onViewCash={() => setCurrentState('Cash_01')}
            onRegisterAnother={() => setCurrentState('Cash_02')}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Cash_05' && (
          <Cash05Screen
            result={cashResult ?? undefined}
            onViewCash={() => setCurrentState('Cash_01')}
            onRegisterAnother={() => setCurrentState('Cash_03')}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Cash_06' && (
          <Cash06Screen
            onBack={() => setCurrentState('Cash_03')}
            onSave={() => setCurrentState('Cash_03')}
            onCancel={() => setCurrentState('Cash_01')}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Cash_07' && (
          <Cash07Screen
            onFixAmount={() => setCurrentState('Cash_03')}
            onRegisterIncome={() => setCurrentState('Cash_02')}
            attemptedCents={cashRejected?.attemptedCents}
            availableCents={
              demoEnabled ? undefined : cashRegister.balance?.availableCents
            }
            demo={demoEnabled}
          />
        )}
        {currentState === 'Cash_08' && (
          <Cash08Screen
            onLogin={() => setCurrentState('Movements_01')}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Cash_09' && (
          <Cash09Screen
            onChooseCategory={() => setCurrentState('Cash_03')}
            onCreateCategory={() => setCurrentState('Categories_03')}
            categoryName={cashRejected?.categoryName}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Cash_10' && (
          <Cash10Screen
            onViewCash={() => setCurrentState('Cash_01')}
            onRegisterAnother={() => setCurrentState('Cash_03')}
            result={cashResult ?? undefined}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Cash_11' && (
          <Cash11Screen
            onRetry={retryCash}
            onCancel={() => setCurrentState('Cash_01')}
            demo={demoEnabled}
            errorReference={cashRejected?.errorReference ?? null}
          />
        )}
        {currentState === 'Cash_12' && (
          <Cash12Screen
            onBack={() => setCurrentState('Cash_01')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
            transactions={demoEnabled ? undefined : cashRegister.transactions}
            demo={demoEnabled}
          />
        )}

        {/* ── BUDGETS MODULE ── */}
        {currentState === 'Budgets_01' &&
          (!demoEnabled && budgetsStatus === 'error' ? (
            <ErrorState
              error={budgetsError}
              onRetry={budgets.reload}
              onSecondary={() => setCurrentState('Movements_01')}
            />
          ) : (
            <Budgets01Screen
              onBack={() => setCurrentState('Movements_01')}
              onCreate={() => setCurrentState('Budgets_04')}
              onSelectBudget={(budget) => {
                setSelectedBudget(budget);
                setCurrentState('Budgets_05');
              }}
              onTabPress={(tab) => {
                if (tab === 'inicio' || tab === 'movimientos') {
                  setCurrentState('Movements_01');
                }
              }}
              budgets={demoEnabled ? undefined : budgets.data ?? []}
              monthLabel={
                demoEnabled
                  ? undefined
                  : formatMonthPeriodLabel(
                      budgets.data?.[0]?.period ?? currentPeriod,
                    )
              }
              demo={demoEnabled}
            />
          ))}
        {currentState === 'Budgets_02' && (
          <Budgets02Screen
            onBack={() => setCurrentState('Movements_01')}
            onCreate={() => setCurrentState('Budgets_04')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Budgets_03' &&
          (!demoEnabled && budgetsStatus === 'error' ? (
            <ErrorState
              error={budgetsError}
              onRetry={budgets.reload}
              onSecondary={() => setCurrentState('Movements_01')}
            />
          ) : (
            <Budgets03Screen
              onBack={() => setCurrentState('Movements_01')}
              onTabPress={(tab) => {
                if (tab === 'inicio' || tab === 'movimientos') {
                  setCurrentState('Movements_01');
                }
              }}
              monthLabel={
                demoEnabled
                  ? undefined
                  : formatMonthPeriodLabel(
                      budgets.data?.[0]?.period ?? currentPeriod,
                    )
              }
              demo={demoEnabled}
            />
          ))}
        {currentState === 'Budgets_04' && (
          <Budgets04Screen
            onBack={() => setCurrentState('Budgets_01')}
            onCreate={handleCreateBudget}
            onCancel={() => setCurrentState('Budgets_01')}
            submitting={budgetSubmitting}
            demo={demoEnabled}
            categories={expenseCategories}
            period={currentPeriod}
            initialCategoryId={
              budgetDraft?.mode === 'create'
                ? budgetDraft.categoryId
                : undefined
            }
            initialLimitText={
              budgetDraft?.mode === 'create'
                ? formatBudgetAmount(budgetDraft.limitCents)
                : undefined
            }
          />
        )}
        {currentState === 'Budgets_05' && (
          <Budgets05Screen
            budget={selectedBudget ?? undefined}
            onBack={() => setCurrentState('Budgets_01')}
            onSave={handleUpdateBudget}
            onCancel={() => setCurrentState('Budgets_01')}
            submitting={budgetSubmitting}
            demo={demoEnabled}
            initialLimitText={
              budgetDraft?.mode === 'update'
                ? formatBudgetAmount(budgetDraft.limitCents)
                : undefined
            }
          />
        )}
        {currentState === 'Budgets_06' && (
          <Budgets06Screen
            onBack={() => setCurrentState('Budgets_01')}
            onEdit={() => setCurrentState('Budgets_05')}
            onRegisterExpense={() => setCurrentState('Cash_03')}
          />
        )}
        {currentState === 'Budgets_07' && (
          <Budgets07Screen
            onBack={() => setCurrentState('Budgets_06')}
            onEdit={() => setCurrentState('Budgets_05')}
            onRegisterExpense={() => setCurrentState('Cash_03')}
          />
        )}
        {currentState === 'Budgets_08' && (
          <Budgets08Screen
            onBack={() => setCurrentState('Budgets_01')}
            onEdit={() => setCurrentState('Budgets_05')}
            onAdjustLimit={() => setCurrentState('Budgets_05')}
            onViewExpenses={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Budgets_09' && (
          <Budgets09Screen
            budget={createdBudget ?? undefined}
            onViewBudgets={() => setCurrentState('Budgets_01')}
            onCreateAnother={() => setCurrentState('Budgets_04')}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Budgets_10' && (
          <Budgets10Screen
            onEditExisting={editBudgetFromConflict}
            onCancel={() => setCurrentState('Budgets_01')}
            categoryName={budgetConflictName ?? undefined}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Budgets_11' && (
          <Budgets11Screen
            onBack={() => setCurrentState('Budgets_04')}
            onSubmit={() => setCurrentState('Budgets_04')}
            onCancel={() => setCurrentState('Budgets_01')}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Budgets_12' && (
          <Budgets12Screen
            onRetry={retryBudget}
            onCancel={() => setCurrentState('Budgets_01')}
            demo={demoEnabled}
            errorReference={budgetErrorReference}
          />
        )}
        {currentState === 'Budgets_13' && (
          <Budgets13Screen
            onLogin={() => setCurrentState('Movements_01')}
            demo={demoEnabled}
          />
        )}

        {/* ── GOALS MODULE ── */}
        {currentState === 'Goals_01' &&
          (!demoEnabled &&
          (goalsStatus === 'loading' || goalsStatus === 'idle') ? (
            <LoadingState
              message="Cargando tus metas…"
              hint="Consultando tus metas de ahorro."
            />
          ) : (
            <Goals01Screen
              onBack={() => setCurrentState('Movements_01')}
              onCreate={() => setCurrentState('Goals_05')}
              onSelectGoal={(goal) => {
                setSelectedGoal(goal);
                setGoalDraft(null);
                setCurrentState('Goals_10');
              }}
              onTabPress={(tab) => {
                if (tab === 'inicio' || tab === 'movimientos') {
                  setCurrentState('Movements_01');
                }
              }}
              goals={demoEnabled ? undefined : goals.data ?? []}
              demo={demoEnabled}
            />
          ))}
        {currentState === 'Goals_02' && (
          <Goals02Screen
            onLogin={() => setCurrentState('Movements_01')}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Goals_03' && (
          <Goals03Screen
            onRetry={() => {
              goals.reload();
              setCurrentState('Goals_01');
            }}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Goals_04' && (
          <Goals04Screen
            goal={demoEnabled ? undefined : createdGoal ?? undefined}
            onViewGoal={() => {
              goals.reload();
              setCurrentState('Goals_01');
            }}
            onBackToGoals={() => {
              goals.reload();
              setCurrentState('Goals_01');
            }}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Goals_05' && (
          <Goals05Screen
            onBack={() => setCurrentState('Goals_01')}
            onCreate={handleCreateGoal}
            onCancel={() => setCurrentState('Goals_01')}
            submitting={goalSubmitting}
            demo={demoEnabled}
            initialName={
              goalDraft?.mode === 'create' ? goalDraft.name : undefined
            }
            initialAmountText={
              goalDraft?.mode === 'create'
                ? formatGoalAmount(goalDraft.targetCents)
                : undefined
            }
            initialDate={
              goalDraft?.mode === 'create' ? goalDraft.targetDate : undefined
            }
          />
        )}
        {currentState === 'Goals_06' && (
          <Goals06Screen
            onLogin={() => setCurrentState('Movements_01')}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Goals_07' && (
          <Goals07Screen
            onCorrect={() =>
              setCurrentState(
                goalDraft?.mode === 'update' ? 'Goals_10' : 'Goals_05',
              )
            }
            goalName={goalInvalid?.name}
            targetCents={goalInvalid?.targetCents}
            targetDateLabel={
              goalInvalid
                ? formatLongDateLabel(goalInvalid.targetDate)
                : undefined
            }
            demo={demoEnabled}
          />
        )}
        {currentState === 'Goals_08' && (
          <Goals08Screen
            onRetry={retryCreateGoal}
            demo={demoEnabled}
            errorReference={goalErrorReference}
          />
        )}
        {currentState === 'Goals_09' && (
          <Goals09Screen
            goal={demoEnabled ? undefined : updatedGoal ?? undefined}
            onBackToGoal={() => {
              goals.reload();
              setCurrentState('Goals_01');
            }}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Goals_10' && (
          <Goals10Screen
            goal={selectedGoal ?? undefined}
            onBack={() => setCurrentState('Goals_01')}
            onSave={handleUpdateGoal}
            onCancel={() => setCurrentState('Goals_01')}
            submitting={goalSubmitting}
            demo={demoEnabled}
            initialName={
              goalDraft?.mode === 'update' ? goalDraft.name : undefined
            }
            initialAmountText={
              goalDraft?.mode === 'update'
                ? formatGoalAmount(goalDraft.targetCents)
                : undefined
            }
            initialDate={
              goalDraft?.mode === 'update' ? goalDraft.targetDate : undefined
            }
          />
        )}
        {currentState === 'Goals_11' && (
          <Goals11Screen
            onLogin={() => setCurrentState('Movements_01')}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Goals_12' && (
          <Goals12Screen
            onViewGoals={() => {
              goals.reload();
              setCurrentState('Goals_01');
            }}
            onGoHome={() => setCurrentState('Movements_01')}
            demo={demoEnabled}
          />
        )}
        {currentState === 'Goals_13' && (
          <Goals13Screen
            onRetry={retryUpdateGoal}
            demo={demoEnabled}
            errorReference={goalErrorReference}
          />
        )}

        {/* ── Analytics Module (10 screens) ────────────────── */}
        {currentState === 'Analytics_01' &&
          (!demoEnabled &&
          (analyticsStatus === 'loading' || analyticsStatus === 'idle') ? (
            <LoadingState
              message="Cargando tu resumen…"
              hint="Consultando ingresos, gastos y tendencias del periodo."
            />
          ) : (
            <Analytics01Screen
              onBack={() => setCurrentState('Movements_01')}
              onSelectTab={(tab: AnalyticsTab) => {
                if (tab === 'categorias') setCurrentState('Analytics_05');
                else if (tab === 'tendencias') setCurrentState('Analytics_08');
              }}
              onSelectPeriod={() => setCurrentState('Analytics_02')}
              onTabPress={(tab) => {
                if (tab === 'inicio' || tab === 'movimientos') {
                  setCurrentState('Movements_01');
                }
              }}
              summary={demoEnabled ? undefined : analytics.summary ?? undefined}
            />
          ))}
        {currentState === 'Analytics_02' && (
          <Analytics02Screen
            onBack={() => setCurrentState('Analytics_01')}
            onSelectTab={(tab: AnalyticsTab) => {
              if (tab === 'categorias') setCurrentState('Analytics_05');
              else if (tab === 'tendencias') setCurrentState('Analytics_08');
              else setCurrentState('Analytics_01');
            }}
            onSubmit={() => setCurrentState('Analytics_01')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
        {currentState === 'Analytics_03' && (
          <Analytics03Screen
            onBack={() => setCurrentState('Analytics_01')}
            onSelectTab={(tab: AnalyticsTab) => {
              if (tab === 'categorias') setCurrentState('Analytics_06');
              else if (tab === 'tendencias') setCurrentState('Analytics_09');
            }}
            onLoginPress={() => setCurrentState('Movements_01')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
        {currentState === 'Analytics_04' && (
          <Analytics04Screen
            onBack={() => setCurrentState('Analytics_01')}
            onSelectTab={(tab: AnalyticsTab) => {
              if (tab === 'categorias') setCurrentState('Analytics_07');
              else if (tab === 'tendencias') setCurrentState('Analytics_10');
            }}
            onRetry={() => {
              analytics.reload();
              setCurrentState('Analytics_01');
            }}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
        {currentState === 'Analytics_05' &&
          (!demoEnabled &&
          (analyticsStatus === 'loading' || analyticsStatus === 'idle') ? (
            <LoadingState
              message="Cargando gastos por categoría…"
              hint="Consultando el desglose del periodo."
            />
          ) : (
            <Analytics05Screen
              onBack={() => setCurrentState('Analytics_01')}
              onSelectTab={(tab: AnalyticsTab) => {
                if (tab === 'resumen') setCurrentState('Analytics_01');
                else if (tab === 'tendencias') setCurrentState('Analytics_08');
              }}
              onSelectPeriod={() => setCurrentState('Analytics_02')}
              onTabPress={(tab) => {
                if (tab === 'inicio' || tab === 'movimientos') {
                  setCurrentState('Movements_01');
                }
              }}
              categories={
                demoEnabled ? undefined : analytics.categories ?? undefined
              }
            />
          ))}
        {currentState === 'Analytics_06' && (
          <Analytics06Screen
            onBack={() => setCurrentState('Analytics_05')}
            onSelectTab={(tab: AnalyticsTab) => {
              if (tab === 'resumen') setCurrentState('Analytics_03');
              else if (tab === 'tendencias') setCurrentState('Analytics_09');
            }}
            onLoginPress={() => setCurrentState('Movements_01')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
        {currentState === 'Analytics_07' && (
          <Analytics07Screen
            onBack={() => setCurrentState('Analytics_05')}
            onSelectTab={(tab: AnalyticsTab) => {
              if (tab === 'resumen') setCurrentState('Analytics_04');
              else if (tab === 'tendencias') setCurrentState('Analytics_10');
            }}
            onRetry={() => {
              analytics.reload();
              setCurrentState('Analytics_05');
            }}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
        {currentState === 'Analytics_08' &&
          (!demoEnabled &&
          (analyticsStatus === 'loading' || analyticsStatus === 'idle') ? (
            <LoadingState
              message="Cargando tendencias…"
              hint="Consultando ingresos y gastos por semana."
            />
          ) : (
            <Analytics08Screen
              onBack={() => setCurrentState('Analytics_01')}
              onSelectTab={(tab: AnalyticsTab) => {
                if (tab === 'resumen') setCurrentState('Analytics_01');
                else if (tab === 'categorias') setCurrentState('Analytics_05');
              }}
              onSelectPeriod={() => setCurrentState('Analytics_02')}
              onTabPress={(tab) => {
                if (tab === 'inicio' || tab === 'movimientos') {
                  setCurrentState('Movements_01');
                }
              }}
              trends={demoEnabled ? undefined : analytics.trends ?? undefined}
            />
          ))}
        {currentState === 'Analytics_09' && (
          <Analytics09Screen
            onBack={() => setCurrentState('Analytics_08')}
            onSelectTab={(tab: AnalyticsTab) => {
              if (tab === 'resumen') setCurrentState('Analytics_03');
              else if (tab === 'categorias') setCurrentState('Analytics_06');
            }}
            onLoginPress={() => setCurrentState('Movements_01')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
        {currentState === 'Analytics_10' && (
          <Analytics10Screen
            onBack={() => setCurrentState('Analytics_08')}
            onSelectTab={(tab: AnalyticsTab) => {
              if (tab === 'resumen') setCurrentState('Analytics_04');
              else if (tab === 'categorias') setCurrentState('Analytics_07');
            }}
            onRetry={() => {
              analytics.reload();
              setCurrentState('Analytics_08');
            }}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}

        {/* ── STITCH MODULO 1 ─────────────────────────────── */}
        {currentState.startsWith('Access_') ||
        currentState.startsWith('Wallet_') ||
        currentState.startsWith('Profile_') ||
        currentState.startsWith('Configuration_') ||
        currentState.startsWith('Projection_Status_') ? (
          <Module1ScreenRenderer
            screenKey={currentState as Module1ScreenKey}
            onNavigate={(key) => setCurrentState(key)}
            onHome={() => setCurrentState('Movements_01')}
          />
        ) : null}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Solo backoffice: en web de escritorio se muestra con ancho de celular; en nativo no tiene efecto.
  webBackdrop: { flex: 1, backgroundColor: '#E2E8F0' },
  phoneFrame: { width: '100%', maxWidth: 430, alignSelf: 'center' },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
  },
});

// EXPO_PUBLIC_APP_MODE=backoffice arranca el backoffice de personal; por defecto, la app de clientes.
export default function App() {
  if (process.env.EXPO_PUBLIC_APP_MODE === 'backoffice') {
    return (
      <View style={styles.webBackdrop}>
        <SafeAreaView style={[styles.root, styles.phoneFrame]}>
          <StatusBar style="dark" />
          <BackofficeApp />
        </SafeAreaView>
      </View>
    );
  }
  return <MainApp />;
}
