import React from 'react';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';

export interface Goals03ScreenProps {
  readonly onRetry?: () => void;
}

export const Goals03Screen: React.FC<Goals03ScreenProps> = ({ onRetry }) => {
  return (
    <GoalsStatusScreen
      icon="wifi"
      iconBackground={colors.goalsErrorCircle}
      iconColor={colors.goalsErrorIcon}
      iconWrapperSize={96}
      iconSize={40}
      title="No pudimos cargar tus metas"
      description="Tus datos siguen seguros. Es un problema de nuestro lado, no tuyo. Intenta de nuevo en unos minutos."
      primaryLabel="Intentar nuevamente"
      onPrimary={onRetry}
      demoHint="Estado DEMO · sin conexión al backend"
    />
  );
};

export default Goals03Screen;
