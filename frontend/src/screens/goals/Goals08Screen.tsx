import React from 'react';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';

export interface Goals08ScreenProps {
  readonly onRetry?: () => void;
}

export const Goals08Screen: React.FC<Goals08ScreenProps> = ({ onRetry }) => {
  return (
    <GoalsStatusScreen
      icon="wifi"
      iconBackground={colors.goalsErrorCircleAlt}
      iconColor={colors.goalsMagentaError}
      iconWrapperSize={96}
      iconSize={40}
      title="No pudimos crear tu meta"
      description="Es un problema de nuestro lado, no tuyo. No se creó una meta duplicada. Intenta de nuevo en unos minutos."
      primaryLabel="Intentar nuevamente"
      onPrimary={onRetry}
      demoHint="Estado DEMO · sin conexión al backend"
    />
  );
};

export default Goals08Screen;
