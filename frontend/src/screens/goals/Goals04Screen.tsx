import React from 'react';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';
import GoalSummaryCard from '../../components/goals/GoalSummaryCard';
import { DEMO_GOAL_CREATED } from '../../data/demoGoals';
import type { GoalItem } from '../../types/goals';

export interface Goals04ScreenProps {
  readonly onViewGoal?: () => void;
  readonly onBackToGoals?: () => void;
  readonly goal?: GoalItem;
  readonly demo?: boolean;
}

export const Goals04Screen: React.FC<Goals04ScreenProps> = ({
  onViewGoal,
  onBackToGoals,
  goal,
  demo = true,
}) => {
  return (
    <GoalsStatusScreen
      icon="check"
      iconBackground={colors.goalsMint}
      iconColor={colors.goalsGreen}
      iconWrapperSize={84}
      iconSize={32}
      title="¡Meta creada!"
      titleSize={26}
      description="Tu meta se creó correctamente. Ya puedes ver tu avance en Mis metas."
      primaryLabel="Ver mi meta"
      onPrimary={onViewGoal}
      secondaryLabel="Volver a mis metas"
      onSecondary={onBackToGoals}
      demoHint={demo ? 'Previsualización DEMO · no se creó ninguna meta' : undefined}
      backgroundColor={colors.goalsBgSuccess}
    >
      <GoalSummaryCard goal={goal ?? DEMO_GOAL_CREATED} titleSize={16} padding={20} />
    </GoalsStatusScreen>
  );
};

export default Goals04Screen;
