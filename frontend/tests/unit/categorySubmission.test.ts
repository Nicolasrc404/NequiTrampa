import test from 'node:test';
import assert from 'node:assert/strict';

import {
  routeCategoryFailure,
  type CategoryMutationMode,
} from '../../src/services/categorySubmission';
import type { OperationFailureKind } from '../../src/services/operationFailure';

const MODES: readonly CategoryMutationMode[] = ['create', 'update', 'delete'];

test('routeCategoryFailure: un 401 siempre delega al gate de sesión', () => {
  for (const mode of MODES) {
    assert.equal(routeCategoryFailure('session', mode), 'session');
  }
});

test('routeCategoryFailure: 403 y 404 recargan la lista en cualquier modo', () => {
  for (const mode of MODES) {
    assert.equal(routeCategoryFailure('forbidden', mode), 'reload');
    assert.equal(routeCategoryFailure('not_found', mode), 'reload');
  }
});

test('routeCategoryFailure: al crear, 409 y 422 tienen pantalla propia', () => {
  assert.equal(routeCategoryFailure('conflict', 'create'), 'conflict');
  assert.equal(routeCategoryFailure('validation', 'create'), 'validation');
});

test('routeCategoryFailure: al editar, 409 y 422 conservan el formulario', () => {
  // `Categories_06/07` son diseños de «Crear categoría»: enviar ahí una
  // edición perdería los datos que el usuario ya escribió.
  assert.equal(routeCategoryFailure('conflict', 'update'), 'stay');
  assert.equal(routeCategoryFailure('validation', 'update'), 'stay');
});

test('routeCategoryFailure: al desactivar, 409 y 422 conservan el diálogo', () => {
  assert.equal(routeCategoryFailure('conflict', 'delete'), 'stay');
  assert.equal(routeCategoryFailure('validation', 'delete'), 'stay');
});

test('routeCategoryFailure: fallos ambiguos o de servidor no navegan', () => {
  const stay: readonly OperationFailureKind[] = [
    'server_error',
    'unavailable',
    'rate_limited',
    'uncertain',
    'cancelled',
    'unknown',
    'insufficient_funds',
    'limit_exceeded',
  ];
  for (const kind of stay) {
    for (const mode of MODES) {
      assert.equal(routeCategoryFailure(kind, mode), 'stay', `${kind}/${mode}`);
    }
  }
});
