// ============================================================
// Metas: DTO de API → view model
// ============================================================
// `savedCents` es progreso DECLARADO, no dinero reservado ni transferido.
// El view model conserva esa naturaleza informativa.

import type { GoalDto } from '../goalsService';
import type { GoalItem } from '../../types/goals';
import { formatLongDateLabel } from '../../utils/datetime';

export const GOAL_CURRENCY_LABEL = 'COP · pesos colombianos';

export function mapGoal(dto: GoalDto): GoalItem {
  return {
    id: dto.id,
    name: dto.name,
    savedCents: dto.savedCents,
    targetCents: dto.targetCents,
    percent: dto.percent,
    targetDate: dto.targetDate,
    targetDateLabel: formatLongDateLabel(dto.targetDate),
    daysRemaining: dto.daysRemaining,
    isAchieved: dto.isAchieved,
    currencyLabel: GOAL_CURRENCY_LABEL,
  };
}

export function mapGoals(dtos: readonly GoalDto[]): readonly GoalItem[] {
  return dtos.map(mapGoal);
}
