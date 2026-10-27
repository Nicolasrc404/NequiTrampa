import type { HttpClient } from './http';
import { asRecord, optionalString, requireBoolean, requireString, ServiceContractError } from './contract';
import type { ConfigurationDto, UpdateConfigurationInput } from '../types/configuration';

export interface ConfigurationService {
  get(options?: { readonly signal?: AbortSignal }): Promise<ConfigurationDto>;
  update(input: UpdateConfigurationInput, options?: { readonly signal?: AbortSignal }): Promise<ConfigurationDto>;
}

function parseConfiguration(payload: unknown): ConfigurationDto {
  const root = asRecord(payload, 'configuration response');
  const dto = asRecord(root.configuration, 'configuration');
  return {
    maintenanceMode: requireBoolean(dto, 'maintenanceMode'),
    notificationsEnabled: requireBoolean(dto, 'notificationsEnabled'),
    supportEmail: optionalString(dto, 'supportEmail'),
    supportHours: requireString(dto, 'supportHours'),
    updatedAt: optionalString(dto, 'updatedAt'),
    updatedBy: optionalString(dto, 'updatedBy'),
  };
}

export function createConfigurationService(http: HttpClient): ConfigurationService {
  return {
    async get(options) {
      return parseConfiguration(await http.get<unknown>('/v1/admin/configuration', { signal: options?.signal }));
    },
    async update(input, options) {
      if (Object.keys(input).length === 0) {
        throw new ServiceContractError('Envía al menos una configuración para actualizar.', 'configuration');
      }
      return parseConfiguration(await http.patch<unknown>('/v1/admin/configuration', input, { signal: options?.signal }));
    },
  };
}
