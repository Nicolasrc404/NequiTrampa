// ============================================================
// Factoría de servicios por dominio
// ============================================================
// Recibe un `HttpClient` ya autenticado. No importa `api.ts`, por lo que puede
// probarse con un cliente falso sin cargar Expo ni React Native.

import type { HttpClient } from './http';
import { createWalletService, type WalletService } from './walletService';
import {
  createMovementsService,
  type MovementsService,
} from './movementsService';
import {
  createTransfersService,
  type TransfersService,
} from './transfersService';
import {
  createRechargesService,
  type RechargesService,
} from './rechargesService';
import { createProfileService, type ProfileService } from './profileService';
import {
  createAssistantService,
  type AssistantService,
} from './assistantService';
import {
  createBeneficiariesService,
  type BeneficiariesService,
} from './beneficiariesService';
import {
  createCategoriesService,
  type CategoriesService,
} from './categoriesService';
import { createCashService, type CashService } from './cashService';
import { createBudgetsService, type BudgetsService } from './budgetsService';
import { createGoalsService, type GoalsService } from './goalsService';
import {
  createAnalyticsService,
  type AnalyticsService,
} from './analyticsService';

export interface ApiServices {
  readonly wallet: WalletService;
  readonly movements: MovementsService;
  readonly transfers: TransfersService;
  readonly recharges: RechargesService;
  readonly profile: ProfileService;
  readonly assistant: AssistantService;
  readonly beneficiaries: BeneficiariesService;
  readonly categories: CategoriesService;
  readonly cash: CashService;
  readonly budgets: BudgetsService;
  readonly goals: GoalsService;
  readonly analytics: AnalyticsService;
}

export function createApiServices(http: HttpClient): ApiServices {
  return {
    wallet: createWalletService(http),
    movements: createMovementsService(http),
    transfers: createTransfersService(http),
    recharges: createRechargesService(http),
    profile: createProfileService(http),
    assistant: createAssistantService(http),
    beneficiaries: createBeneficiariesService(http),
    categories: createCategoriesService(http),
    cash: createCashService(http),
    budgets: createBudgetsService(http),
    goals: createGoalsService(http),
    analytics: createAnalyticsService(http),
  };
}
