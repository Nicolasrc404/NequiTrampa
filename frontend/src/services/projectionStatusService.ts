import type { HttpClient } from './http';
import { asRecord, optionalString, requireBoolean, requireSafeInteger, requireString, ServiceContractError } from './contract';
import type { ProjectionEventStatusDto, ProjectionStatusDto } from '../types/projectionStatus';

export interface ProjectionStatusService {
  get(operationReference: string, options?: { readonly signal?: AbortSignal }): Promise<ProjectionStatusDto>;
}

function parseEvent(payload: unknown): ProjectionEventStatusDto {
  const dto = asRecord(payload, 'projection event');
  return {
    eventId: requireString(dto, 'eventId'),
    eventType: requireString(dto, 'eventType'),
    published: requireBoolean(dto, 'published'),
    attempts: requireSafeInteger(dto, 'attempts', { min: 0 }),
    lastError: optionalString(dto, 'lastError'),
    projected: requireBoolean(dto, 'projected'),
  };
}

function parseStatus(payload: unknown): ProjectionStatusDto {
  const dto = asRecord(payload, 'projection status');
  if (!Array.isArray(dto.events)) throw new ServiceContractError("El campo 'events' no es una lista.", 'events');
  return {
    operationId: requireString(dto, 'operationId'),
    status: requireString(dto, 'status'),
    events: dto.events.map(parseEvent),
  };
}

export function createProjectionStatusService(http: HttpClient): ProjectionStatusService {
  return {
    async get(operationReference, options) {
      const reference = operationReference.trim();
      if (!reference) throw new ServiceContractError('La referencia de operación es obligatoria.', 'operationReference');
      return parseStatus(await http.get<unknown>(`/v1/support/operations/${encodeURIComponent(reference)}/projection-status`, { signal: options?.signal }));
    },
  };
}
