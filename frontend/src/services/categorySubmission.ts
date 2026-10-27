// ============================================================
// Enrutamiento de fallos al crear, editar o desactivar categorías
// ============================================================
// Decide a qué pantalla del módulo corresponde cada fallo HTTP. No conoce
// React ni navegación: App.tsx traduce el resultado a `setCurrentState`.

import type { OperationFailureKind } from './operationFailure';

export type CategoryMutationMode = 'create' | 'update' | 'delete';

export type CategoryFailureRoute =
  /** 409 al crear: pantalla de nombre duplicado. */
  | 'conflict'
  /** 422 al crear: pantalla de campos por corregir. */
  | 'validation'
  /** 401: la sesión se invalida globalmente; no se navega. */
  | 'session'
  /** 403/404: recargar la lista y volver a ella. */
  | 'reload'
  /** Cualquier otro fallo: conservar el formulario y avisar. */
  | 'stay';

/**
 * Un 409/422 de una edición no se envía a `Categories_06/07`: esos diseños
 * corresponden a «Crear categoría» y el formulario de edición debe conservar
 * los datos que el usuario ya tenía escritos.
 */
export function routeCategoryFailure(
  kind: OperationFailureKind,
  mode: CategoryMutationMode,
): CategoryFailureRoute {
  if (kind === 'session') return 'session';
  if (kind === 'forbidden' || kind === 'not_found') return 'reload';
  if (mode === 'create' && kind === 'conflict') return 'conflict';
  if (mode === 'create' && kind === 'validation') return 'validation';
  return 'stay';
}
