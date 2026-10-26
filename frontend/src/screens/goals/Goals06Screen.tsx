import React from 'react';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';

export interface Goals06ScreenProps {
  readonly onLogin?: () => void;
}

export const Goals06Screen: React.FC<Goals06ScreenProps> = ({ onLogin }) => {
  return (
    <GoalsStatusScreen
      icon="lock"
      iconBackground={colors.goalsWarningSoftBg}
      iconColor={colors.goalsWarningSoftIcon}
      iconWrapperSize={88}
      iconSize={40}
      title="Tu sesión venció"
      titleSize={26}
      description="Por seguridad cerramos tu sesión. Inicia sesión de nuevo para crear tu meta."
      primaryLabel="Iniciar sesión"
      onPrimary={onLogin}
      demoHint="Estado DEMO · no se enviaron credenciales"
    />
  );
};

export default Goals06Screen;
