import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  MAX_REQUEST_TIMEOUT_MS,
  MIN_REQUEST_TIMEOUT_MS,
  normalizeBaseUrl,
  resolveAppConfig,
} from '../../src/config/appConfig';

test('el modo DEMO está activo por defecto en desarrollo', () => {
  const config = resolveAppConfig({ isDev: true, env: {} });
  assert.equal(config.demoModeEnabled, true);
  assert.equal(config.demoModeBlockedInProduction, false);
  assert.equal(config.environmentLabel, 'development');
});

test('el modo DEMO se desactiva explícitamente en desarrollo', () => {
  for (const value of ['false', 'FALSE', '0', 'no', 'off']) {
    const config = resolveAppConfig({
      isDev: true,
      env: { EXPO_PUBLIC_DEMO_MODE: value },
    });
    assert.equal(config.demoModeEnabled, false, `valor: ${value}`);
  }
});

test('el modo DEMO nunca se activa fuera de desarrollo', () => {
  const config = resolveAppConfig({
    isDev: false,
    env: { EXPO_PUBLIC_DEMO_MODE: 'true' },
  });
  assert.equal(config.demoModeEnabled, false);
  assert.equal(config.demoModeBlockedInProduction, true);
  assert.equal(config.environmentLabel, 'production');
});

test('en producción sin pedir DEMO no se marca bloqueo', () => {
  const config = resolveAppConfig({ isDev: false, env: {} });
  assert.equal(config.demoModeEnabled, false);
  assert.equal(config.demoModeBlockedInProduction, false);
});

test('normalizeBaseUrl valida y recorta la URL del gateway', () => {
  assert.equal(normalizeBaseUrl('https://api.example.com/'), 'https://api.example.com');
  assert.equal(normalizeBaseUrl('  http://localhost:8080  '), 'http://localhost:8080');
  assert.equal(
    normalizeBaseUrl('https://host.example.com/nequi///'),
    'https://host.example.com/nequi',
  );
  assert.equal(normalizeBaseUrl(''), null);
  assert.equal(normalizeBaseUrl(undefined), null);
  assert.equal(normalizeBaseUrl('ftp://api.example.com'), null);
  assert.equal(normalizeBaseUrl('api.example.com'), null);
  assert.equal(normalizeBaseUrl('not a url'), null);
});

test('la configuración reporta si la API está disponible', () => {
  const configured = resolveAppConfig({
    isDev: true,
    env: { EXPO_PUBLIC_API_URL: 'https://api.example.com/' },
  });
  assert.equal(configured.apiBaseUrl, 'https://api.example.com');
  assert.equal(configured.apiConfigured, true);

  const missing = resolveAppConfig({ isDev: true, env: {} });
  assert.equal(missing.apiBaseUrl, null);
  assert.equal(missing.apiConfigured, false);
});

test('el timeout se acota a un rango seguro', () => {
  assert.equal(
    resolveAppConfig({ isDev: true, env: {} }).requestTimeoutMs,
    DEFAULT_REQUEST_TIMEOUT_MS,
  );
  assert.equal(
    resolveAppConfig({
      isDev: true,
      env: { EXPO_PUBLIC_API_TIMEOUT_MS: '20000' },
    }).requestTimeoutMs,
    20000,
  );
  assert.equal(
    resolveAppConfig({
      isDev: true,
      env: { EXPO_PUBLIC_API_TIMEOUT_MS: '1000' },
    }).requestTimeoutMs,
    MIN_REQUEST_TIMEOUT_MS,
  );
  assert.equal(
    resolveAppConfig({
      isDev: true,
      env: { EXPO_PUBLIC_API_TIMEOUT_MS: '999999' },
    }).requestTimeoutMs,
    MAX_REQUEST_TIMEOUT_MS,
  );
  assert.equal(
    resolveAppConfig({
      isDev: true,
      env: { EXPO_PUBLIC_API_TIMEOUT_MS: 'abc' },
    }).requestTimeoutMs,
    DEFAULT_REQUEST_TIMEOUT_MS,
  );
});

test('la API key pública de Identity Platform se recorta y admite ausencia', () => {
  assert.equal(
    resolveAppConfig({
      isDev: true,
      env: { EXPO_PUBLIC_IDENTITY_API_KEY: '  clave-publica  ' },
    }).identityApiKey,
    'clave-publica',
  );
  assert.equal(
    resolveAppConfig({
      isDev: true,
      env: { EXPO_PUBLIC_IDENTITY_API_KEY: '   ' },
    }).identityApiKey,
    null,
  );
  assert.equal(resolveAppConfig({ isDev: true, env: {} }).identityApiKey, null);
});
