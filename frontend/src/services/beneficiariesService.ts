// ============================================================
// Servicio de beneficiarios frecuentes
// ============================================================
// Contrato verificado en `src/Nequi.Wallet/Beneficiaries/BeneficiariesController.cs`:
//   GET    /v1/beneficiaries       -> BeneficiaryDto[]
//   GET    /v1/beneficiaries/{id}  -> BeneficiaryDto
//   POST   /v1/beneficiaries       -> 201 BeneficiaryDto
//   DELETE /v1/beneficiaries/{id}  -> 200 BeneficiaryDeletedDto
//
// El backend solo valida que el `public_transfer_code` exista y esté ACTIVE.
// No hay verificación bancaria externa: la UI nunca debe presentar un
// beneficiario como "cuenta verificada". `destinationClientId` es dato interno
// y no forma parte del DTO público, por lo que tampoco se modela aquí.

import type { HttpClient } from './http';
import {
  asRecord,
  requireBoolean,
  requireString,
  ServiceContractError,
} from './contract';
import { normalizeBaseUrl } from '../utils/url';

export const MAX_BENEFICIARY_NAME_LENGTH = 60;
export const MAX_BENEFICIARY_CODE_LENGTH = 20;
export const MAX_BENEFICIARIES = 200;

const TRANSFER_CODE_PATTERN = /^[A-Za-z0-9_-]+$/;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

export interface BeneficiaryDto {
  readonly id: string;
  readonly name: string;
  readonly transferCode: string;
  readonly createdAt: string;
}

export interface BeneficiaryDeletedDto {
  readonly id: string;
  readonly deleted: true;
}

export interface CreateBeneficiaryInput {
  readonly name: string;
  readonly transferCode: string;
}

export interface BeneficiaryRequestOptions {
  readonly signal?: AbortSignal;
}

export interface BeneficiariesService {
  list(options?: BeneficiaryRequestOptions): Promise<readonly BeneficiaryDto[]>;
  getById(id: string, options?: BeneficiaryRequestOptions): Promise<BeneficiaryDto>;
  create(
    input: CreateBeneficiaryInput,
    options?: BeneficiaryRequestOptions,
  ): Promise<BeneficiaryDto>;
  remove(
    id: string,
    options?: BeneficiaryRequestOptions,
  ): Promise<BeneficiaryDeletedDto>;
}

function requireIdentifier(id: string): string {
  const reference = (id ?? '').trim();
  if (reference.length === 0) {
    throw new Error('El beneficiario requiere un identificador.');
  }
  return reference;
}

/** Colapsa espacios y valida el nombre elegido por el propietario. */
export function normalizeBeneficiaryName(value: string): string {
  const collapsed = (value ?? '').trim().replace(/\s+/g, ' ');
  if (
    collapsed.length < 2 ||
    collapsed.length > MAX_BENEFICIARY_NAME_LENGTH ||
    CONTROL_CHARACTERS.test(collapsed)
  ) {
    throw new Error(
      `El nombre debe tener entre 2 y ${MAX_BENEFICIARY_NAME_LENGTH} caracteres imprimibles.`,
    );
  }
  return collapsed;
}

/** El backend normaliza a mayúsculas; se envía ya normalizado. */
export function normalizeBeneficiaryCode(value: string): string {
  const code = (value ?? '').trim().toUpperCase();
  if (
    code.length < 1 ||
    code.length > MAX_BENEFICIARY_CODE_LENGTH ||
    !TRANSFER_CODE_PATTERN.test(code)
  ) {
    throw new Error(
      'El código debe tener entre 1 y 20 caracteres alfanuméricos, guiones o guiones bajos.',
    );
  }
  return code;
}

function parseBeneficiary(payload: unknown): BeneficiaryDto {
  const dto = asRecord(payload, 'beneficiary');
  return {
    id: requireString(dto, 'id'),
    name: requireString(dto, 'name'),
    transferCode: requireString(dto, 'transferCode'),
    createdAt: requireString(dto, 'createdAt'),
  };
}

function parseDeleted(payload: unknown): BeneficiaryDeletedDto {
  const dto = asRecord(payload, 'beneficiaryDeleted');
  const deleted = requireBoolean(dto, 'deleted');
  if (!deleted) {
    throw new ServiceContractError(
      'El servidor no confirmó la eliminación del beneficiario.',
      'deleted',
    );
  }
  return { id: requireString(dto, 'id'), deleted: true };
}

export function createBeneficiariesService(http: HttpClient): BeneficiariesService {
  if (!normalizeBaseUrl(http.baseUrl)) {
    throw new Error(
      'createBeneficiariesService: cliente HTTP sin URL base válida.',
    );
  }

  return {
    async list(options = {}) {
      const payload = await http.get<unknown>('/v1/beneficiaries', {
        signal: options.signal,
      });
      if (!Array.isArray(payload)) {
        throw new ServiceContractError(
          'El listado de beneficiarios no es una lista.',
          'beneficiaries',
        );
      }
      return payload.map(parseBeneficiary);
    },

    async getById(id, options) {
      const reference = requireIdentifier(id);
      const payload = await http.get<unknown>(
        `/v1/beneficiaries/${encodeURIComponent(reference)}`,
        { signal: options?.signal },
      );
      return parseBeneficiary(payload);
    },

    async create(input, options) {
      const name = normalizeBeneficiaryName(input.name);
      const transferCode = normalizeBeneficiaryCode(input.transferCode);
      const payload = await http.post<unknown>(
        '/v1/beneficiaries',
        { name, transferCode },
        { signal: options?.signal },
      );
      return parseBeneficiary(payload);
    },

    async remove(id, options) {
      const reference = requireIdentifier(id);
      const payload = await http.delete<unknown>(
        `/v1/beneficiaries/${encodeURIComponent(reference)}`,
        { signal: options?.signal },
      );
      return parseDeleted(payload);
    },
  };
}
