// ============================================================
// MÓDULO: Beneficiarios
// Fuente visual: Stitch NequiTrampa Movements Screens Replicas
// Pantallas: Beneficiaries_01 – Beneficiaries_14
// ============================================================

// Estado del módulo para el sistema de previsualización DEV
export type BeneficiariesState =
  | 'Beneficiaries_01' // Listado de beneficiarios
  | 'Beneficiaries_02' // Sin beneficiarios (Empty State)
  | 'Beneficiaries_03' // Skeleton de Carga
  | 'Beneficiaries_04' // Agregar beneficiario (formulario)
  | 'Beneficiaries_05' // Beneficiario agregado (201)
  | 'Beneficiaries_06' // Error de validación (400)
  | 'Beneficiaries_07' // Cuenta no encontrada (404)
  | 'Beneficiaries_08' // Ya tienes a este beneficiario (409)
  | 'Beneficiaries_09' // Error agregarse a sí mismo (422)
  | 'Beneficiaries_10' // Beneficiario eliminado (200)
  | 'Beneficiaries_11' // Tu sesión venció (401)
  | 'Beneficiaries_12' // Tu sesión venció variante (401)
  | 'Beneficiaries_13' // Error inesperado (500)
  | 'Beneficiaries_14'; // Confirmar eliminación

// Estado de módulo unificado para el App.tsx
export type AppModule = 'movements' | 'beneficiaries';

// Ítem de beneficiario (DEMO — NO conectado a backend)
export interface BeneficiaryItem {
  id: string;
  name: string;
  code: string;          // e.g. "LAUR-5120"
  initialLetter: string; // e.g. "L"
}

// Formulario para agregar beneficiario
export interface AddBeneficiaryForm {
  code: string;    // Código del destinatario
  alias?: string;  // Nombre o apodo opcional
}

// Estado de error de validación del formulario
export interface FormValidationError {
  field: 'code' | 'alias' | 'general';
  message: string;
}
