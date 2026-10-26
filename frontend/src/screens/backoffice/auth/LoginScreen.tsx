import React, { useState } from 'react';
import { Text, View } from 'react-native';
import colors from '../../../theme/colors';
import { signIn } from '../../../api/auth';
import { useAction } from '../../../hooks/useAsync';
import { BoButton, BoInput, BoScreen, Card, InlineError } from '../../../components/backoffice/ui';

export function LoginScreen({ notice }: { notice?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const action = useAction(signIn);

  return (
    <BoScreen title="Backoffice" subtitle="NequiTrampa · acceso de personal">
      <View style={{ height: 8 }} />
      <Card>
        {notice ? <Text style={{ color: colors.boWarnText, fontWeight: '700' }}>{notice}</Text> : null}
        <BoInput label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" textContentType="username" />
        <View style={{ height: 8 }} />
        <BoInput label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" />
      </Card>
      <InlineError error={action.error} />
      <BoButton label="Iniciar sesión" busy={action.busy} disabled={!email.trim() || !password} onPress={() => action.run(email.trim(), password)} />
    </BoScreen>
  );
}
