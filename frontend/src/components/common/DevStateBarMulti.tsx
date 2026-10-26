// ============================================================
// DevStateBarMulti — Barra de previsualización DEV multi-módulo
// Soporta: Movements (8) + Beneficiaries (14) + Categories (8) + Transfers (22) + Recharges (10) + Cash (12) + Budgets (13) + Goals (13)
// ⚠️ SOLO PARA DESARROLLO — No usar en producción
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import colors from '../../theme/colors';
import { MovementsState } from '../../types/movements';
import { BeneficiariesState } from '../../types/beneficiaries';
import { CategoriesState } from '../../types/categories';
import { TransfersState } from '../../types/transfers';
import { RechargesState } from '../../types/recharges';
import { CashState } from '../../types/cash';
import { BudgetsState } from '../../types/budgets';
import { GoalsState } from '../../types/goals';
import { AnalyticsState } from '../../types/analytics';

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
type ActiveModule =
  | 'movements'
  | 'beneficiaries'
  | 'categories'
  | 'transfers'
  | 'recharges'
  | 'cash'
  | 'budgets'
  | 'goals'
  | 'analytics';

const getModuleFromState = (state: AppState): ActiveModule => {
  if (state.startsWith('Beneficiaries')) {
    return 'beneficiaries';
  }
  if (state.startsWith('Categories')) {
    return 'categories';
  }
  if (state.startsWith('Transfers')) {
    return 'transfers';
  }
  if (state.startsWith('Recharges')) {
    return 'recharges';
  }
  if (state.startsWith('Cash')) {
    return 'cash';
  }
  if (state.startsWith('Budgets')) {
    return 'budgets';
  }
  if (state.startsWith('Goals')) {
    return 'goals';
  }
  if (state.startsWith('Analytics')) {
    return 'analytics';
  }
  return 'movements';
};

interface DevStateBarMultiProps {
  currentState: AppState;
  onSelectState: (state: AppState) => void;
}

const MOVEMENTS_STATES: { key: MovementsState; label: string }[] = [
  { key: 'Movements_01', label: '01 Lista' },
  { key: 'Movements_02', label: '02 Vacío' },
  { key: 'Movements_03', label: '03 Skel.' },
  { key: 'Movements_04', label: '04 Filtros' },
  { key: 'Movements_05', label: '05 Detalle' },
  { key: 'Movements_06', label: '06 404' },
  { key: 'Movements_07', label: '07 401' },
  { key: 'Movements_08', label: '08 503' },
];

const BENEFICIARIES_STATES: { key: BeneficiariesState; label: string }[] = [
  { key: 'Beneficiaries_01', label: 'B01 Lista' },
  { key: 'Beneficiaries_02', label: 'B02 Vacío' },
  { key: 'Beneficiaries_03', label: 'B03 Skel.' },
  { key: 'Beneficiaries_04', label: 'B04 Form' },
  { key: 'Beneficiaries_05', label: 'B05 201' },
  { key: 'Beneficiaries_06', label: 'B06 400' },
  { key: 'Beneficiaries_07', label: 'B07 404' },
  { key: 'Beneficiaries_08', label: 'B08 409' },
  { key: 'Beneficiaries_09', label: 'B09 422' },
  { key: 'Beneficiaries_10', label: 'B10 Del' },
  { key: 'Beneficiaries_11', label: 'B11 401' },
  { key: 'Beneficiaries_12', label: 'B12 401v' },
  { key: 'Beneficiaries_13', label: 'B13 500' },
  { key: 'Beneficiaries_14', label: 'B14 Conf' },
];

const CATEGORIES_STATES: { key: CategoriesState; label: string }[] = [
  { key: 'Categories_01', label: 'C01 Lista' },
  { key: 'Categories_02', label: 'C02 Vacío' },
  { key: 'Categories_03', label: 'C03 Crear' },
  { key: 'Categories_04', label: 'C04 Editar' },
  { key: 'Categories_05', label: 'C05 201' },
  { key: 'Categories_06', label: 'C06 409' },
  { key: 'Categories_07', label: 'C07 422' },
  { key: 'Categories_08', label: 'C08 Eliminar' },
];

const TRANSFERS_STATES: { key: TransfersState; label: string }[] = [
  { key: 'Transfers_01', label: 'T01 Enviar' },
  { key: 'Transfers_02', label: 'T02 Dest.' },
  { key: 'Transfers_03', label: 'T03 Enviando' },
  { key: 'Transfers_04', label: 'T04 201' },
  { key: 'Transfers_05', label: 'T05 400' },
  { key: 'Transfers_06', label: 'T06 401' },
  { key: 'Transfers_07', label: 'T07 404' },
  { key: 'Transfers_08', label: 'T08 409' },
  { key: 'Transfers_09', label: 'T09 422' },
  { key: 'Transfers_10', label: 'T10 Límite' },
  { key: 'Transfers_11', label: 'T11 Límite' },
  { key: 'Transfers_12', label: 'T12 429' },
  { key: 'Transfers_13', label: 'T13 500' },
  { key: 'Transfers_14', label: 'T14 503' },
  { key: 'Transfers_15', label: 'T15 Hist.' },
  { key: 'Transfers_16', label: 'T16 Vacío' },
  { key: 'Transfers_17', label: 'T17 Skel.' },
  { key: 'Transfers_18', label: 'T18 503' },
  { key: 'Transfers_19', label: 'T19 Detalle' },
  { key: 'Transfers_20', label: 'T20 404' },
  { key: 'Transfers_21', label: 'T21 403' },
  { key: 'Transfers_22', label: 'T22 Recibo' },
];

const CASH_STATES: { key: CashState; label: string }[] = [
  { key: 'Cash_01', label: 'E01 Efectivo' },
  { key: 'Cash_02', label: 'E02 Ingreso' },
  { key: 'Cash_03', label: 'E03 Gasto' },
  { key: 'Cash_04', label: 'E04 201 Ing.' },
  { key: 'Cash_05', label: 'E05 201 Gasto' },
  { key: 'Cash_06', label: 'E06 400' },
  { key: 'Cash_07', label: 'E07 422' },
  { key: 'Cash_08', label: 'E08 401' },
  { key: 'Cash_09', label: 'E09 404' },
  { key: 'Cash_10', label: 'E10 409' },
  { key: 'Cash_11', label: 'E11 500' },
  { key: 'Cash_12', label: 'E12 Hist.' },
];

const BUDGETS_STATES: { key: BudgetsState; label: string }[] = [
  { key: 'Budgets_01', label: 'P01 Lista' },
  { key: 'Budgets_02', label: 'P02 Vacío' },
  { key: 'Budgets_03', label: 'P03 Skel.' },
  { key: 'Budgets_04', label: 'P04 Crear' },
  { key: 'Budgets_05', label: 'P05 Editar' },
  { key: 'Budgets_06', label: 'P06 Detalle' },
  { key: 'Budgets_07', label: 'P07 80%' },
  { key: 'Budgets_08', label: 'P08 Superado' },
  { key: 'Budgets_09', label: 'P09 201' },
  { key: 'Budgets_10', label: 'P10 409' },
  { key: 'Budgets_11', label: 'P11 422' },
  { key: 'Budgets_12', label: 'P12 500' },
  { key: 'Budgets_13', label: 'P13 401' },
];

const GOALS_STATES: { key: GoalsState; label: string }[] = [
  { key: 'Goals_01', label: 'M01 Lista' },
  { key: 'Goals_02', label: 'M02 401' },
  { key: 'Goals_03', label: 'M03 500' },
  { key: 'Goals_04', label: 'M04 201' },
  { key: 'Goals_05', label: 'M05 Crear' },
  { key: 'Goals_06', label: 'M06 401' },
  { key: 'Goals_07', label: 'M07 422' },
  { key: 'Goals_08', label: 'M08 500' },
  { key: 'Goals_09', label: 'M09 200' },
  { key: 'Goals_10', label: 'M10 Editar' },
  { key: 'Goals_11', label: 'M11 401' },
  { key: 'Goals_12', label: 'M12 404' },
  { key: 'Goals_13', label: 'M13 500' },
];

const RECHARGES_STATES: { key: RechargesState; label: string }[] = [
  { key: 'Recharges_01', label: 'R01 Recargar' },
  { key: 'Recharges_02', label: 'R02 201' },
  { key: 'Recharges_03', label: 'R03 400' },
  { key: 'Recharges_04', label: 'R04 401' },
  { key: 'Recharges_05', label: 'R05 422' },
  { key: 'Recharges_06', label: 'R06 429' },
  { key: 'Recharges_07', label: 'R07 500/503' },
  { key: 'Recharges_08', label: 'R08 Hist.' },
  { key: 'Recharges_09', label: 'R09 Vacío' },
  { key: 'Recharges_10', label: 'R10 Vacío' },
];

const ANALYTICS_STATES: { key: AnalyticsState; label: string }[] = [
  { key: 'Analytics_01', label: 'A01 Resumen' },
  { key: 'Analytics_02', label: 'A02 Periodo Err' },
  { key: 'Analytics_03', label: 'A03 401 Res' },
  { key: 'Analytics_04', label: 'A04 500 Res' },
  { key: 'Analytics_05', label: 'A05 Categorías' },
  { key: 'Analytics_06', label: 'A06 401 Cat' },
  { key: 'Analytics_07', label: 'A07 500 Cat' },
  { key: 'Analytics_08', label: 'A08 Tendencias' },
  { key: 'Analytics_09', label: 'A09 401 Tend' },
  { key: 'Analytics_10', label: 'A10 500 Tend' },
];

export const DevStateBarMulti: React.FC<DevStateBarMultiProps> = ({
  currentState,
  onSelectState,
}) => {
  const [activeModule, setActiveModule] = useState<ActiveModule>(
    getModuleFromState(currentState),
  );

  useEffect(() => {
    setActiveModule(getModuleFromState(currentState));
  }, [currentState]);

  const currentStates =
    activeModule === 'movements'
      ? MOVEMENTS_STATES
      : activeModule === 'beneficiaries'
        ? BENEFICIARIES_STATES
        : activeModule === 'categories'
          ? CATEGORIES_STATES
          : activeModule === 'recharges'
            ? RECHARGES_STATES
            : activeModule === 'cash'
              ? CASH_STATES
              : activeModule === 'budgets'
                ? BUDGETS_STATES
                : activeModule === 'goals'
                  ? GOALS_STATES
                  : activeModule === 'analytics'
                    ? ANALYTICS_STATES
                    : TRANSFERS_STATES;

  const handleModuleSwitch = (mod: ActiveModule) => {
    setActiveModule(mod);
    // Auto-navigate to first state of the module
    if (mod === 'movements') {
      onSelectState('Movements_01');
    } else if (mod === 'beneficiaries') {
      onSelectState('Beneficiaries_01');
    } else if (mod === 'categories') {
      onSelectState('Categories_01');
    } else if (mod === 'recharges') {
      onSelectState('Recharges_01');
    } else if (mod === 'cash') {
      onSelectState('Cash_01');
    } else if (mod === 'budgets') {
      onSelectState('Budgets_01');
    } else if (mod === 'goals') {
      onSelectState('Goals_01');
    } else if (mod === 'analytics') {
      onSelectState('Analytics_01');
    } else {
      onSelectState('Transfers_01');
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Top info row */}
      <View style={styles.topInfo}>
        <View style={styles.devTag}>
          <Text style={styles.devTagText}>STITCH DEMO PREVIEW</Text>
        </View>
        <Text style={styles.statusText}>{currentState}</Text>
      </View>

      {/* Module selector tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.moduleScroll}
        contentContainerStyle={styles.moduleTabs}
      >
        <TouchableOpacity
          style={[
            styles.moduleTab,
            activeModule === 'movements' && styles.moduleTabActive,
          ]}
          activeOpacity={0.7}
          onPress={() => handleModuleSwitch('movements')}
        >
          <Text
            style={[
              styles.moduleTabText,
              activeModule === 'movements' && styles.moduleTabTextActive,
            ]}
          >
            Movimientos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.moduleTab,
            activeModule === 'beneficiaries' && styles.moduleTabActive,
          ]}
          activeOpacity={0.7}
          onPress={() => handleModuleSwitch('beneficiaries')}
        >
          <Text
            style={[
              styles.moduleTabText,
              activeModule === 'beneficiaries' && styles.moduleTabTextActive,
            ]}
          >
            Beneficiarios
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.moduleTab,
            activeModule === 'categories' && styles.moduleTabActive,
          ]}
          activeOpacity={0.7}
          onPress={() => handleModuleSwitch('categories')}
        >
          <Text
            style={[
              styles.moduleTabText,
              activeModule === 'categories' && styles.moduleTabTextActive,
            ]}
          >
            Categorías
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.moduleTab,
            activeModule === 'transfers' && styles.moduleTabActive,
          ]}
          activeOpacity={0.7}
          onPress={() => handleModuleSwitch('transfers')}
        >
          <Text
            style={[
              styles.moduleTabText,
              activeModule === 'transfers' && styles.moduleTabTextActive,
            ]}
          >
            Transferencias
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.moduleTab,
            activeModule === 'recharges' && styles.moduleTabActive,
          ]}
          activeOpacity={0.7}
          onPress={() => handleModuleSwitch('recharges')}
        >
          <Text
            style={[
              styles.moduleTabText,
              activeModule === 'recharges' && styles.moduleTabTextActive,
            ]}
          >
            Recargas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.moduleTab,
            activeModule === 'cash' && styles.moduleTabActive,
          ]}
          activeOpacity={0.7}
          onPress={() => handleModuleSwitch('cash')}
        >
          <Text
            style={[
              styles.moduleTabText,
              activeModule === 'cash' && styles.moduleTabTextActive,
            ]}
          >
            Efectivo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.moduleTab,
            activeModule === 'budgets' && styles.moduleTabActive,
          ]}
          activeOpacity={0.7}
          onPress={() => handleModuleSwitch('budgets')}
        >
          <Text
            style={[
              styles.moduleTabText,
              activeModule === 'budgets' && styles.moduleTabTextActive,
            ]}
          >
            Presupuestos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.moduleTab,
            activeModule === 'goals' && styles.moduleTabActive,
          ]}
          activeOpacity={0.7}
          onPress={() => handleModuleSwitch('goals')}
        >
          <Text
            style={[
              styles.moduleTabText,
              activeModule === 'goals' && styles.moduleTabTextActive,
            ]}
          >
            Metas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.moduleTab,
            activeModule === 'analytics' && styles.moduleTabActive,
          ]}
          activeOpacity={0.7}
          onPress={() => handleModuleSwitch('analytics')}
        >
          <Text
            style={[
              styles.moduleTabText,
              activeModule === 'analytics' && styles.moduleTabTextActive,
            ]}
          >
            Analytics
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* State selector pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {currentStates.map((s) => {
          const isActive = currentState === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.btn, isActive && styles.btnActive]}
              activeOpacity={0.7}
              onPress={() => onSelectState(s.key)}
            >
              <Text
                style={[styles.btnText, isActive && styles.btnTextActive]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0F0926',
    paddingTop: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#281C4F',
    zIndex: 999,
  },
  topInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  devTag: {
    backgroundColor: colors.magenta,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  devTagText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusText: {
    color: '#A59EC2',
    fontSize: 10,
    fontWeight: '600',
  },
  moduleScroll: {
    marginBottom: 4,
    flexGrow: 0,
  },
  moduleTabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
  },
  moduleTab: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1E153E',
    borderWidth: 1,
    borderColor: '#2E2050',
  },
  moduleTabActive: {
    backgroundColor: '#3D2A7A',
    borderColor: '#7C5CBF',
  },
  moduleTabText: {
    color: '#D1CEE2',
    fontSize: 11,
    fontWeight: '600',
  },
  moduleTabTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1E153E',
  },
  btnActive: {
    backgroundColor: colors.magenta,
  },
  btnText: {
    color: '#D1CEE2',
    fontSize: 11,
    fontWeight: '600',
  },
  btnTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
});

export default DevStateBarMulti;
