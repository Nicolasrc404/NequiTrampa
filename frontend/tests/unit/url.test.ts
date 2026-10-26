import test from 'node:test';
import assert from 'node:assert/strict';

import { buildUrl, normalizeBaseUrl } from '../../src/utils/url';

test('buildUrl une la ruta con o sin barra inicial', () => {
  assert.equal(
    buildUrl('https://api.test', '/v1/wallet'),
    'https://api.test/v1/wallet',
  );
  assert.equal(
    buildUrl('https://api.test/', 'v1/wallet'),
    'https://api.test/v1/wallet',
  );
});

test('buildUrl serializa solo parámetros con valor', () => {
  assert.equal(
    buildUrl('https://api.test', '/v1/movements', {
      page: 1,
      active: false,
      zero: 0,
      empty: '',
      missing: undefined,
      none: null,
    }),
    'https://api.test/v1/movements?page=1&active=false&zero=0',
  );
});

test('buildUrl codifica claves y valores', () => {
  assert.equal(
    buildUrl('https://api.test', '/v1/search', { q: 'a b&c=d' }),
    'https://api.test/v1/search?q=a%20b%26c%3Dd',
  );
});

test('normalizeBaseUrl admite rutas base', () => {
  assert.equal(
    normalizeBaseUrl('https://host.example.com/api/'),
    'https://host.example.com/api',
  );
  assert.equal(normalizeBaseUrl(null), null);
});
