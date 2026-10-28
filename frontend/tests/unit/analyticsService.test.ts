import test from 'node:test';
import assert from 'node:assert/strict';

import { ServiceContractError } from '../../src/services/contract';
import { createAnalyticsService } from '../../src/services/analyticsService';
import { createFakeHttp } from './support/fakeHttp';

const SUMMARY = {
  period: '2026-10',
  periodLabel: 'Octubre de 2026',
  currency: 'COP',
  incomeCents: 3000000,
  expenseCents: 2000000,
  netCents: 1000000,
  movementCount: 15,
  averageDailyExpenseCents: 64516,
  previousPeriod: '2026-09',
  previousPeriodLabel: 'Septiembre de 2026',
  previousIncomeCents: 2900000,
  previousExpenseCents: 2200000,
  incomeChangePercent: 3,
  expenseChangePercent: -9,
  generatedAt: '2026-10-08T14:02:00Z',
};

const CATEGORIES = {
  period: '2026-10',
  periodLabel: 'Octubre de 2026',
  currency: 'COP',
  totalExpenseCents: 2000000,
  uncategorizedCents: 500000,
  categories: [
    {
      categoryId: 'cat_01',
      name: 'Mercado',
      amountCents: 1500000,
      percent: 75,
      movementCount: 10,
    },
    {
      categoryId: null,
      name: 'Sin categoría',
      amountCents: 500000,
      percent: 25,
      movementCount: 5,
    },
  ],
};

const TRENDS = {
  period: '2026-10',
  periodLabel: 'Octubre de 2026',
  currency: 'COP',
  weeks: [
    { week: 1, label: 'S1', incomeCents: 750000, expenseCents: 500000 },
    { week: 2, label: 'S2', incomeCents: 750000, expenseCents: 500000 },
    { week: 3, label: 'S3', incomeCents: 750000, expenseCents: 500000 },
    { week: 4, label: 'S4', incomeCents: 750000, expenseCents: 500000 },
  ],
};

test('summary acepta periodo opcional y valida periodo', async () => {
  const fake = createFakeHttp(() => SUMMARY);
  const summary = await createAnalyticsService(fake.http).summary('2026-10');

  assert.equal(fake.calls[0].path, '/v1/analytics/summary');
  assert.deepEqual(fake.calls[0].options?.query, { period: '2026-10' });
  assert.equal(summary.netCents, 1000000);

  const fake2 = createFakeHttp(() => SUMMARY);
  await createAnalyticsService(fake2.http).summary();
  assert.deepEqual(fake2.calls[0].options?.query, undefined);

  const fake3 = createFakeHttp(() => SUMMARY);
  await assert.rejects(createAnalyticsService(fake3.http).summary('2026'), Error);
});

test('categories y trends consultan sus endpoints', async () => {
  const fake = createFakeHttp((call) => {
    if (call.path === '/v1/analytics/categories') return CATEGORIES;
    if (call.path === '/v1/analytics/trends') return TRENDS;
    return SUMMARY;
  });

  const categories = await createAnalyticsService(fake.http).categories('2026-10');
  assert.equal(categories.uncategorizedCents, 500000);
  assert.equal(categories.categories[1].categoryId, null);

  const trends = await createAnalyticsService(fake.http).trends('2026-10');
  assert.equal(trends.weeks.length, 4);
});

test('analytics rechaza listas o moneda inválidas', async () => {
  const badCurrency = createFakeHttp(() => ({ ...SUMMARY, currency: 'USD' }));
  await assert.rejects(
    createAnalyticsService(badCurrency.http).summary('2026-10'),
    ServiceContractError,
  );

  const badCategories = createFakeHttp(() => ({ ...CATEGORIES, categories: null }));
  await assert.rejects(
    createAnalyticsService(badCategories.http).categories('2026-10'),
    ServiceContractError,
  );

  const badTrends = createFakeHttp(() => ({ ...TRENDS, weeks: {} }));
  await assert.rejects(
    createAnalyticsService(badTrends.http).trends('2026-10'),
    ServiceContractError,
  );
});
