import React from 'react';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';

export interface Goals02ScreenProps {
  readonly onLogin?: () => void;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Goals02Screen: React.FC<Goals02ScreenProps> = ({ onLogin, demo = true }) => {
  return (
    <GoalsStatusScreen
      icon="lock"
      iconBackground={colors.goalsWarningBg}
      iconColor={colors.goalsWarningIcon}
      iconWrapperSize={96}
      iconSize={40}
      title="Tu sesión venció"
      description="Por seguridad cerramos tu sesión. Inicia sesión de nuevo para ver tus metas."
      primaryLabel="Iniciar sesión"
      onPrimary={onLogin}
      demoHint={demo ? 'Estado DEMO · no se enviaron credenciales' : undefined}
    />
  );
};

export default Goals02Screen;
