// ============================================================
// Servicio del asistente financiero
// ============================================================
// Contrato verificado en `src/Nequi.Assistant/Controllers/AssistantController.cs`:
//   GET  /v1/assistant/summary -> { balanceCents, incomeCents, outcomeCents, recent[] }
//   POST /v1/assistant/chat { message } -> { answer, source, summary{...} }
//
// El asistente es estrictamente consultivo. Este servicio no expone ninguna
// función de transferencia, recarga o escritura: si el modelo responde con una
// promesa de operación, la UI debe aclarar que no se ejecutó nada.

import type { HttpClient } from './http';
import {
  asRecord,
  optionalString,
  requireArray,
  requireSafeInteger,
  requireString,
} from './contract';
import { normalizeBaseUrl } from '../utils/url';

export const MAX_ASSISTANT_MESSAGE_LENGTH = 500;
export const MIN_ASSISTANT_MESSAGE_LENGTH = 2;

export interface AssistantMovementDto {
  readonly occurredAt: string;
  readonly type: string;
  readonly amountCents: number;
  readonly description: string | null;
}

export interface AssistantSummaryDto {
  readonly balanceCents: number;
  readonly incomeCents: number;
  readonly outcomeCents: number;
  readonly recent: readonly AssistantMovementDto[];
}

export interface AssistantChatDto {
  readonly answer: string;
  readonly source: string;
  readonly summary: Pick<
    AssistantSummaryDto,
    'balanceCents' | 'incomeCents' | 'outcomeCents'
  >;
}

export interface AssistantService {
  getSummary(options?: {
    readonly signal?: AbortSignal;
  }): Promise<AssistantSummaryDto>;
  chat(
    message: string,
    options?: { readonly signal?: AbortSignal },
  ): Promise<AssistantChatDto>;
}

function parseAssistantMovement(payload: unknown): AssistantMovementDto {
  const dto = asRecord(payload, 'assistant.movement');
  return {
    occurredAt: optionalString(dto, 'occurredAt') ?? '',
    type: optionalString(dto, 'type') ?? '',
    amountCents: requireSafeInteger(dto, 'amountCents'),
    description: optionalString(dto, 'description'),
  };
}

function parseTotals(dto: Readonly<Record<string, unknown>>): {
  readonly balanceCents: number;
  readonly incomeCents: number;
  readonly outcomeCents: number;
} {
  return {
    // Un saldo negativo no debe ocultarse: el backend puede representarlo.
    balanceCents: requireSafeInteger(dto, 'balanceCents'),
    incomeCents: requireSafeInteger(dto, 'incomeCents', { min: 0 }),
    outcomeCents: requireSafeInteger(dto, 'outcomeCents', { min: 0 }),
  };
}

function parseSummary(payload: unknown): AssistantSummaryDto {
  const dto = asRecord(payload, 'assistant.summary');
  const totals = parseTotals(dto);
  return {
    ...totals,
    recent: requireArray(dto, 'recent').map(parseAssistantMovement),
  };
}

function parseChat(payload: unknown): AssistantChatDto {
  const dto = asRecord(payload, 'assistant.chat');
  const summary = asRecord(dto.summary, 'assistant.chat.summary');
  return {
    answer: requireString(dto, 'answer'),
    source: requireString(dto, 'source'),
    summary: parseTotals(summary),
  };
}

export function createAssistantService(http: HttpClient): AssistantService {
  if (!normalizeBaseUrl(http.baseUrl)) {
    throw new Error('createAssistantService: cliente HTTP sin URL base válida.');
  }

  return {
    async getSummary(options) {
      const payload = await http.get<unknown>('/v1/assistant/summary', {
        signal: options?.signal,
      });
      return parseSummary(payload);
    },

    async chat(message, options) {
      const trimmed = message.trim();
      if (
        trimmed.length < MIN_ASSISTANT_MESSAGE_LENGTH ||
        trimmed.length > MAX_ASSISTANT_MESSAGE_LENGTH
      ) {
        throw new Error(
          `La pregunta debe tener entre ${MIN_ASSISTANT_MESSAGE_LENGTH} y ${MAX_ASSISTANT_MESSAGE_LENGTH} caracteres.`,
        );
      }
      // POST de solo lectura: no requiere Idempotency-Key ni ejecuta operaciones.
      const payload = await http.post<unknown>(
        '/v1/assistant/chat',
        { message: trimmed },
        { signal: options?.signal },
      );
      return parseChat(payload);
    },
  };
}
