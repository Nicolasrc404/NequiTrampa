import test from 'node:test';
import assert from 'node:assert/strict';

import { ServiceContractError } from '../../src/services/contract';
import {
  createAssistantService,
  MAX_ASSISTANT_MESSAGE_LENGTH,
  MIN_ASSISTANT_MESSAGE_LENGTH,
} from '../../src/services/assistantService';
import { createFakeHttp } from './support/fakeHttp';

const SUMMARY = {
  balanceCents: 750000,
  incomeCents: 300000,
  outcomeCents: 50000,
  recent: [
    {
      occurredAt: '2026-10-08T14:02:00Z',
      type: 'RECHARGE',
      amountCents: 150000,
      description: 'Recarga',
    },
  ],
};

const CHAT = {
  answer: 'Tu saldo es de $7.500.',
  source: 'rules',
  summary: {
    balanceCents: 750000,
    incomeCents: 300000,
    outcomeCents: 50000,
  },
};

test('getSummary consulta /v1/assistant/summary y valida los totales', async () => {
  const fake = createFakeHttp(() => SUMMARY);
  const summary = await createAssistantService(fake.http).getSummary();

  assert.equal(fake.calls[0].method, 'GET');
  assert.equal(fake.calls[0].path, '/v1/assistant/summary');
  assert.equal(summary.balanceCents, 750000);
  assert.equal(summary.recent.length, 1);
  assert.equal(summary.recent[0].amountCents, 150000);
});

test('chat recorta el mensaje, no envía Idempotency-Key y exige respuesta', async () => {
  const fake = createFakeHttp(() => CHAT);
  const chat = await createAssistantService(fake.http).chat(
    `  ${'hola'.repeat(10)}  `,
  );

  const call = fake.calls[0];
  assert.equal(call.method, 'POST');
  assert.equal(call.path, '/v1/assistant/chat');
  assert.deepEqual(call.body, { message: 'hola'.repeat(10) });
  assert.equal(call.options?.idempotencyKey, undefined);

  assert.equal(chat.answer, 'Tu saldo es de $7.500.');
  assert.equal(chat.summary.balanceCents, 750000);
});

test('chat valida la longitud del mensaje antes de llamar a la API', async () => {
  const fake = createFakeHttp(() => CHAT);
  const service = createAssistantService(fake.http);

  await assert.rejects(service.chat('a'), Error);
  await assert.rejects(service.chat('   '), Error);
  await assert.rejects(
    service.chat('x'.repeat(MAX_ASSISTANT_MESSAGE_LENGTH + 1)),
    Error,
  );
  assert.equal(fake.calls.length, 0);

  await service.chat('x'.repeat(MIN_ASSISTANT_MESSAGE_LENGTH));
  await service.chat('x'.repeat(MAX_ASSISTANT_MESSAGE_LENGTH));
  assert.equal(fake.calls.length, 2);
});

test('el asistente es estrictamente consultivo: no expone mutaciones', () => {
  const fake = createFakeHttp();
  const service = createAssistantService(fake.http);
  assert.deepEqual(Object.keys(service).sort(), ['chat', 'getSummary']);
});

test('getSummary admite saldo negativo pero no ingresos negativos', async () => {
  const negativeBalance = createFakeHttp(() => ({
    ...SUMMARY,
    balanceCents: -100,
  }));
  const summary = await createAssistantService(
    negativeBalance.http,
  ).getSummary();
  assert.equal(summary.balanceCents, -100);

  const negativeIncome = createFakeHttp(() => ({
    ...SUMMARY,
    incomeCents: -1,
  }));
  await assert.rejects(
    createAssistantService(negativeIncome.http).getSummary(),
    ServiceContractError,
  );
});

test('chat rechaza una respuesta sin summary o sin answer', async () => {
  const noSummary = createFakeHttp(() => ({
    answer: CHAT.answer,
    source: CHAT.source,
  }));
  await assert.rejects(
    createAssistantService(noSummary.http).chat('hola'),
    ServiceContractError,
  );

  const noAnswer = createFakeHttp(() => ({ ...CHAT, answer: '' }));
  await assert.rejects(
    createAssistantService(noAnswer.http).chat('hola'),
    ServiceContractError,
  );
});
