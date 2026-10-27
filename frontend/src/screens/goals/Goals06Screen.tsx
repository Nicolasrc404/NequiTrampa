import React from 'react';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';

export interface Goals06ScreenProps {
  readonly onLogin?: () => void;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Goals06Screen: React.FC<Goals06ScreenProps> = ({
  onLogin,
  demo = true,
}) => {
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
      demoHint={demo ? 'Estado DEMO · no se enviaron credenciales' : undefined}
    />
  );
};

export default Goals06Screen;
