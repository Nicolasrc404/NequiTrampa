// ============================================================
// Validación de las respuestas del backoffice
// ============================================================
// Contratos verificados en `src/Nequi.Backoffice` (AdminController,
// SupportCasesController, SupportInvestigationController y
// FinancialOperationsController) y contra el gateway desplegado.
// Una respuesta con otra forma NUNCA llega a la UI como si fuera válida.
//
// Los valores de `type`, `status` y `priority` se conservan como texto: el
// backend puede añadir valores nuevos sin que eso sea un error de contrato.

import {
  asRecord,
  optionalSafeInteger,
  optionalString,
  requireArray,
  requireSafeInteger,
  requireString,
  ServiceContractError,
  type JsonRecord,
} from '../contract';
import type {
  AuditEntry,
  CaseMessage,
  ClientDto,
  LedgerEntryDto,
  OperationDto,
  SupportCase,
  TimelineStep,
} from '../../types/backoffice';

export function parseClient(payload: unknown): ClientDto {
  const dto = asRecord(payload, 'client');
  return {
    clientId: requireString(dto, 'clientId'),
    authSubject: requireString(dto, 'authSubject'),
    transferCode: requireString(dto, 'transferCode'),
    status: requireString(dto, 'status'),
    timezone: optionalString(dto, 'timezone'),
    accountId: optionalString(dto, 'accountId'),
    walletStatus: optionalString(dto, 'walletStatus'),
    balanceCents: optionalSafeInteger(dto, 'balanceCents'),
    createdAt: requireString(dto, 'createdAt'),
  };
}

export function parseOperation(payload: unknown): OperationDto {
  const dto = asRecord(payload, 'operation');
  return {
    operationId: requireString(dto, 'operationId'),
    publicReference: requireString(dto, 'publicReference'),
    type: requireString(dto, 'type'),
    status: requireString(dto, 'status'),
    actorId: requireString(dto, 'actorId'),
    actorType: requireString(dto, 'actorType'),
    amountCents: requireSafeInteger(dto, 'amountCents'),
    currency: requireString(dto, 'currency'),
    originalOperationId: optionalString(dto, 'originalOperationId'),
    reason: optionalString(dto, 'reason'),
    createdAt: requireString(dto, 'createdAt'),
    confirmedAt: optionalString(dto, 'confirmedAt'),
  };
}

export function parseLedgerEntry(payload: unknown): LedgerEntryDto {
  const dto = asRecord(payload, 'ledgerEntry');
  return {
    entryNo: requireSafeInteger(dto, 'entryNo', { min: 1 }),
    accountId: requireString(dto, 'accountId'),
    clientId: optionalString(dto, 'clientId'),
    accountType: requireString(dto, 'accountType'),
    deltaCents: requireSafeInteger(dto, 'deltaCents'),
    balanceBeforeCents: requireSafeInteger(dto, 'balanceBeforeCents'),
    balanceAfterCents: requireSafeInteger(dto, 'balanceAfterCents'),
    createdAt: requireString(dto, 'createdAt'),
  };
}

export function parseCase(payload: unknown): SupportCase {
  const dto = asRecord(payload, 'supportCase');
  return {
    id: requireString(dto, 'id'),
    clientId: requireString(dto, 'clientId'),
    subject: requireString(dto, 'subject'),
    description: optionalString(dto, 'description'),
    priority: requireString(dto, 'priority'),
    status: requireString(dto, 'status'),
    assignedTo: optionalString(dto, 'assignedTo'),
    escalationLevel: optionalSafeInteger(dto, 'escalationLevel', { min: 0 }) ?? 0,
    escalationReason: optionalString(dto, 'escalationReason') ?? undefined,
    createdBy: requireString(dto, 'createdBy'),
    createdAt: requireString(dto, 'createdAt'),
    updatedAt: requireString(dto, 'updatedAt'),
  };
}

export function parseCaseMessage(payload: unknown): CaseMessage {
  const dto = asRecord(payload, 'caseMessage');
  return {
    id: requireString(dto, 'id'),
    caseId: requireString(dto, 'caseId'),
    authorId: requireString(dto, 'authorId'),
    body: requireString(dto, 'body'),
    createdAt: requireString(dto, 'createdAt'),
  };
}

export function parseTimelineStep(payload: unknown): TimelineStep {
  const dto = asRecord(payload, 'timelineStep');
  return {
    // Un evento proyectado sin fecha llega como texto vacío: se conserva.
    at: typeof dto.at === 'string' ? dto.at : '',
    step: requireString(dto, 'step'),
    detail: typeof dto.detail === 'string' ? dto.detail : '',
    eventId: optionalString(dto, 'eventId'),
  };
}

/** Auditoría: registro append-only; se valida que sea un objeto y se conserva. */
export function parseAuditEntry(payload: unknown): AuditEntry {
  const dto: JsonRecord = asRecord(payload, 'auditEntry');
  return {
    ...dto,
    action: optionalString(dto, 'action') ?? undefined,
    actorId: optionalString(dto, 'actorId') ?? undefined,
    occurredAt: optionalString(dto, 'occurredAt') ?? undefined,
  };
}

export function parseList<T>(
  payload: JsonRecord,
  key: string,
  parseItem: (item: unknown) => T,
): readonly T[] {
  return requireArray(payload, key).map(parseItem);
}

export function parseStringList(payload: JsonRecord, key: string): readonly string[] {
  return requireArray(payload, key).map((value, index) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new ServiceContractError(
        `El elemento ${index} de '${key}' no es texto.`,
        key,
      );
    }
    return value;
  });
}
