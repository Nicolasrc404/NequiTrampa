import React, { useRef, useState } from 'react';
import { financeApi } from '../../api/backoffice';
import { newIdempotencyKey } from '../../api/http';
import { useAction } from '../../hooks/useAsync';
import { useNav } from '../../navigation/nav';
import { BoButton, BoInput, BoScreen, InlineError, ReadOnlyNote, SuccessBanner } from '../../components/backoffice/ui';
import { OperationDto } from '../../types/backoffice';
import { ReversalCard } from './ReversalCard';

export function ReversalCreateScreen({ operationId }: { operationId?: string }) {
  const nav = useNav();
  const [opId, setOpId] = useState(operationId ?? '');
  const [reason, setReason] = useState('');
  // Misma llave al reintentar el mismo envío; nueva llave si cambia el contenido.
  const key = useRef(newIdempotencyKey());
  const action = useAction((o: string, r: string, k: string) => financeApi.reverse(o, r, k));
  const [created, setCreated] = useState<OperationDto | null>(null);

  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    key.current = newIdempotencyKey();
    set(v);
  };
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
          <BoInput label="Operación original" value={opId} onChangeText={edit(setOpId)} placeholder="Referencia pública o ID" />
          <BoInput
            label="Motivo (5–256 caracteres)"
            value={reason}
            onChangeText={edit(setReason)}
            multiline
            maxLength={256}
            autoCapitalize="sentences"
          />
          <InlineError error={action.error} />
          <BoButton
            label="Solicitar reverso"
            variant="danger"
            busy={action.busy}
            disabled={!valid}
            onPress={async () => {
              const r = await action.run(opId.trim(), reason.trim(), key.current);
              if (r) setCreated(r);
            }}
          />
          <ReadOnlyNote>Conserva la operación original y su historial. Genera una operación compensatoria.</ReadOnlyNote>
        </>
      )}
    </BoScreen>
  );
}
