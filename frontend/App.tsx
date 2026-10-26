import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, SafeAreaView, StyleSheet, View } from 'react-native';
import colors from './src/theme/colors';
import { appConfig } from './src/config/appConfig';
import SimulationBanner from './src/components/common/SimulationBanner';
import LoadingState from './src/components/common/states/LoadingState';
import SessionGate, {
  type SessionGateReason,
} from './src/components/common/SessionGate';
import { sessionManager } from './src/services/session/platform';

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
import { BeneficiariesState } from './src/types/beneficiaries';
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
import { DEMO_CATEGORY_TO_EDIT } from './src/data/demoCategories';

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
import { RechargesState, RechargeDraft } from './src/types/recharges';
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
import { CashState } from './src/types/cash';

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
import { BudgetsState } from './src/types/budgets';

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
import { GoalsState } from './src/types/goals';

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
  | AnalyticsState;

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
 * Fuera de DEMO la app exige una sesión válida antes de renderizar cualquier
 * módulo. No existe todavía pantalla de login (BLOQUEADA por diseño), así que
 * el gate solo informa y permite reintentar la validación.
 */
export default function App() {
  const [currentState, setCurrentState] = useState<AppState>('Movements_01');
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

  // ── Gate de sesión (bypass explícito en DEMO) ──────────────
  const sessionGateRequired = !demoEnabled;
  const [sessionGate, setSessionGate] = useState<SessionGateState>(() => {
    if (!sessionGateRequired) return 'ready';
    return appConfig.apiConfigured ? 'loading' : 'configuration';
  });

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
   * Fuera de DEMO no se fabrica ningún comprobante: se muestra el error
   * disponible o se informa que la función aún no está conectada al backend.
   */
  const openSimulatedSuccess = (target: AppState, fallback?: AppState) => {
    if (demoEnabled) {
      setCurrentState(target);
      return;
    }
    if (fallback) {
      setCurrentState(fallback);
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
          />
        )}
        {currentState === 'Movements_02' && (
          <Movements02Screen
            onOpenFilter={() => setCurrentState('Movements_04')}
            onRechargePress={() => setCurrentState('Movements_01')}
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
            onSendTobeneficiary={() => setCurrentState('Movements_01')}
            onLongPressBeneficiary={() => setCurrentState('Beneficiaries_14')}
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
            onSubmit={() => openSimulatedSuccess('Beneficiaries_05', 'Beneficiaries_06')}
          />
        )}
        {currentState === 'Beneficiaries_05' && (
          <Beneficiaries05Screen
            onGoToList={() => setCurrentState('Beneficiaries_01')}
            onSendMoney={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Beneficiaries_06' && (
          <Beneficiaries06Screen
            onBack={() => setCurrentState('Beneficiaries_04')}
            onRetry={() => setCurrentState('Beneficiaries_04')}
          />
        )}
        {currentState === 'Beneficiaries_07' && (
          <Beneficiaries07Screen
            onBack={() => setCurrentState('Beneficiaries_01')}
            onTryAgain={() => setCurrentState('Beneficiaries_04')}
          />
        )}
        {currentState === 'Beneficiaries_08' && (
          <Beneficiaries08Screen
            onBack={() => setCurrentState('Beneficiaries_04')}
            onGoToList={() => setCurrentState('Beneficiaries_01')}
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
            onRetry={() => setCurrentState('Beneficiaries_01')}
            onBack={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Beneficiaries_14' && (
          <Beneficiaries14Screen
            onConfirmDelete={() => setCurrentState('Beneficiaries_10')}
            onCancel={() => setCurrentState('Beneficiaries_01')}
          />
        )}

        {/* ── CATEGORIES MODULE ── */}
        {currentState === 'Categories_01' && (
          <Categories01Screen
            onBack={() => setCurrentState('Movements_01')}
            onCreate={() => setCurrentState('Categories_03')}
            onSelectCategory={(category) => {
              setSelectedCategory(category);
              setCurrentState('Categories_04');
            }}
          />
        )}
        {currentState === 'Categories_02' && (
          <Categories02Screen
            onBack={() => setCurrentState('Movements_01')}
            onCreateCategory={() => setCurrentState('Categories_03')}
          />
        )}
        {currentState === 'Categories_03' && (
          <Categories03Screen
            onBack={() => setCurrentState('Categories_01')}
            onSubmit={handleCategoryDraft}
            onCancel={() => setCurrentState('Categories_01')}
          />
        )}
        {currentState === 'Categories_04' && (
          <Categories04Screen
            categoryName={selectedCategory.name}
            categoryType={selectedCategory.type}
            onBack={() => setCurrentState('Categories_01')}
            onSave={(name, _color, type) => {
              const safeName = name || selectedCategory.name;
              setSelectedCategory({
                ...selectedCategory,
                name: safeName,
                type,
                initialLetter: safeName.charAt(0).toUpperCase(),
              });
              setCurrentState('Categories_01');
            }}
            onDelete={() => setCurrentState('Categories_08')}
            onCancel={() => setCurrentState('Categories_01')}
          />
        )}
        {currentState === 'Categories_05' && (
          <Categories05Screen
            categoryName={selectedCategory.name}
            onCreateBudget={() => setCurrentState('Movements_01')}
            onViewCategories={() => setCurrentState('Categories_01')}
          />
        )}
        {currentState === 'Categories_06' && (
          <Categories06Screen
            onBack={() => setCurrentState('Categories_03')}
            onCreate={handleCategoryDraft}
            onViewCategories={() => setCurrentState('Categories_01')}
          />
        )}
        {currentState === 'Categories_07' && (
          <Categories07Screen
            onBack={() => setCurrentState('Categories_03')}
            onSubmit={handleCategoryDraft}
            onCancel={() => setCurrentState('Categories_01')}
          />
        )}
        {currentState === 'Categories_08' && (
          <Categories08Screen
            categoryName={selectedCategory.name}
            onConfirmDelete={() => setCurrentState('Categories_01')}
            onCancel={() => setCurrentState('Categories_04')}
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
          />
        )}
        {currentState === 'Transfers_14' && (
          <Transfers14Screen
            onRetry={() => setCurrentState('Transfers_01')}
            onGoHome={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Transfers_15' && (
          <Transfers15Screen
            onBack={() => setCurrentState('Movements_01')}
            onSelectTransfer={(transfer) => {
              setSelectedTransfer(transfer);
              setCurrentState('Transfers_19');
            }}
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
        {currentState === 'Transfers_22' && (
          <Transfers22Screen
            transfer={selectedTransfer}
            onBack={() => setCurrentState('Transfers_19')}
          />
        )}

        {/* ── RECHARGES MODULE ── */}
        {currentState === 'Recharges_01' && (
          <Recharges01Screen
            amountCents={rechargeDraft.amountCents}
            onAmountChange={(amountCents) =>
              setRechargeDraft({ amountCents })
            }
            onBack={() => setCurrentState('Recharges_08')}
            onContinue={() => openSimulatedSuccess('Recharges_02', 'Recharges_07')}
          />
        )}
        {currentState === 'Recharges_02' && (
          <Recharges02Screen
            amountCents={rechargeDraft.amountCents}
            onGoHome={() => setCurrentState('Movements_01')}
            onViewHistory={() => setCurrentState('Recharges_08')}
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
          />
        )}
        {currentState === 'Recharges_08' && (
          <Recharges08Screen
            onBack={() => setCurrentState('Movements_01')}
            onNewRecharge={() => setCurrentState('Recharges_01')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
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
        {currentState === 'Cash_01' && (
          <Cash01Screen
            onBack={() => setCurrentState('Movements_01')}
            onRegisterExpense={() => setCurrentState('Cash_03')}
            onRegisterIncome={() => setCurrentState('Cash_02')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
        {currentState === 'Cash_02' && (
          <Cash02Screen
            onBack={() => setCurrentState('Cash_01')}
            onSave={() => openSimulatedSuccess('Cash_04', 'Cash_11')}
            onCancel={() => setCurrentState('Cash_01')}
          />
        )}
        {currentState === 'Cash_03' && (
          <Cash03Screen
            onBack={() => setCurrentState('Cash_01')}
            onSave={() => openSimulatedSuccess('Cash_05', 'Cash_11')}
            onCancel={() => setCurrentState('Cash_01')}
          />
        )}
        {currentState === 'Cash_04' && (
          <Cash04Screen
            onViewCash={() => setCurrentState('Cash_01')}
            onRegisterAnother={() => setCurrentState('Cash_02')}
          />
        )}
        {currentState === 'Cash_05' && (
          <Cash05Screen
            onViewCash={() => setCurrentState('Cash_01')}
            onRegisterAnother={() => setCurrentState('Cash_03')}
          />
        )}
        {currentState === 'Cash_06' && (
          <Cash06Screen
            onBack={() => setCurrentState('Cash_03')}
            onSave={() => setCurrentState('Cash_03')}
            onCancel={() => setCurrentState('Cash_01')}
          />
        )}
        {currentState === 'Cash_07' && (
          <Cash07Screen
            onFixAmount={() => setCurrentState('Cash_03')}
            onRegisterIncome={() => setCurrentState('Cash_02')}
          />
        )}
        {currentState === 'Cash_08' && (
          <Cash08Screen
            onLogin={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Cash_09' && (
          <Cash09Screen
            onChooseCategory={() => setCurrentState('Cash_03')}
            onCreateCategory={() => setCurrentState('Categories_03')}
          />
        )}
        {currentState === 'Cash_10' && (
          <Cash10Screen
            onViewCash={() => setCurrentState('Cash_01')}
            onRegisterAnother={() => setCurrentState('Cash_03')}
          />
        )}
        {currentState === 'Cash_11' && (
          <Cash11Screen
            onRetry={() => setCurrentState('Cash_03')}
            onCancel={() => setCurrentState('Cash_01')}
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
          />
        )}

        {/* ── BUDGETS MODULE ── */}
        {currentState === 'Budgets_01' && (
          <Budgets01Screen
            onBack={() => setCurrentState('Movements_01')}
            onCreate={() => setCurrentState('Budgets_04')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
        {currentState === 'Budgets_02' && (
          <Budgets02Screen
            onBack={() => setCurrentState('Movements_01')}
            onCreate={() => setCurrentState('Budgets_04')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
        {currentState === 'Budgets_03' && (
          <Budgets03Screen
            onBack={() => setCurrentState('Movements_01')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
        {currentState === 'Budgets_04' && (
          <Budgets04Screen
            onBack={() => setCurrentState('Budgets_01')}
            onCreate={() => openSimulatedSuccess('Budgets_09', 'Budgets_12')}
            onCancel={() => setCurrentState('Budgets_01')}
          />
        )}
        {currentState === 'Budgets_05' && (
          <Budgets05Screen
            onBack={() => setCurrentState('Budgets_06')}
            onSave={() => setCurrentState('Budgets_06')}
            onCancel={() => setCurrentState('Budgets_01')}
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
            onViewBudgets={() => setCurrentState('Budgets_01')}
            onCreateAnother={() => setCurrentState('Budgets_04')}
          />
        )}
        {currentState === 'Budgets_10' && (
          <Budgets10Screen
            onEditExisting={() => setCurrentState('Budgets_05')}
            onCancel={() => setCurrentState('Budgets_01')}
          />
        )}
        {currentState === 'Budgets_11' && (
          <Budgets11Screen
            onBack={() => setCurrentState('Budgets_04')}
            onSubmit={() => setCurrentState('Budgets_04')}
            onCancel={() => setCurrentState('Budgets_01')}
          />
        )}
        {currentState === 'Budgets_12' && (
          <Budgets12Screen
            onRetry={() => setCurrentState('Budgets_04')}
            onCancel={() => setCurrentState('Budgets_01')}
          />
        )}
        {currentState === 'Budgets_13' && (
          <Budgets13Screen
            onLogin={() => setCurrentState('Movements_01')}
          />
        )}

        {/* ── GOALS MODULE ── */}
        {currentState === 'Goals_01' && (
          <Goals01Screen
            onBack={() => setCurrentState('Movements_01')}
            onCreate={() => setCurrentState('Goals_05')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
        {currentState === 'Goals_02' && (
          <Goals02Screen
            onLogin={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Goals_03' && (
          <Goals03Screen onRetry={() => setCurrentState('Goals_01')} />
        )}
        {currentState === 'Goals_04' && (
          <Goals04Screen
            onViewGoal={() => setCurrentState('Goals_01')}
            onBackToGoals={() => setCurrentState('Goals_01')}
          />
        )}
        {currentState === 'Goals_05' && (
          <Goals05Screen
            onBack={() => setCurrentState('Goals_01')}
            onCreate={() => openSimulatedSuccess('Goals_04', 'Goals_08')}
            onCancel={() => setCurrentState('Goals_01')}
          />
        )}
        {currentState === 'Goals_06' && (
          <Goals06Screen
            onLogin={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Goals_07' && (
          <Goals07Screen onCorrect={() => setCurrentState('Goals_05')} />
        )}
        {currentState === 'Goals_08' && (
          <Goals08Screen onRetry={() => setCurrentState('Goals_05')} />
        )}
        {currentState === 'Goals_09' && (
          <Goals09Screen onBackToGoal={() => setCurrentState('Goals_01')} />
        )}
        {currentState === 'Goals_10' && (
          <Goals10Screen
            onBack={() => setCurrentState('Goals_01')}
            onSave={() => setCurrentState('Goals_09')}
            onCancel={() => setCurrentState('Goals_01')}
          />
        )}
        {currentState === 'Goals_11' && (
          <Goals11Screen
            onLogin={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Goals_12' && (
          <Goals12Screen
            onViewGoals={() => setCurrentState('Goals_01')}
            onGoHome={() => setCurrentState('Movements_01')}
          />
        )}
        {currentState === 'Goals_13' && (
          <Goals13Screen onRetry={() => setCurrentState('Goals_10')} />
        )}

        {/* ── Analytics Module (10 screens) ────────────────── */}
        {currentState === 'Analytics_01' && (
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
          />
        )}
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
            onRetry={() => setCurrentState('Analytics_01')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
        {currentState === 'Analytics_05' && (
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
          />
        )}
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
            onRetry={() => setCurrentState('Analytics_05')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
        {currentState === 'Analytics_08' && (
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
          />
        )}
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
            onRetry={() => setCurrentState('Analytics_08')}
            onTabPress={(tab) => {
              if (tab === 'inicio' || tab === 'movimientos') {
                setCurrentState('Movements_01');
              }
            }}
          />
        )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
  },
});
