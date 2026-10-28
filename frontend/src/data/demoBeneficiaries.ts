// ============================================================
// DATOS DEMO — Módulo Beneficiarios
// ⚠️ SOLO PARA PREVISUALIZACIÓN. NO son datos reales.
// NO ejecutan operaciones financieras.
// Fuente visual: Stitch Beneficiaries_01
// ============================================================

import { BeneficiaryItem } from '../types/beneficiaries';

export const DEMO_BENEFICIARIES: BeneficiaryItem[] = [
  {
    id: 'demo-ben-001',
    name: 'Laura Gómez',
    code: 'LAUR-5120',
    initialLetter: 'L',
  },
  {
    id: 'demo-ben-002',
    name: 'Sofía Rojas',
    code: 'SOFI-3307',
    initialLetter: 'S',
  },
  {
    id: 'demo-ben-003',
    name: 'Carlos Peña',
    code: 'CARL-9941',
    initialLetter: 'C',
  },
  {
    id: 'demo-ben-004',
    name: 'Mamá',
    code: 'MARI-1182',
    initialLetter: 'M',
  },
];

// Beneficiario de demostración para el estado de eliminación confirmada
export const DEMO_DELETED_BENEFICIARY: BeneficiaryItem = {
  id: 'demo-ben-002',
  name: 'Sofía Rojas',
  code: 'SOFI-3307',
  initialLetter: 'S',
};

// Beneficiario de demostración para el estado de confirmación de eliminación
export const DEMO_BENEFICIARY_TO_DELETE: BeneficiaryItem = DEMO_DELETED_BENEFICIARY;
