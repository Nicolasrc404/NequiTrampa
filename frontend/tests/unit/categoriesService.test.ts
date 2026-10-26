import test from 'node:test';
import assert from 'node:assert/strict';

import { ServiceContractError } from '../../src/services/contract';
import {
  createCategoriesService,
  normalizeCategoryName,
} from '../../src/services/categoriesService';
import { createFakeHttp } from './support/fakeHttp';

const CATEGORY = {
  id: 'cat_01',
  name: 'Mercado',
  type: 'gasto',
  isSystem: false,
  active: true,
  movementsCount: 5,
  totalAmountCents: 150000,
  currency: 'COP',
  createdAt: '2026-10-08T14:02:00Z',
  updatedAt: '2026-10-08T14:02:00Z',
};

test('list pasa includeInactive y valida lista', async () => {
  const fake = createFakeHttp(() => [CATEGORY]);
  const categories = await createCategoriesService(fake.http).list({ includeInactive: true });

  assert.equal(fake.calls[0].path, '/v1/categories');
  assert.deepEqual(fake.calls[0].options?.query, { includeInactive: true });
  assert.equal(categories.length, 1);
  assert.equal(categories[0].type, 'gasto');

  const notAList = createFakeHttp(() => null);
  await assert.rejects(
    createCategoriesService(notAList.http).list(),
    ServiceContractError,
  );
});

test('create envía name y type normalizados', async () => {
  const fake = createFakeHttp(() => CATEGORY);
  const category = await createCategoriesService(fake.http).create({
    name: '  Mercado  ',
    type: 'gasto',
  });

  assert.equal(fake.calls[0].method, 'POST');
  assert.deepEqual(fake.calls[0].body, { name: 'Mercado', type: 'gasto' });
  assert.equal(category.id, 'cat_01');
});

test('update solo envía campos cambiados y exige al menos uno', async () => {
  const fake = createFakeHttp(() => ({ ...CATEGORY, name: 'Supermercado' }));
  const updated = await createCategoriesService(fake.http).update('cat_01', { name: 'Supermercado' });

  assert.equal(fake.calls[0].method, 'PATCH');
  assert.equal(fake.calls[0].path, '/v1/categories/cat_01');
  assert.deepEqual(fake.calls[0].body, { name: 'Supermercado' });
  assert.equal(updated.name, 'Supermercado');

  const fake2 = createFakeHttp(() => CATEGORY);
  await assert.rejects(
    createCategoriesService(fake2.http).update('cat_01', {}),
    Error,
  );
});

test('deactivate hace DELETE y no espera cuerpo', async () => {
  const fake = createFakeHttp(() => undefined);
  await createCategoriesService(fake.http).deactivate('cat_01');

  assert.equal(fake.calls[0].method, 'DELETE');
  assert.equal(fake.calls[0].path, '/v1/categories/cat_01');
});

test('normaliza y rechaza categorías inválidas', async () => {
  assert.equal(normalizeCategoryName('Comida'), 'Comida');
  assert.throws(() => normalizeCategoryName('A'), Error);
  assert.throws(() => normalizeCategoryName('X'.repeat(50)), Error);

  const badCurrency = createFakeHttp(() => ({ ...CATEGORY, currency: 'USD' }));
  await assert.rejects(
    createCategoriesService(badCurrency.http).create({ name: 'Hola', type: 'gasto' }),
    ServiceContractError,
  );
});
