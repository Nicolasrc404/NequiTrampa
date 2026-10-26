import { newIdempotencyKey, request } from './http';
import {
  AuditEntry,
  CaseMessage,
  ClientDto,
  LedgerEntryDto,
  OperationDto,
  SupportCase,
  TimelineStep,
} from '../types/backoffice';

const enc = encodeURIComponent;

export const adminApi = {
  users: (page = 1, pageSize = 20, status?: string) =>
    request<{ users: ClientDto[]; page: number; pageSize: number; total: number }>('/v1/admin/users', {
      query: { page, pageSize, status },
    }),
  user: (id: string) => request<{ user: ClientDto; roles: string[] | null }>(`/v1/admin/users/${enc(id)}`),
  setStatus: (id: string, status: string) =>
    request<{ userId: string; previousStatus: string; status: string }>(`/v1/admin/users/${enc(id)}/status`, {
      method: 'PATCH',
      body: { status },
    }),
  roles: () => request<{ roles: string[] }>('/v1/admin/roles'),
  userRoles: (id: string) => request<{ userId: string; roles: string[] }>(`/v1/admin/users/${enc(id)}/roles`),
  setRoles: (id: string, roles: string[]) =>
    request<{ userId: string; roles: string[] }>(`/v1/admin/users/${enc(id)}/roles`, { method: 'PUT', body: { roles } }),
};

export const casesApi = {
  list: (status?: string) =>
    request<{ count: number; items: SupportCase[] }>('/v1/support/cases', { query: { status, limit: 100 } }),
  get: (id: string) => request<{ case: SupportCase; messages: CaseMessage[] }>(`/v1/support/cases/${enc(id)}`),
  setStatus: (id: string, status: string) =>
    request<SupportCase>(`/v1/support/cases/${enc(id)}/status`, { method: 'PATCH', body: { status } }),
  assign: (id: string, assigneeId: string) =>
    request<SupportCase>(`/v1/support/cases/${enc(id)}/assignments`, { method: 'POST', body: { assigneeId } }),
  escalate: (id: string, reason: string) =>
    request<SupportCase>(`/v1/support/cases/${enc(id)}/escalations`, { method: 'POST', body: { reason } }),
  reply: (id: string, body: string) =>
    request<CaseMessage>(`/v1/support/cases/${enc(id)}/messages`, { method: 'POST', body: { body } }),
};

export const supportApi = {
  client: (id: string) => request<ClientDto>(`/v1/support/clients/${enc(id)}`),
  clientOperations: (id: string) =>
    request<{ clientId: string; count: number; items: OperationDto[] }>(`/v1/support/clients/${enc(id)}/operations`, {
      query: { limit: 50 },
    }),
  operation: (id: string) => request<OperationDto>(`/v1/support/operations/${enc(id)}`),
  timeline: (id: string) =>
    request<{ operationId: string; publicReference: string; timeline: TimelineStep[] }>(
      `/v1/support/operations/${enc(id)}/timeline`,
    ),
};

export const financeApi = {
  operation: (id: string) => request<OperationDto>(`/v1/financial-operations/${enc(id)}`),
  ledger: (id: string) =>
    request<{ operationId: string; publicReference: string; balanced: boolean; ledgerEntries: LedgerEntryDto[] }>(
      `/v1/financial-operations/${enc(id)}/ledger`,
    ),
  audit: (id: string) =>
    request<{ operationId: string; auditEntries: AuditEntry[] }>(`/v1/financial-operations/${enc(id)}/audit`),
  reverse: (operationId: string, reason: string, idempotencyKey: string = newIdempotencyKey()) =>
    request<OperationDto>(`/v1/financial-operations/${enc(operationId)}/reversals`, {
      method: 'POST',
      body: { reason },
      idempotencyKey,
    }),
  reversal: (id: string) => request<OperationDto>(`/v1/reversals/${enc(id)}`),
};
