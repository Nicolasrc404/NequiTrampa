import type { ApiServices } from '../services/factories';
import type { ApiResource } from './useApiResource';
import type { ProfileDto, UpdateProfileInput } from '../types/profile';
import { useApiResource } from './useApiResource';
import { useAsyncAction, type UseAsyncActionResult } from './useAsyncAction';

export interface ProfileResource extends ApiResource<ProfileDto> {
  readonly update: UseAsyncActionResult<[UpdateProfileInput], ProfileDto>;
}

export function useProfile(
  services: ApiServices | null,
  enabled: boolean,
): ProfileResource {
  const active = enabled && services !== null;
  const resource = useApiResource(
    active ? (signal) => services!.profile.get({ signal }) : null,
    [active, services],
  );
  const update = useAsyncAction(
    (input: UpdateProfileInput) => services!.profile.update(input),
  );
  return { ...resource, update };
}
