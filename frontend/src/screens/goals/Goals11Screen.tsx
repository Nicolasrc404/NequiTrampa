import React from 'react';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';

export interface Goals11ScreenProps {
  readonly onLogin?: () => void;
  /** `true` solo en modo demostración. */
  readonly demo?: boolean;
}

export const Goals11Screen: React.FC<Goals11ScreenProps> = ({
  onLogin,
  demo = true,
}) => {
  return (
    <GoalsStatusScreen
      icon="lock"
      iconBackground={colors.goalsWarningCircle}
      iconColor={colors.goalsWarningIconAlt}
      iconWrapperSize={80}
      iconSize={32}
      title="Tu sesión venció"
      titleSize={24}
      description="Por seguridad cerramos tu sesión. Inicia sesión de nuevo para editar tu meta."
      primaryLabel="Iniciar sesión"
      onPrimary={onLogin}
      demoHint={demo ? 'Estado DEMO · no se enviaron credenciales' : undefined}
    />
  );
};

export default Goals11Screen;
