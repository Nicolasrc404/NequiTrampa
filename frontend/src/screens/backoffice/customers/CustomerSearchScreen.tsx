import React, { useState } from 'react';
import { useNav } from '../../../navigation/nav';
import { BoButton, BoInput, BoScreen, ReadOnlyNote } from '../../../components/backoffice/ui';

const NOTE = 'Solo consulta · no modifica datos ni saldos';

export function CustomerSearchScreen() {
  const nav = useNav();
  const [id, setId] = useState('');
  return (
    <BoScreen title="Consulta de clientes" subtitle="Customer Lookup" badge="SOPORTE" onBack={nav.back}>
      <BoInput
        label="ID del cliente"
        value={id}
        onChangeText={setId}
        placeholder="client_id, código de transferencia o uid"
        returnKeyType="search"
        onSubmitEditing={() => id.trim() && nav.push({ name: 'customerProfile', id: id.trim() })}
      />
      <BoButton label="Consultar" disabled={!id.trim()} onPress={() => nav.push({ name: 'customerProfile', id: id.trim() })} />
      <ReadOnlyNote>{NOTE}</ReadOnlyNote>
    </BoScreen>
  );
}
