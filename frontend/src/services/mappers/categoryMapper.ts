// ============================================================
// Categorías: DTO de API → view model
// ============================================================
// `CategoryDto.totalAmountCents` es la suma de los movimientos asociados que
// el backend pudo resolver. Se muestra tal cual, formateada en COP.

import type { CategoryDto } from '../categoriesService';
import type { CategoryItem } from '../../types/categories';
import { formatCopCents } from '../../utils/money';

export function categoryInitial(name: string): string {
  const trimmed = (name ?? '').trim();
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : '?';
}

export function mapCategory(dto: CategoryDto): CategoryItem {
  return {
    id: dto.id,
    name: dto.name,
    type: dto.type,
    movementsCount: dto.movementsCount,
    formattedAmount: formatCopCents(dto.totalAmountCents),
    initialLetter: categoryInitial(dto.name),
  };
}

export function mapCategories(
  dtos: readonly CategoryDto[],
): readonly CategoryItem[] {
  return dtos.map(mapCategory);
}
