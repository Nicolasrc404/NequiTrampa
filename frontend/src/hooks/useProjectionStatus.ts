import type { ApiServices } from '../services/factories';
import type { ProjectionStatusDto } from '../types/projectionStatus';
import type { ApiResource } from './useApiResource';
import { useApiResource } from './useApiResource';

export function useProjectionStatus(services: ApiServices | null, reference: string | null, enabled: boolean): ApiResource<ProjectionStatusDto> {
  const normalized = reference?.trim() ?? '';
  const active = enabled && services !== null && normalized.length > 0;
  return useApiResource(active ? (signal) => services!.projectionStatus.get(normalized, { signal }) : null, [active, services, normalized]);
}
