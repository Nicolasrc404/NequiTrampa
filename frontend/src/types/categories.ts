// ============================================================
// MÓDULO: Categorías
// Fuente visual: Stitch NequiTrampa Movements Screens Replicas
// Pantallas: Categories_01 — Categories_08
// ============================================================

export type CategoriesState =
  | 'Categories_01' // Listado de categorías
  | 'Categories_02' // Sin categorías (Empty State)
  | 'Categories_03' // Crear categoría
  | 'Categories_04' // Editar categoría
  | 'Categories_05' // Categoría creada (201)
  | 'Categories_06' // Categoría duplicada (409)
  | 'Categories_07' // Error de validación (422)
  | 'Categories_08'; // Confirmar eliminación

export type CategoryType = 'gasto' | 'ingreso';

// Ítem de categoría (DEMO — NO conectado a backend)
export interface CategoryItem {
  id: string;
  name: string;
  type: CategoryType;
  movementsCount: number;
  formattedAmount: string;
  initialLetter: string;
  /** `true` para categorías del catálogo del sistema (no editables). */
  isSystem?: boolean;
}
