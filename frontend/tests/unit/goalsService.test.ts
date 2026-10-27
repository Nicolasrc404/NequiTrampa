import test from 'node:test';
import assert from 'node:assert/strict';

import { ServiceContractError } from '../../src/services/contract';
import { createGoalsService } from '../../src/services/goalsService';
import { createFakeHttp } from './support/fakeHttp';

const GOAL = {
  id: 'goal_01',
  name: 'Viaje',
  targetCents: 2000000,
  savedCents: 500000,
  percent: 25,
  isAchieved: false,
  targetDate: '2026-12-31',
  daysRemaining: 84,
  currency: 'COP',
  active: true,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-08T14:02:00Z',
};

test('list devuelve metas validadas', async () => {
  const fake = createFakeHttp(() => [GOAL]);
  const goals = await createGoalsService(fake.http).list();

  assert.equal(fake.calls[0].path, '/v1/goals');
  assert.equal(goals.length, 1);
  assert.equal(goals[0].percent, 25);

  const notAList = createFakeHttp(() => null);
  await assert.rejects(
    createGoalsService(notAList.http).list(),
    ServiceContractError,
  );
});

test('getById obtiene meta', async () => {
  const fake = createFakeHttp(() => GOAL);
  const goal = await createGoalsService(fake.http).getById('goal_01');

  assert.equal(fake.calls[0].path, '/v1/goals/goal_01');
  assert.equal(goal.name, 'Viaje');
});

test('create valida nombre, monto y fecha', async () => {
  const fake = createFakeHttp(() => GOAL);
  const goal = await createGoalsService(fake.http).create({
    name: '  Viaje  ',
    targetCents: 2000000,
    targetDate: '2026-12-31',
  });

  assert.equal(fake.calls[0].method, 'POST');
  assert.deepEqual(fake.calls[0].body, { name: 'Viaje', targetCents: 2000000, targetDate: '2026-12-31' });
  assert.equal(goal.id, 'goal_01');

  const fake2 = createFakeHttp(() => GOAL);
  const service = createGoalsService(fake2.http);
  await assert.rejects(service.create({ name: 'A', targetCents: 2000000, targetDate: '2026-12-31' }), Error);
  await assert.rejects(service.create({ name: 'Viaje', targetCents: 0, targetDate: '2026-12-31' }), Error);
  await assert.rejects(service.create({ name: 'Viaje', targetCents: 2000000, targetDate: '31-12-2026' }), Error);
});

test('update permite editar campos incluyendo savedCents declarado', async () => {
  const fake = createFakeHttp(() => ({ ...GOAL, savedCents: 750000, percent: 38 }));
  const updated = await createGoalsService(fake.http).update('goal_01', { savedCents: 750000 });

  assert.equal(fake.calls[0].method, 'PATCH');
  assert.equal(fake.calls[0].path, '/v1/goals/goal_01');
  assert.deepEqual(fake.calls[0].body, { savedCents: 750000 });
  assert.equal(updated.savedCents, 750000);

  const fake2 = createFakeHttp(() => GOAL);
  await assert.rejects(createGoalsService(fake2.http).update('goal_01', {}), Error);
  await assert.rejects(createGoalsService(fake2.http).update('goal_01', { savedCents: -1 }), Error);
});

test('update rechaza fecha y objetivo inválidos antes de llamar al Gateway', async () => {
  const fake = createFakeHttp(() => GOAL);
  const service = createGoalsService(fake.http);

  await assert.rejects(service.update('goal_01', { targetCents: 0 }), Error);
  await assert.rejects(service.update('goal_01', { targetDate: '31-12-2026' }), Error);
  assert.equal(fake.calls.length, 0);
});
