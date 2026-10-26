import React, { useState } from 'react';
import { Text, View } from 'react-native';
import colors from '../../theme/colors';
import { sessionManager } from '../../services/session/platform';
import { asAuthError } from '../../services/session';
import { BoButton, BoInput, BoScreen, Card, InlineMessage } from '../../components/backoffice/ui';

interface Props {
  notice?: string;
  /** Se llama tras un inicio de sesión exitoso (para mostrar el correo en el inicio). */
  onSignedIn?: (email: string) => void;
}

export function LoginScreen({ notice, onSignedIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await sessionManager.signIn(email.trim(), password);
      onSignedIn?.(email.trim());
    } catch (e) {
      setError(asAuthError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <BoScreen title="Backoffice" subtitle="NequiTrampa · acceso de personal">
      <View style={{ height: 8 }} />
      <Card>
        {notice ? <Text style={{ color: colors.boWarnText, fontWeight: '700' }}>{notice}</Text> : null}
        <BoInput label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" textContentType="username" />
        <View style={{ height: 8 }} />
        <BoInput label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" />
      </Card>
      <InlineMessage message={error} />
      <BoButton label="Iniciar sesión" busy={busy} disabled={!email.trim() || !password} onPress={submit} />
    </BoScreen>
  );
}
