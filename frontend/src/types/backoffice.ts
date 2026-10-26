export type Role = 'CLIENTE' | 'SOPORTE' | 'OPERADOR_FINANCIERO' | 'ADMIN';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

export interface ClientDto {
  clientId: string;
  authSubject: string;
  transferCode: string;
  status: UserStatus | string;
  timezone: string | null;
  accountId: string | null;
  walletStatus: string | null;
  balanceCents: number | null;
  createdAt: string;
}

export interface OperationDto {
  operationId: string;
  publicReference: string;
  type: string;
  status: string;
  actorId: string;
  actorType: string;
  amountCents: number;
  currency: string;
  originalOperationId: string | null;
  reason: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface LedgerEntryDto {
  entryNo: number;
  accountId: string;
  clientId: string | null;
  accountType: string;
  deltaCents: number;
  balanceBeforeCents: number;
  balanceAfterCents: number;
  createdAt: string;
}

export type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface SupportCase {
  id: string;
  clientId: string;
  subject: string;
  description?: string | null;
  priority: CasePriority | string;
  status: CaseStatus | string;
  assignedTo: string | null;
  escalationLevel?: number;
  escalationReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseMessage {
  id: string;
  caseId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface TimelineStep {
  at: string;
  step: string;
  detail: string;
  eventId: string | null;
}

export interface AuditEntry {
  [key: string]: unknown;
  action?: string;
  actorId?: string;
  occurredAt?: string;
}

export type OperationTab = 'detail' | 'timeline' | 'ledger' | 'audit';

export type BoRoute =
  | { name: 'home' }
  | { name: 'users' }
  | { name: 'userDetail'; id: string }
  | { name: 'userStatus'; id: string }
  | { name: 'userRoles'; id: string }
  | { name: 'roles' }
  | { name: 'cases' }
  | { name: 'caseDetail'; id: string }
  | { name: 'caseStatus'; id: string }
  | { name: 'caseAssign'; id: string }
  | { name: 'caseEscalate'; id: string }
  | { name: 'customer' }
  | { name: 'customerProfile'; id: string }
  | { name: 'customerOperations'; id: string }
  | { name: 'operationSearch'; area: 'support' | 'finance' }
  | { name: 'operation'; id: string; tab: OperationTab; area: 'support' | 'finance' }
  | { name: 'reversalCreate'; operationId?: string }
  | { name: 'reversalDetail'; id: string };
