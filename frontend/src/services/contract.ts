// ============================================================
// Validación de contratos de la API
// ============================================================
// Los DTO del backend son la fuente de verdad. Antes de entregar una respuesta
// a la UI se comprueba su forma: una respuesta inesperada NUNCA debe
// interpretarse como una operación exitosa ni como un saldo válido.
//
// Este módulo es puro (sin React Native ni Expo) para poder probarlo en Node.

/** Respuesta que no cumple el contrato publicado por el backend. */
export class ServiceContractError extends Error {
  readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = 'ServiceContractError';
    this.field = field;
  }
}

export type JsonRecord = Readonly<Record<string, unknown>>;

export function asRecord(value: unknown, field: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ServiceContractError(
      `La respuesta del servidor no es un objeto válido (${field}).`,
      field,
    );
  }
  return value as JsonRecord;
}

export function requireString(
  source: JsonRecord,
  key: string,
  field: string = key,
): string {
  const value = source[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ServiceContractError(
      `La respuesta del servidor no incluye el campo obligatorio '${field}'.`,
      field,
    );
  }
  return value;
}

export function optionalString(
  source: JsonRecord,
  key: string,
  field: string = key,
): string | null {
  const value = source[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new ServiceContractError(
      `El campo '${field}' de la respuesta no es texto.`,
      field,
    );
  }
  return value;
}

export function requireBoolean(source: JsonRecord, key: string): boolean {
  const value = source[key];
  if (typeof value !== 'boolean') {
    throw new ServiceContractError(
      `El campo '${key}' de la respuesta no es booleano.`,
      key,
    );
  }
  return value;
}

export interface IntegerBounds {
  readonly min?: number;
  readonly max?: number;
}

export function requireSafeInteger(
  source: JsonRecord,
  key: string,
  bounds: IntegerBounds = {},
  field: string = key,
): number {
  const value = source[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new ServiceContractError(
      `El campo '${field}' de la respuesta no es un entero seguro.`,
      field,
    );
  }
  if (bounds.min !== undefined && value < bounds.min) {
    throw new ServiceContractError(
      `El campo '${field}' está fuera del rango permitido.`,
      field,
    );
  }
  if (bounds.max !== undefined && value > bounds.max) {
    throw new ServiceContractError(
      `El campo '${field}' está fuera del rango permitido.`,
      field,
    );
  }
  return value;
}

export function optionalSafeInteger(
  source: JsonRecord,
  key: string,
  bounds: IntegerBounds = {},
  field: string = key,
): number | null {
  const value = source[key];
  if (value === undefined || value === null) return null;
  return requireSafeInteger(source, key, bounds, field);
}

export function requireArray(source: JsonRecord, key: string): readonly unknown[] {
  const value = source[key];
  if (!Array.isArray(value)) {
    throw new ServiceContractError(
      `El campo '${key}' de la respuesta no es una lista.`,
      key,
    );
  }
  return value;
}

export function requireOneOf<T extends string>(
  source: JsonRecord,
  key: string,
  allowed: readonly T[],
): T {
  const value = requireString(source, key);
  if (!(allowed as readonly string[]).includes(value)) {
    throw new ServiceContractError(
      `El campo '${key}' tiene un valor no soportado.`,
      key,
    );
  }
  return value as T;
}

/** Convierte centavos al número decimal de COP que se serializa en JSON. */
export function centsToCopAmount(cents: number): number {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new ServiceContractError('El monto debe ser un entero de centavos.', 'amountCents');
  }
  const pesos = Math.trunc(cents / 100);
  const remainder = cents % 100;
  // Se reconstruye desde texto para no acumular error binario antes de serializar.
  return Number(`${pesos}.${remainder.toString().padStart(2, '0')}`);
}
