import React from 'react';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';
import GoalSummaryCard from '../../components/goals/GoalSummaryCard';
import { DEMO_GOAL_EDITED } from '../../data/demoGoals';
import type { GoalItem } from '../../types/goals';

export interface Goals09ScreenProps {
  readonly onBackToGoal?: () => void;
  readonly goal?: GoalItem;
  readonly demo?: boolean;
}

export const Goals09Screen: React.FC<Goals09ScreenProps> = ({
  onBackToGoal,
  goal,
  demo = true,
}) => {
  return (
    <GoalsStatusScreen
      icon="check"
      iconBackground={colors.goalsMintAlt}
      iconColor={colors.goalsGreenAlt}
      iconWrapperSize={96}
      iconSize={36}
      title="Cambios guardados"
      titleSize={24}
      description="El monto objetivo y la fecha de tu meta se actualizaron correctamente."
      primaryLabel="Volver a mi meta"
      onPrimary={onBackToGoal}
      demoHint={demo ? 'Previsualización DEMO · no se guardaron cambios' : undefined}
      >
        <GoalSummaryCard
          goal={goal ?? DEMO_GOAL_EDITED}
          titleSize={17}
          padding={24}
          amountSize={16}
        />
      </GoalsStatusScreen>
  );
};

export default Goals09Screen;
