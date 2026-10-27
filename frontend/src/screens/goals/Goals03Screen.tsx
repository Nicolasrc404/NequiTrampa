import React from 'react';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';

export interface Goals03ScreenProps {
  readonly onRetry?: () => void;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Goals03Screen: React.FC<Goals03ScreenProps> = ({ onRetry, demo = true }) => {
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
      demoHint={demo ? 'Estado DEMO · sin conexión al backend' : undefined}
    />
  );
};

export default Goals03Screen;
