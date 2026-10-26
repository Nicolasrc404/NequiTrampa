// ============================================================
// DATOS DEMO — Módulo Categorías
// ⚠️ SOLO PARA PREVISUALIZACIÓN. No son datos reales.
// NO ejecutan operaciones financieras.
// Fuente visual: Stitch Categories_01
// ============================================================

import { CategoryItem } from '../types/categories';

export const DEMO_EXPENSE_CATEGORIES: CategoryItem[] = [
  {
    id: 'demo-cat-001',
    name: 'Mercado',
    type: 'gasto',
    movementsCount: 12,
    formattedAmount: '$ 320.000',
    initialLetter: 'M',
  },
  {
    id: 'demo-cat-002',
    name: 'Transporte',
    type: 'gasto',
    movementsCount: 9,
    formattedAmount: '$ 112.000',
    initialLetter: 'T',
  },
  {
    id: 'demo-cat-003',
    name: 'Ocio',
    type: 'gasto',
    movementsCount: 6,
    formattedAmount: '$ 168.000',
    initialLetter: 'O',
  },
  {
    id: 'demo-cat-004',
    name: 'Salud',
    type: 'gasto',
    movementsCount: 2,
    formattedAmount: '$ 80.000',
    initialLetter: 'S',
  },
  {
    id: 'demo-cat-005',
    name: 'Hogar',
    type: 'gasto',
    movementsCount: 4,
    formattedAmount: '$ 210.000',
    initialLetter: 'H',
  },
];

export const DEMO_INCOME_CATEGORIES: CategoryItem[] = [
  {
    id: 'demo-cat-006',
    name: 'Salario',
    type: 'ingreso',
    movementsCount: 2,
    formattedAmount: '$ 2.400.000',
    initialLetter: 'S',
  },
  {
    id: 'demo-cat-007',
    name: 'Freelance',
    type: 'ingreso',
    movementsCount: 3,
    formattedAmount: '$ 850.000',
    initialLetter: 'F',
  },
  {
    id: 'demo-cat-008',
    name: 'Rendimientos',
    type: 'ingreso',
    movementsCount: 1,
    formattedAmount: '$ 42.500',
    initialLetter: 'R',
  },
];

export const DEMO_CATEGORY_TO_EDIT = DEMO_EXPENSE_CATEGORIES[0];
