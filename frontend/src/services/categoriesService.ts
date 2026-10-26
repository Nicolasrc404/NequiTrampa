// ============================================================
// Servicio de categorías
// ============================================================
// Contrato verificado en `src/Nequi.Finance/Categories/CategoriesController.cs`:
//   GET    /v1/categories?includeInactive -> CategoryDto[]
//   POST   /v1/categories                 -> 201 CategoryDto
//   PATCH  /v1/categories/{id}            -> CategoryDto
//   DELETE /v1/categories/{id}            -> 204 (soft delete)
//
// NO existe `GET /v1/categories/{id}`. El detalle se resuelve desde el
// listado, nunca con una ruta inventada.
//
// Reglas confirmadas:
//   - 409 CATEGORY_DUPLICATE
//   - 422 CATEGORY_TYPE_IMMUTABLE
//   - 403 SYSTEM_CATEGORY_IMMUTABLE
//   - DELETE solo desactiva; no borra movimientos ni presupuestos históricos.

import type { HttpClient } from './http';
import {
  asRecord,
  requireBoolean,
  requireOneOf,
  requireSafeInteger,
  requireString,
  ServiceContractError,
} from './contract';
import { normalizeBaseUrl } from '../utils/url';

export const MAX_CATEGORY_NAME_LENGTH = 40;
export const MIN_CATEGORY_NAME_LENGTH = 2;
export const CATEGORY_TYPES = ['gasto', 'ingreso'] as const;

export type CategoryTypeDto = (typeof CATEGORY_TYPES)[number];

export interface CategoryDto {
  readonly id: string;
  readonly name: string;
  readonly type: CategoryTypeDto;
  readonly isSystem: boolean;
  readonly active: boolean;
  readonly movementsCount: number;
  readonly totalAmountCents: number;
  readonly currency: 'COP';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCategoryInput {
  readonly name: string;
  readonly type: CategoryTypeDto;
}

export interface UpdateCategoryInput {
  readonly name?: string;
  readonly type?: CategoryTypeDto;
}

export interface CategoryRequestOptions {
  readonly signal?: AbortSignal;
}

export interface ListCategoriesOptions extends CategoryRequestOptions {
  readonly includeInactive?: boolean;
}

export interface CategoriesService {
  list(options?: ListCategoriesOptions): Promise<readonly CategoryDto[]>;
  create(
    input: CreateCategoryInput,
    options?: CategoryRequestOptions,
  ): Promise<CategoryDto>;
  update(
    id: string,
    input: UpdateCategoryInput,
    options?: CategoryRequestOptions,
  ): Promise<CategoryDto>;
  /** Desactiva (soft delete). El backend responde 204 sin cuerpo. */
  deactivate(id: string, options?: CategoryRequestOptions): Promise<void>;
}

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

export function normalizeCategoryName(value: string): string {
  const collapsed = (value ?? '').trim().replace(/\s+/g, ' ');
  if (
    collapsed.length < MIN_CATEGORY_NAME_LENGTH ||
    collapsed.length > MAX_CATEGORY_NAME_LENGTH ||
    CONTROL_CHARACTERS.test(collapsed)
  ) {
    throw new Error(
      `El nombre debe tener entre ${MIN_CATEGORY_NAME_LENGTH} y ${MAX_CATEGORY_NAME_LENGTH} caracteres imprimibles.`,
    );
  }
  return collapsed;
}

function requireCategoryType(value: string): CategoryTypeDto {
  if (!(CATEGORY_TYPES as readonly string[]).includes(value)) {
    throw new Error("El tipo debe ser 'gasto' o 'ingreso'.");
  }
  return value as CategoryTypeDto;
}

function requireIdentifier(id: string): string {
  const reference = (id ?? '').trim();
  if (reference.length === 0) {
    throw new Error('La categoría requiere un identificador.');
  }
  return reference;
}

function parseCategory(payload: unknown): CategoryDto {
  const dto = asRecord(payload, 'category');
  const currency = requireString(dto, 'currency');
  if (currency !== 'COP') {
    throw new ServiceContractError(
      'La categoría no está denominada en COP.',
      'currency',
    );
  }
  return {
    id: requireString(dto, 'id'),
    name: requireString(dto, 'name'),
    type: requireOneOf(dto, 'type', CATEGORY_TYPES),
    isSystem: requireBoolean(dto, 'isSystem'),
    active: requireBoolean(dto, 'active'),
    movementsCount: requireSafeInteger(dto, 'movementsCount', { min: 0 }),
    totalAmountCents: requireSafeInteger(dto, 'totalAmountCents', { min: 0 }),
    currency: 'COP',
    createdAt: requireString(dto, 'createdAt'),
    updatedAt: requireString(dto, 'updatedAt'),
  };
}

export function createCategoriesService(http: HttpClient): CategoriesService {
  if (!normalizeBaseUrl(http.baseUrl)) {
    throw new Error('createCategoriesService: cliente HTTP sin URL base válida.');
  }

  return {
    async list(options = {}) {
      const payload = await http.get<unknown>('/v1/categories', {
        query: { includeInactive: options.includeInactive ?? false },
        signal: options.signal,
      });
      if (!Array.isArray(payload)) {
        throw new ServiceContractError(
          'El listado de categorías no es una lista.',
          'categories',
        );
      }
      return payload.map(parseCategory);
    },

    async create(input, options) {
      const name = normalizeCategoryName(input.name);
      const type = requireCategoryType(input.type);
      const payload = await http.post<unknown>(
        '/v1/categories',
        { name, type },
        { signal: options?.signal },
      );
      return parseCategory(payload);
    },

    async update(id, input, options) {
      const reference = requireIdentifier(id);
      const body: Record<string, string> = {};
      if (input.name !== undefined) {
        body.name = normalizeCategoryName(input.name);
      }
      if (input.type !== undefined) {
        body.type = requireCategoryType(input.type);
      }
      if (Object.keys(body).length === 0) {
        throw new Error("La edición requiere 'name' y/o 'type'.");
      }
      const payload = await http.patch<unknown>(
        `/v1/categories/${encodeURIComponent(reference)}`,
        body,
        { signal: options?.signal },
      );
      return parseCategory(payload);
    },

    async deactivate(id, options) {
      const reference = requireIdentifier(id);
      await http.delete<unknown>(
        `/v1/categories/${encodeURIComponent(reference)}`,
        { signal: options?.signal },
      );
    },
  };
}

/** Resuelve una categoría del listado cuando la pantalla necesita el detalle. */
export function findCategoryById(
  categories: readonly CategoryDto[],
  id: string,
): CategoryDto | null {
  return categories.find((category) => category.id === id) ?? null;
}
