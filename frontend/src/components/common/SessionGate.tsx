import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import colors from '../../theme/colors';
import { sessionManager } from '../../services/session/platform';
import { asAuthError } from '../../services/session/errors';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setAuthMessage(null);
    try {
      await sessionManager.signIn(email.trim(), password);
      setPassword('');
    } catch (error) {
      setAuthMessage(asAuthError(error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{copy.badge}</Text>
        </View>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>

        {reason === 'signed-out' ? (
          <View style={styles.form}>
            <TextInput
              accessibilityLabel="Correo electrónico"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="Correo electrónico"
              placeholderTextColor={colors.graySub}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              editable={!submitting}
            />
            <TextInput
              accessibilityLabel="Contraseña"
              autoCapitalize="none"
              autoComplete="password"
              placeholder="Contraseña"
              placeholderTextColor={colors.graySub}
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
              onSubmitEditing={submit}
            />
            {authMessage ? <Text style={styles.error}>{authMessage}</Text> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Iniciar sesión"
              disabled={!canSubmit}
              onPress={submit}
              style={({ pressed }) => [
                styles.action,
                !canSubmit ? styles.actionDisabled : null,
                pressed ? styles.actionPressed : null,
              ]}
            >
              {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.actionText}>Iniciar sesión</Text>}
            </Pressable>
          </View>
        ) : null}

        {reason !== 'signed-out' && copy.action && onRetry ? (
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
  actionDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  form: {
    gap: 10,
    marginTop: 4,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.grayBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: colors.navy,
    backgroundColor: colors.white,
    fontSize: 15,
  },
  error: {
    color: colors.status401LockStroke,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default SessionGate;
