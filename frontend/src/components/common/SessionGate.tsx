import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { sessionManager } from '../../services/session/platform';
import { asAuthError } from '../../services/session/errors';
import { registrationClient } from '../../services/session/registration';
import { asApiError } from '../../services/http/ApiError';

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
        body: 'Ingresa con tu correo y contraseña. Las cuentas no registradas son rechazadas.',
        action: 'Volver a comprobar',
      };
  }
}

/**
 * Gate de sesión para builds sin modo DEMO. Cuando `reason === 'signed-out'`
 * usa el diseño de Access_01 (Figma) y llama a sessionManager.signIn real.
 */
export const SessionGate: React.FC<SessionGateProps> = ({
  reason,
  onRetry,
  testID = 'session-gate',
}) => {
  const copy = copyFor(reason);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerShowPassword, setRegisterShowPassword] = useState(false);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);

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

  const canSubmitRegister =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    registerEmail.trim().length > 0 &&
    registerPassword.length >= 8 &&
    registerConfirmPassword.length > 0 &&
    !registerSubmitting;

  const submitRegister = async () => {
    if (!canSubmitRegister) return;
    if (registerPassword !== registerConfirmPassword) {
      setRegisterMessage('Las contraseñas no coinciden.');
      return;
    }
    setRegisterSubmitting(true);
    setRegisterMessage(null);
    try {
      await registrationClient.register({
        email: registerEmail.trim(),
        password: registerPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      await sessionManager.signIn(registerEmail.trim(), registerPassword);
      setEmail(registerEmail.trim());
      setRegisterPassword('');
      setRegisterConfirmPassword('');
    } catch (error) {
      setRegisterMessage(asApiError(error).toUserMessage().message);
    } finally {
      setRegisterSubmitting(false);
    }
  };

  if (reason === 'signed-out' && showRegister) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.card}>
          <View style={styles.personIconCircle}>
            <Feather name="user-plus" size={26} color={colors.navy} />
          </View>
          <Text style={styles.title}>Crea tu cuenta</Text>
          <Text style={styles.subtitle}>
            Regístrate con tu correo para empezar a usar tu billetera.
          </Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            accessibilityLabel="Nombre"
            placeholder="Juan"
            placeholderTextColor={colors.grayPlaceholder}
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            editable={!registerSubmitting}
          />

          <Text style={styles.label}>Apellido</Text>
          <TextInput
            accessibilityLabel="Apellido"
            placeholder="Pérez"
            placeholderTextColor={colors.grayPlaceholder}
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            editable={!registerSubmitting}
          />

          <Text style={styles.label}>Correo</Text>
          <TextInput
            accessibilityLabel="Correo"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="ejemplo@correo.com"
            placeholderTextColor={colors.grayPlaceholder}
            style={styles.input}
            value={registerEmail}
            onChangeText={setRegisterEmail}
            editable={!registerSubmitting}
          />

          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.secretRow}>
            <TextInput
              accessibilityLabel="Contraseña"
              autoCapitalize="none"
              autoComplete="password-new"
              placeholderTextColor={colors.grayPlaceholder}
              secureTextEntry={!registerShowPassword}
              style={[styles.input, styles.secretInput]}
              value={registerPassword}
              onChangeText={setRegisterPassword}
              editable={!registerSubmitting}
            />
            <Pressable onPress={() => setRegisterShowPassword((prev) => !prev)} style={styles.show}>
              <Text style={styles.link}>{registerShowPassword ? 'Ocultar' : 'Ver'}</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Confirmar contraseña</Text>
          <TextInput
            accessibilityLabel="Confirmar contraseña"
            autoCapitalize="none"
            autoComplete="password-new"
            placeholderTextColor={colors.grayPlaceholder}
            secureTextEntry={!registerShowPassword}
            style={styles.input}
            value={registerConfirmPassword}
            onChangeText={setRegisterConfirmPassword}
            editable={!registerSubmitting}
            onSubmitEditing={submitRegister}
          />

          {registerMessage ? <Text style={styles.error}>{registerMessage}</Text> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crear cuenta"
            disabled={!canSubmitRegister}
            onPress={submitRegister}
            style={({ pressed }) => [
              styles.action,
              !canSubmitRegister ? styles.actionDisabled : null,
              pressed ? styles.actionPressed : null,
            ]}
          >
            {registerSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.actionText}>Crear cuenta</Text>}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={() => { setShowRegister(false); setRegisterMessage(null); }}
            style={({ pressed }) => [styles.secondaryAction, pressed ? styles.secondaryActionPressed : null]}
          >
            <Text style={styles.secondaryActionText}>Volver</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (reason === 'signed-out' && showForgotPassword) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.card}>
          <Text style={styles.title}>Recuperar contraseña</Text>
          <Text style={styles.body}>
            Esta función todavía no está disponible. Por ahora, contacta a soporte para restablecer tu contraseña.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={() => setShowForgotPassword(false)}
            style={({ pressed }) => [styles.secondaryAction, pressed ? styles.secondaryActionPressed : null]}
          >
            <Text style={styles.secondaryActionText}>Volver</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (reason === 'signed-out') {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.card}>
          <View style={styles.personIconCircle}>
            <Feather name="user" size={26} color={colors.navy} />
          </View>
          <Text style={styles.title}>Ingresa a tu cuenta</Text>
          <Text style={styles.subtitle}>
            Usa tu correo y contraseña para ver tu saldo y mover tu dinero.
          </Text>

          <Text style={styles.label}>Correo o celular</Text>
          <TextInput
            accessibilityLabel="Correo o celular"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="ejemplo@correo.com"
            placeholderTextColor={colors.grayPlaceholder}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            editable={!submitting}
          />

          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.secretRow}>
            <TextInput
              accessibilityLabel="Contraseña"
              autoCapitalize="none"
              autoComplete="password"
              placeholderTextColor={colors.grayPlaceholder}
              secureTextEntry={!showPassword}
              style={[styles.input, styles.secretInput]}
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
              onSubmitEditing={submit}
            />
            <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.show}>
              <Text style={styles.link}>{showPassword ? 'Ocultar' : 'Ver'}</Text>
            </Pressable>
          </View>

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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Olvidé mi contraseña"
            onPress={() => setShowForgotPassword(true)}
            style={({ pressed }) => [styles.secondaryAction, pressed ? styles.secondaryActionPressed : null]}
          >
            <Text style={styles.secondaryActionText}>Olvidé mi contraseña</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="¿No tienes cuenta? Regístrate"
            onPress={() => setShowRegister(true)}
            style={styles.inlineLink}
          >
            <Text style={styles.inlineLinkText}>
              ¿No tienes cuenta? <Text style={styles.inlineLinkTextStrong}>Regístrate</Text>
            </Text>
          </Pressable>

          <Text style={styles.legal}>
            Al ingresar aceptas los términos y la política de privacidad.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{copy.badge}</Text>
        </View>
        <Text style={styles.gateTitle}>{copy.title}</Text>
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
  personIconCircle: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.stateIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.graySub,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  gateTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.stateTitle,
  },
  label: {
    color: colors.graySub,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 7,
  },
  secretRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secretInput: {
    flex: 1,
  },
  show: {
    marginLeft: -64,
    padding: 12,
  },
  link: {
    color: colors.magenta,
    fontWeight: '800',
    fontSize: 12,
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
  secondaryAction: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.magenta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryActionPressed: {
    backgroundColor: colors.magentaLight,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.magenta,
  },
  inlineLink: {
    marginTop: 14,
    alignItems: 'center',
  },
  inlineLinkText: {
    fontSize: 13,
    color: colors.graySub,
  },
  inlineLinkTextStrong: {
    color: colors.magenta,
    fontWeight: '800',
  },
  legal: {
    marginTop: 14,
    fontSize: 11,
    lineHeight: 16,
    color: colors.graySub,
    textAlign: 'center',
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
