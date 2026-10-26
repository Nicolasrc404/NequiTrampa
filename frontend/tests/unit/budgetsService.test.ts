import test from 'node:test';
import assert from 'node:assert/strict';

import { ServiceContractError } from '../../src/services/contract';
import { createBudgetsService } from '../../src/services/budgetsService';
import { createFakeHttp } from './support/fakeHttp';

const BUDGET = {
  id: 'bud_01',
  categoryId: 'cat_01',
  categoryName: 'Mercado',
  period: '2026-10',
  limitCents: 500000,
  spentCents: 250000,
  remainingCents: 250000,
  percent: 50,
  health: 'on-track',
  currency: 'COP',
  active: true,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-08T14:02:00Z',
};

const DETAIL = {
  ...BUDGET,
  daysRemaining: 23,
  dailySuggestedCents: 10870,
  expenses: [
    {
      id: 'exp_01',
      merchant: 'Supermercado',
      amountCents: 50000,
      occurredAt: '2026-10-07T10:00:00Z',
    },
  ],
};

test('list filtra por periodo y valida lista', async () => {
  const fake = createFakeHttp(() => [BUDGET]);
  const budgets = await createBudgetsService(fake.http).list({ period: '2026-10' });

  assert.equal(fake.calls[0].path, '/v1/budgets');
  assert.deepEqual(fake.calls[0].options?.query, { period: '2026-10' });
  assert.equal(budgets[0].health, 'on-track');

  const notAList = createFakeHttp(() => {});
  await assert.rejects(
    createBudgetsService(notAList.http).list(),
    ServiceContractError,
  );
});

test('getById obtiene detalle con gastos', async () => {
  const fake = createFakeHttp(() => DETAIL);
  const detail = await createBudgetsService(fake.http).getById('bud_01');

  assert.equal(fake.calls[0].path, '/v1/budgets/bud_01');
  assert.equal(detail.daysRemaining, 23);
  assert.equal(detail.expenses.length, 1);
});

test('create valida periodo y monto', async () => {
  const fake = createFakeHttp(() => BUDGET);
  const budget = await createBudgetsService(fake.http).create({
    categoryId: 'cat_01',
    period: '2026-10',
    limitCents: 500000,
  });

  assert.equal(fake.calls[0].method, 'POST');
  assert.deepEqual(fake.calls[0].body, { categoryId: 'cat_01', period: '2026-10', limitCents: 500000 });
  assert.equal(budget.id, 'bud_01');

  const fake2 = createFakeHttp(() => BUDGET);
  const service = createBudgetsService(fake2.http);
  await assert.rejects(service.create({ categoryId: 'cat_01', period: '10-2026', limitCents: 500000 }), Error);
  await assert.rejects(service.create({ categoryId: 'cat_01', period: '2026-10', limitCents: 0 }), Error);
  await assert.rejects(service.create({ categoryId: 'cat_01', period: '2026-10', limitCents: 100.5 }), Error);
});

test('update solo permite cambiar limitCents', async () => {
  const fake = createFakeHttp(() => ({ ...BUDGET, limitCents: 600000 }));
  const updated = await createBudgetsService(fake.http).update('bud_01', { limitCents: 600000 });

  assert.equal(fake.calls[0].method, 'PATCH');
  assert.equal(fake.calls[0].path, '/v1/budgets/bud_01');
  assert.deepEqual(fake.calls[0].body, { limitCents: 600000 });
  assert.equal(updated.limitCents, 600000);
});
