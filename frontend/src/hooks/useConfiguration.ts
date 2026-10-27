import type { ApiServices } from '../services/factories';
import type { ConfigurationDto, UpdateConfigurationInput } from '../types/configuration';
import type { ApiResource } from './useApiResource';
import { useApiResource } from './useApiResource';
import { useAsyncAction, type UseAsyncActionResult } from './useAsyncAction';

export interface ConfigurationResource extends ApiResource<ConfigurationDto> {
  readonly update: UseAsyncActionResult<[UpdateConfigurationInput], ConfigurationDto>;
}

export function useConfiguration(services: ApiServices | null, enabled: boolean): ConfigurationResource {
  const active = enabled && services !== null;
  const resource = useApiResource(active ? (signal) => services!.configuration.get({ signal }) : null, [active, services]);
  const update = useAsyncAction((input: UpdateConfigurationInput) => services!.configuration.update(input));
  return { ...resource, update };
}
