import React from 'react';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';

export interface Goals12ScreenProps {
  readonly onViewGoals?: () => void;
  readonly onGoHome?: () => void;
}

export const Goals12Screen: React.FC<Goals12ScreenProps> = ({
  onViewGoals,
  onGoHome,
}) => {
  return (
    <GoalsStatusScreen
      icon="file-text"
      iconBackground={colors.goalsNotFoundCircle}
      iconColor={colors.goalsMagentaStatus}
      iconWrapperSize={96}
      iconSize={36}
      title="No encontramos esta meta"
      description="Esta meta ya no está disponible. Vuelve a Mis metas para consultar las que tienes guardadas."
      primaryLabel="Ver mis metas"
      onPrimary={onViewGoals}
      secondaryLabel="Volver al inicio"
      onSecondary={onGoHome}
      demoHint="Estado DEMO · sin conexión al backend"
    />
  );
};

export default Goals12Screen;
