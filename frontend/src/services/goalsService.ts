// ============================================================
// Servicio de metas de ahorro
// ============================================================
// Contrato verificado en `src/Nequi.Finance/Goals/GoalsController.cs`:
//   GET   /v1/goals        -> GoalDto[]
//   GET   /v1/goals/{id}   -> GoalDto
//   POST  /v1/goals        -> 201 GoalDto
//   PATCH /v1/goals/{id}   -> GoalDto
//
// `savedCents` es progreso informativo DECLARADO por el cliente. No reserva,
// transfiere ni bloquea dinero y no crea asientos contables. El frontend debe
// mostrarlo como referencia, nunca como saldo apartado ni ejecutar
// transferencias automáticas hacia la meta.

import type { HttpClient } from './http';
import {
  asRecord,
  requireBoolean,
  requireSafeInteger,
  requireString,
  ServiceContractError,
} from './contract';
import { normalizeBaseUrl } from '../utils/url';

export const MAX_GOAL_NAME_LENGTH = 80;
export const MIN_GOAL_NAME_LENGTH = 2;
export const MAX_GOAL_CENTS = 1_000_000_000_000;

export interface GoalDto {
  readonly id: string;
  readonly name: string;
  readonly targetCents: number;
  /** Progreso declarado, solo informativo. */
  readonly savedCents: number;
  readonly percent: number;
  readonly isAchieved: boolean;
  readonly targetDate: string;
  readonly daysRemaining: number;
  readonly currency: 'COP';
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateGoalInput {
  readonly name: string;
  readonly targetCents: number;
  readonly targetDate: string;
}

export interface UpdateGoalInput {
  readonly name?: string;
  readonly targetCents?: number;
  readonly targetDate?: string;
  readonly savedCents?: number;
}

export interface GoalRequestOptions {
  readonly signal?: AbortSignal;
}

export interface GoalsService {
  list(options?: GoalRequestOptions): Promise<readonly GoalDto[]>;
  getById(id: string, options?: GoalRequestOptions): Promise<GoalDto>;
  create(input: CreateGoalInput, options?: GoalRequestOptions): Promise<GoalDto>;
  update(
    id: string,
    input: UpdateGoalInput,
    options?: GoalRequestOptions,
  ): Promise<GoalDto>;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

export function normalizeGoalName(value: string): string {
  const collapsed = (value ?? '').trim().replace(/\s+/g, ' ');
  if (
    collapsed.length < MIN_GOAL_NAME_LENGTH ||
    collapsed.length > MAX_GOAL_NAME_LENGTH ||
    CONTROL_CHARACTERS.test(collapsed)
  ) {
    throw new Error(
      `El nombre debe tener entre ${MIN_GOAL_NAME_LENGTH} y ${MAX_GOAL_NAME_LENGTH} caracteres imprimibles.`,
    );
  }
  return collapsed;
}

export function requireGoalTargetCents(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_GOAL_CENTS) {
    throw new Error('El objetivo debe ser un valor positivo en centavos de COP.');
  }
  return value;
}

export function requireGoalSavedCents(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_GOAL_CENTS) {
    throw new Error('El ahorro declarado no puede ser negativo.');
  }
  return value;
}

export function requireGoalTargetDate(value: string): string {
  const date = (value ?? '').trim();
  if (!DATE_PATTERN.test(date)) {
    throw new Error('La fecha objetivo debe usar el formato YYYY-MM-DD.');
  }
  return date;
}

function requireIdentifier(id: string): string {
  const reference = (id ?? '').trim();
  if (reference.length === 0) {
    throw new Error('La meta requiere un identificador.');
  }
  return reference;
}

function parseGoal(payload: unknown): GoalDto {
  const dto = asRecord(payload, 'goal');
  const currency = requireString(dto, 'currency');
  if (currency !== 'COP') {
    throw new ServiceContractError(
      'La meta no está denominada en COP.',
      'currency',
    );
  }
  return {
    id: requireString(dto, 'id'),
    name: requireString(dto, 'name'),
    targetCents: requireSafeInteger(dto, 'targetCents', { min: 1 }),
    savedCents: requireSafeInteger(dto, 'savedCents', { min: 0 }),
    percent: requireSafeInteger(dto, 'percent', { min: 0, max: 100 }),
    isAchieved: requireBoolean(dto, 'isAchieved'),
    targetDate: requireString(dto, 'targetDate'),
    daysRemaining: requireSafeInteger(dto, 'daysRemaining', { min: 0 }),
    currency: 'COP',
    active: requireBoolean(dto, 'active'),
    createdAt: requireString(dto, 'createdAt'),
    updatedAt: requireString(dto, 'updatedAt'),
  };
}

export function createGoalsService(http: HttpClient): GoalsService {
  if (!normalizeBaseUrl(http.baseUrl)) {
    throw new Error('createGoalsService: cliente HTTP sin URL base válida.');
  }

  return {
    async list(options = {}) {
      const payload = await http.get<unknown>('/v1/goals', {
        signal: options.signal,
      });
      if (!Array.isArray(payload)) {
        throw new ServiceContractError(
          'El listado de metas no es una lista.',
          'goals',
        );
      }
      return payload.map(parseGoal);
    },

    async getById(id, options) {
      const reference = requireIdentifier(id);
      const payload = await http.get<unknown>(
        `/v1/goals/${encodeURIComponent(reference)}`,
        { signal: options?.signal },
      );
      return parseGoal(payload);
    },

    async create(input, options) {
      const name = normalizeGoalName(input.name);
      const targetCents = requireGoalTargetCents(input.targetCents);
      const targetDate = requireGoalTargetDate(input.targetDate);
      const payload = await http.post<unknown>(
        '/v1/goals',
        { name, targetCents, targetDate },
        { signal: options?.signal },
      );
      return parseGoal(payload);
    },

    async update(id, input, options) {
      const reference = requireIdentifier(id);
      const body: Record<string, string | number> = {};
      if (input.name !== undefined) body.name = normalizeGoalName(input.name);
      if (input.targetCents !== undefined) {
        body.targetCents = requireGoalTargetCents(input.targetCents);
      }
      if (input.targetDate !== undefined) {
        body.targetDate = requireGoalTargetDate(input.targetDate);
      }
      if (input.savedCents !== undefined) {
        body.savedCents = requireGoalSavedCents(input.savedCents);
      }
      if (Object.keys(body).length === 0) {
        throw new Error('La edición requiere al menos un campo.');
      }
      const payload = await http.patch<unknown>(
        `/v1/goals/${encodeURIComponent(reference)}`,
        body,
        { signal: options?.signal },
      );
      return parseGoal(payload);
    },
  };
}
