import React from 'react';
import colors from '../../theme/colors';
import GoalsStatusScreen from '../../components/goals/GoalsStatusScreen';

export interface Goals11ScreenProps {
  readonly onLogin?: () => void;
}

export const Goals11Screen: React.FC<Goals11ScreenProps> = ({ onLogin }) => {
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
      demoHint="Estado DEMO · no se enviaron credenciales"
    />
  );
};

export default Goals11Screen;
