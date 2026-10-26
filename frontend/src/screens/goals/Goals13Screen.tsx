import React from 'react';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';

export interface Goals13ScreenProps {
  readonly onRetry?: () => void;
}

export const Goals13Screen: React.FC<Goals13ScreenProps> = ({ onRetry }) => {
  return (
    <GoalsStatusScreen
      icon="wifi"
      iconBackground={colors.goalsErrorCircleSoft}
      iconColor={colors.goalsErrorIconAlt}
      iconWrapperSize={80}
      iconSize={32}
      title="No pudimos guardar los cambios"
      titleSize={24}
      description="La información anterior de tu meta sigue guardada. Es un problema de nuestro lado. Intenta de nuevo en unos minutos."
      primaryLabel="Intentar nuevamente"
      onPrimary={onRetry}
      demoHint="Estado DEMO · sin conexión al backend"
    />
  );
};

export default Goals13Screen;
