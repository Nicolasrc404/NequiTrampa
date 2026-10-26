import React, { useState } from 'react';
import { requireBackoffice } from '../../services/api';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { idempotencyKeys } from '../../utils/idempotency';

import { useNav } from '../../navigation/nav';
import { BoButton, BoInput, BoScreen, InlineError, ReadOnlyNote, SuccessBanner } from '../../components/backoffice/ui';
import { OperationDto } from '../../types/backoffice';
import { ReversalCard } from './ReversalCard';

export function ReversalCreateScreen({ operationId }: { operationId?: string }) {
  const nav = useNav();
  const [opId, setOpId] = useState(operationId ?? '');
  const [reason, setReason] = useState('');
  // La clave identifica la intención (operación + motivo): un reintento del mismo
  // envío la reutiliza y cambiar el contenido genera otra distinta.
  const action = useAsyncAction((operation: string, why: string) =>
    requireBackoffice().finance.createReversal(operation, why, {
      idempotencyKey: idempotencyKeys.acquire(`backoffice:reversal:${operation}:${why}`),
    }),
  );
  const [created, setCreated] = useState<OperationDto | null>(null);

  const valid = opId.trim().length > 0 && reason.trim().length >= 5;

  return (
    <BoScreen title="Solicitud de reverso" subtitle="Operador financiero" badge="OPERADOR" onBack={nav.back}>
      {created ? (
        <>
          <SuccessBanner title="Reverso creado" message="El reverso se registró y conserva la operación original y su historial." />
          <ReversalCard r={created} />
          <BoButton label="Ver reverso" onPress={() => nav.replace({ name: 'reversalDetail', id: created.publicReference })} />
        </>
      ) : (
        <>
          <BoInput label="Operación original" value={opId} onChangeText={setOpId} placeholder="Referencia pública o ID" />
          <BoInput
            label="Motivo (5–256 caracteres)"
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={256}
            autoCapitalize="sentences"
          />
          <InlineError error={action.error} />
          <BoButton
            label="Solicitar reverso"
            variant="danger"
            busy={action.isSubmitting}
            disabled={!valid}
            onPress={async () => {
              const r = await action.execute(opId.trim(), reason.trim());
              if (r) setCreated(r);
            }}
          />
          <ReadOnlyNote>Conserva la operación original y su historial. Genera una operación compensatoria.</ReadOnlyNote>
        </>
      )}
    </BoScreen>
  );
}
