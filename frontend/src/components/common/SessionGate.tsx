import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import colors from '../../theme/colors';

export type SessionGateReason = 'signed-out' | 'unavailable' | 'configuration';

export interface SessionGateProps {
  readonly reason: SessionGateReason;
  readonly onRetry?: () => void;
  readonly testID?: string;
}

interface GateCopy {
  readonly badge: string;
  readonly title: string;
  readonly body: string;
  readonly action: string | null;
}

function copyFor(reason: SessionGateReason): GateCopy {
  switch (reason) {
    case 'configuration':
      return {
        badge: 'CONFIGURACIÓN',
        title: 'La app no está configurada',
        body: 'Falta la URL del API o la clave pública de autenticación. Revisa las variables EXPO_PUBLIC_* del build.',
        action: null,
      };
    case 'unavailable':
      return {
        badge: 'SIN CONEXIÓN',
        title: 'No pudimos validar tu sesión',
        body: 'Revisa tu conexión e inténtalo de nuevo. Tus datos no se muestran hasta confirmar la sesión con el servidor.',
        action: 'Reintentar',
      };
    case 'signed-out':
    default:
      return {
        badge: 'SESIÓN REQUERIDA',
        title: 'Inicia sesión para continuar',
        body: 'Esta versión todavía no incluye la pantalla de inicio de sesión. Por seguridad, la app no muestra movimientos ni permite operaciones sin una sesión válida.',
        action: 'Volver a comprobar',
      };
  }
}

/**
 * Gate de sesión para builds sin modo DEMO.
 * No es una pantalla de login: no captura credenciales ni simula autenticación.
 * La pantalla real de login queda BLOQUEADA hasta contar con diseño en Stitch.
 */
export const SessionGate: React.FC<SessionGateProps> = ({
  reason,
  onRetry,
  testID = 'session-gate',
}) => {
  const copy = copyFor(reason);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{copy.badge}</Text>
        </View>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>

        {copy.action && onRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.action}
            onPress={onRetry}
            style={({ pressed }) => [
              styles.action,
              pressed ? styles.actionPressed : null,
            ]}
          >
            <Text style={styles.actionText}>{copy.action}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stateBorder,
    gap: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.stateIconBg,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.status401LockStroke,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.stateTitle,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.stateBody,
  },
  action: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: colors.magenta,
  },
  actionPressed: {
    backgroundColor: colors.magentaHover,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});

export default SessionGate;
