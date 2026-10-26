// ============================================================
// Servicio del backoffice (personal: SOPORTE / OPERADOR_FINANCIERO / ADMIN)
// ============================================================
// Contratos verificados en `src/Nequi.Backoffice` y contra el gateway:
//   ADMIN        GET   /v1/admin/users | /users/{id} | /users/{id}/roles | /roles
//                PATCH /v1/admin/users/{id}/status
//                PUT   /v1/admin/users/{id}/roles
//   SOPORTE+     GET   /v1/support/cases | /cases/{id}
//                PATCH /v1/support/cases/{id}/status
//                POST  /v1/support/cases/{id}/messages | /assignments | /escalations
//                GET   /v1/support/clients/{id} | /clients/{id}/operations
//                GET   /v1/support/operations/{id} | /operations/{id}/timeline
//   OPERADOR     GET   /v1/financial-operations/{id} | /ledger | /audit
//                POST  /v1/financial-operations/{id}/reversals  (Idempotency-Key)
//                GET   /v1/reversals/{id}
//
// Reglas:
//   - Los roles y permisos los decide SIEMPRE el backend (403). La UI solo
//     oculta lo que no corresponde.
//   - El reverso exige `Idempotency-Key`; un reintento de la misma intención
//     reutiliza la clave y recibe el mismo resultado.
//   - Cambiar estado/roles o escalar no modifica saldos. Solo el reverso crea
//     una operación compensatoria; la original se conserva.

import type { HttpClient } from './http';
import {
  asRecord,
  requireBoolean,
  requireSafeInteger,
  requireString,
} from './contract';
import { requireIdempotencyKey } from './idempotency';
import {
  parseAuditEntry,
  parseCase,
  parseCaseMessage,
  parseClient,
  parseLedgerEntry,
  parseList,
  parseOperation,
  parseStringList,
  parseTimelineStep,
} from './mappers/backofficeMapper';
import { normalizeBaseUrl } from '../utils/url';
import type {
  AuditEntry,
  CaseMessage,
  ClientDto,
  LedgerEntryDto,
  OperationDto,
  SupportCase,
  TimelineStep,
} from '../types/backoffice';

export const BACKOFFICE_ROLES = ['CLIENTE', 'SOPORTE', 'OPERADOR_FINANCIERO', 'ADMIN'] as const;
export const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'CLOSED'] as const;
export const CASE_STATUSES = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'] as const;

export const USERS_MAX_PAGE_SIZE = 100;
export const CASES_DEFAULT_LIMIT = 100;
export const CASES_MAX_LIMIT = 200;
export const CLIENT_OPERATIONS_LIMIT = 50;
export const MAX_ID_LENGTH = 128;
export const MIN_ESCALATION_REASON = 3;
export const MAX_ESCALATION_REASON = 500;
export const MAX_CASE_MESSAGE_LENGTH = 2000;
export const MIN_REVERSAL_REASON = 5;
export const MAX_REVERSAL_REASON = 256;

export interface ReadOptions {
  readonly signal?: AbortSignal;
}

export interface MutationOptions {
  readonly signal?: AbortSignal;
}

export interface ReversalOptions {
  readonly idempotencyKey: string;
  readonly signal?: AbortSignal;
}

export interface UsersPage {
  readonly users: readonly ClientDto[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface UserWithRoles {
  readonly user: ClientDto;
  /** `null` si Identity Platform no pudo informar los roles. */
  readonly roles: readonly string[] | null;
}

export interface UserStatusChange {
  readonly userId: string;
  readonly previousStatus: string;
  readonly status: string;
}

export interface UserRoles {
  readonly userId: string;
  readonly roles: readonly string[];
}

export interface CaseDetail {
  readonly case: SupportCase;
  readonly messages: readonly CaseMessage[];
}

export interface ClientOperations {
  readonly clientId: string;
  readonly items: readonly OperationDto[];
}

export interface OperationTimeline {
  readonly operationId: string;
  readonly publicReference: string;
  readonly timeline: readonly TimelineStep[];
}

export interface OperationLedger {
  readonly operationId: string;
  readonly publicReference: string;
  readonly balanced: boolean;
  readonly entries: readonly LedgerEntryDto[];
}

export interface OperationAudit {
  readonly operationId: string;
  readonly entries: readonly AuditEntry[];
}

export interface AdminBackofficeService {
  listUsers(
    options?: ReadOptions & { page?: number; pageSize?: number; status?: string },
  ): Promise<UsersPage>;
  getUser(id: string, options?: ReadOptions): Promise<UserWithRoles>;
  setUserStatus(id: string, status: string, options?: MutationOptions): Promise<UserStatusChange>;
  listRoles(options?: ReadOptions): Promise<readonly string[]>;
  getUserRoles(id: string, options?: ReadOptions): Promise<UserRoles>;
  setUserRoles(id: string, roles: readonly string[], options?: MutationOptions): Promise<UserRoles>;
}

export interface CasesBackofficeService {
  list(options?: ReadOptions & { status?: string; limit?: number }): Promise<readonly SupportCase[]>;
  get(id: string, options?: ReadOptions): Promise<CaseDetail>;
  setStatus(id: string, status: string, options?: MutationOptions): Promise<SupportCase>;
  assign(id: string, assigneeId: string, options?: MutationOptions): Promise<SupportCase>;
  escalate(id: string, reason: string, options?: MutationOptions): Promise<SupportCase>;
  reply(id: string, body: string, options?: MutationOptions): Promise<CaseMessage>;
}

export interface SupportBackofficeService {
  getClient(id: string, options?: ReadOptions): Promise<ClientDto>;
  listClientOperations(id: string, options?: ReadOptions): Promise<ClientOperations>;
  getOperation(id: string, options?: ReadOptions): Promise<OperationDto>;
  getTimeline(id: string, options?: ReadOptions): Promise<OperationTimeline>;
}

export interface FinanceBackofficeService {
  getOperation(id: string, options?: ReadOptions): Promise<OperationDto>;
  getLedger(id: string, options?: ReadOptions): Promise<OperationLedger>;
  getAudit(id: string, options?: ReadOptions): Promise<OperationAudit>;
  createReversal(operationId: string, reason: string, options: ReversalOptions): Promise<OperationDto>;
  getReversal(id: string, options?: ReadOptions): Promise<OperationDto>;
}

export interface BackofficeService {
  readonly admin: AdminBackofficeService;
  readonly cases: CasesBackofficeService;
  readonly support: SupportBackofficeService;
  readonly finance: FinanceBackofficeService;
}

// ───────── validación de entradas ─────────

function requireId(value: string, label: string): string {
  const id = (value ?? '').trim();
  if (id.length === 0) throw new Error(`${label} es obligatorio.`);
  if (id.length > MAX_ID_LENGTH) throw new Error(`${label} supera la longitud permitida.`);
  return id;
}

function requireOneOfInput<T extends string>(value: string, allowed: readonly T[], label: string): T {
  const normalized = (value ?? '').trim().toUpperCase();
  if (!(allowed as readonly string[]).includes(normalized)) {
    throw new Error(`${label} debe ser uno de: ${allowed.join(', ')}.`);
  }
  return normalized as T;
}

function requireText(value: string, min: number, max: number, label: string): string {
  const text = (value ?? '').trim();
  if (text.length < min) {
    throw new Error(
      min === 1 ? `${label} es obligatorio.` : `${label} debe tener al menos ${min} caracteres.`,
    );
  }
  if (text.length > max) throw new Error(`${label} no puede exceder ${max} caracteres.`);
  return text;
}

function requireRange(value: number, min: number, max: number, label: string): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label} debe estar entre ${min} y ${max}.`);
  }
  return value;
}

const seg = encodeURIComponent;

export function createBackofficeService(http: HttpClient): BackofficeService {
  if (!normalizeBaseUrl(http.baseUrl)) {
    throw new Error('createBackofficeService: cliente HTTP sin URL base válida.');
  }

  const admin: AdminBackofficeService = {
    async listUsers(options = {}) {
      const page = requireRange(options.page ?? 1, 1, Number.MAX_SAFE_INTEGER, 'page');
      const pageSize = requireRange(options.pageSize ?? 20, 1, USERS_MAX_PAGE_SIZE, 'pageSize');
      const status = options.status ? requireOneOfInput(options.status, USER_STATUSES, 'status') : undefined;
      const dto = asRecord(
        await http.get<unknown>('/v1/admin/users', {
          query: { page, pageSize, status },
          signal: options.signal,
        }),
        'users',
      );
      return {
        users: parseList(dto, 'users', parseClient),
        page: requireSafeInteger(dto, 'page', { min: 1 }),
        pageSize: requireSafeInteger(dto, 'pageSize', { min: 1 }),
        total: requireSafeInteger(dto, 'total', { min: 0 }),
      };
    },

    async getUser(id, options = {}) {
      const dto = asRecord(
        await http.get<unknown>(`/v1/admin/users/${seg(requireId(id, 'El usuario'))}`, {
          signal: options.signal,
        }),
        'user',
      );
      const roles = dto.roles === null || dto.roles === undefined ? null : parseStringList(dto, 'roles');
      return { user: parseClient(dto.user), roles };
    },

    async setUserStatus(id, status, options = {}) {
      const next = requireOneOfInput(status, USER_STATUSES, 'El estado');
      const dto = asRecord(
        await http.patch<unknown>(
          `/v1/admin/users/${seg(requireId(id, 'El usuario'))}/status`,
          { status: next },
          { signal: options.signal },
        ),
        'userStatus',
      );
      return {
        userId: requireString(dto, 'userId'),
        previousStatus: requireString(dto, 'previousStatus'),
        status: requireString(dto, 'status'),
      };
    },

    async listRoles(options = {}) {
      const dto = asRecord(await http.get<unknown>('/v1/admin/roles', { signal: options.signal }), 'roles');
      return parseStringList(dto, 'roles');
    },

    async getUserRoles(id, options = {}) {
      const dto = asRecord(
        await http.get<unknown>(`/v1/admin/users/${seg(requireId(id, 'El usuario'))}/roles`, {
          signal: options.signal,
        }),
        'userRoles',
      );
      return { userId: requireString(dto, 'userId'), roles: parseStringList(dto, 'roles') };
    },

    async setUserRoles(id, roles, options = {}) {
      const unique = Array.from(
        new Set(roles.map((role) => requireOneOfInput(role, BACKOFFICE_ROLES, 'Cada rol'))),
      );
      if (unique.length === 0) throw new Error('Debes asignar al menos un rol.');
      const dto = asRecord(
        await http.put<unknown>(
          `/v1/admin/users/${seg(requireId(id, 'El usuario'))}/roles`,
          { roles: unique },
          { signal: options.signal },
        ),
        'userRoles',
      );
      return { userId: requireString(dto, 'userId'), roles: parseStringList(dto, 'roles') };
    },
  };

  const cases: CasesBackofficeService = {
    async list(options = {}) {
      const limit = requireRange(options.limit ?? CASES_DEFAULT_LIMIT, 1, CASES_MAX_LIMIT, 'limit');
      const status = options.status ? requireOneOfInput(options.status, CASE_STATUSES, 'status') : undefined;
      const dto = asRecord(
        await http.get<unknown>('/v1/support/cases', { query: { status, limit }, signal: options.signal }),
        'cases',
      );
      return parseList(dto, 'items', parseCase);
    },

    async get(id, options = {}) {
      const dto = asRecord(
        await http.get<unknown>(`/v1/support/cases/${seg(requireId(id, 'El caso'))}`, { signal: options.signal }),
        'caseDetail',
      );
      return { case: parseCase(dto.case), messages: parseList(dto, 'messages', parseCaseMessage) };
    },

    async setStatus(id, status, options = {}) {
      const next = requireOneOfInput(status, CASE_STATUSES, 'El estado');
      return parseCase(
        await http.patch<unknown>(
          `/v1/support/cases/${seg(requireId(id, 'El caso'))}/status`,
          { status: next },
          { signal: options.signal },
        ),
      );
    },

    async assign(id, assigneeId, options = {}) {
      return parseCase(
        await http.post<unknown>(
          `/v1/support/cases/${seg(requireId(id, 'El caso'))}/assignments`,
          { assigneeId: requireId(assigneeId, 'El responsable') },
          { signal: options.signal },
        ),
      );
    },

    async escalate(id, reason, options = {}) {
      return parseCase(
        await http.post<unknown>(
          `/v1/support/cases/${seg(requireId(id, 'El caso'))}/escalations`,
          { reason: requireText(reason, MIN_ESCALATION_REASON, MAX_ESCALATION_REASON, 'El motivo') },
          { signal: options.signal },
        ),
      );
    },

    async reply(id, body, options = {}) {
      return parseCaseMessage(
        await http.post<unknown>(
          `/v1/support/cases/${seg(requireId(id, 'El caso'))}/messages`,
          { body: requireText(body, 1, MAX_CASE_MESSAGE_LENGTH, 'El mensaje') },
          { signal: options.signal },
        ),
      );
    },
  };

  const support: SupportBackofficeService = {
    async getClient(id, options = {}) {
      return parseClient(
        await http.get<unknown>(`/v1/support/clients/${seg(requireId(id, 'El cliente'))}`, {
          signal: options.signal,
        }),
      );
    },

    async listClientOperations(id, options = {}) {
      const dto = asRecord(
        await http.get<unknown>(`/v1/support/clients/${seg(requireId(id, 'El cliente'))}/operations`, {
          query: { limit: CLIENT_OPERATIONS_LIMIT },
          signal: options.signal,
        }),
        'clientOperations',
      );
      return { clientId: requireString(dto, 'clientId'), items: parseList(dto, 'items', parseOperation) };
    },

    async getOperation(id, options = {}) {
      return parseOperation(
        await http.get<unknown>(`/v1/support/operations/${seg(requireId(id, 'La operación'))}`, {
          signal: options.signal,
        }),
      );
    },

    async getTimeline(id, options = {}) {
      const dto = asRecord(
        await http.get<unknown>(`/v1/support/operations/${seg(requireId(id, 'La operación'))}/timeline`, {
          signal: options.signal,
        }),
        'timeline',
      );
      return {
        operationId: requireString(dto, 'operationId'),
        publicReference: requireString(dto, 'publicReference'),
        timeline: parseList(dto, 'timeline', parseTimelineStep),
      };
    },
  };

  const finance: FinanceBackofficeService = {
    async getOperation(id, options = {}) {
      return parseOperation(
        await http.get<unknown>(`/v1/financial-operations/${seg(requireId(id, 'La operación'))}`, {
          signal: options.signal,
        }),
      );
    },

    async getLedger(id, options = {}) {
      const dto = asRecord(
        await http.get<unknown>(`/v1/financial-operations/${seg(requireId(id, 'La operación'))}/ledger`, {
          signal: options.signal,
        }),
        'ledger',
      );
      return {
        operationId: requireString(dto, 'operationId'),
        publicReference: requireString(dto, 'publicReference'),
        balanced: requireBoolean(dto, 'balanced'),
        entries: parseList(dto, 'ledgerEntries', parseLedgerEntry),
      };
    },

    async getAudit(id, options = {}) {
      const dto = asRecord(
        await http.get<unknown>(`/v1/financial-operations/${seg(requireId(id, 'La operación'))}/audit`, {
          signal: options.signal,
        }),
        'audit',
      );
      return {
        operationId: requireString(dto, 'operationId'),
        entries: parseList(dto, 'auditEntries', parseAuditEntry),
      };
    },

    async createReversal(operationId, reason, options) {
      const idempotencyKey = requireIdempotencyKey(options.idempotencyKey);
      return parseOperation(
        await http.post<unknown>(
          `/v1/financial-operations/${seg(requireId(operationId, 'La operación'))}/reversals`,
          { reason: requireText(reason, MIN_REVERSAL_REASON, MAX_REVERSAL_REASON, 'El motivo') },
          { idempotencyKey, signal: options.signal },
        ),
      );
    },

    async getReversal(id, options = {}) {
      return parseOperation(
        await http.get<unknown>(`/v1/reversals/${seg(requireId(id, 'El reverso'))}`, { signal: options.signal }),
      );
    },
  };

  return { admin, cases, support, finance };
}
