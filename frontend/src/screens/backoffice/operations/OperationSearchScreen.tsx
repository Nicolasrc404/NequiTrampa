import React, { useState } from 'react';
import { useNav } from '../../../navigation/nav';
import { BoButton, BoInput, BoScreen, ReadOnlyNote } from '../../../components/backoffice/ui';
import { OperationArea } from '../../../types/backoffice';

const NOTE = 'Solo consulta · no modifica saldos ni registros.';

export function OperationSearchScreen({ area }: { area: OperationArea }) {
  const nav = useNav();
  const [id, setId] = useState('');
  const go = () => id.trim() && nav.push({ name: 'operation', id: id.trim(), tab: 'detail', area });
  return (
    <BoScreen
      title={area === 'support' ? 'Investigación de operación' : 'Operaciones financieras'}
      subtitle={area === 'support' ? 'Investigación' : 'Operador financiero'}
      badge={area === 'support' ? 'SOPORTE' : 'OPERADOR'}
      onBack={nav.back}
    >
      <BoInput
        label="Identificador de operación"
        value={id}
        onChangeText={setId}
        placeholder="Referencia pública o ID de la operación"
        returnKeyType="search"
        onSubmitEditing={go}
      />
      <BoButton label="Consultar" disabled={!id.trim()} onPress={go} />
      <ReadOnlyNote>{NOTE}</ReadOnlyNote>
    </BoScreen>
  );
}
