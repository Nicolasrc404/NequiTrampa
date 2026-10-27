import test from 'node:test';
import assert from 'node:assert/strict';

import { MODULE1_SCREEN_COUNTS, getNextModule1Screen, getPreviousModule1Screen } from '../../src/data/demoModule1';

test('las 14 variantes Configuration y Projection Status mantienen navegación circular', () => {
  assert.equal(MODULE1_SCREEN_COUNTS.Configuration, 9);
  assert.equal(MODULE1_SCREEN_COUNTS.Projection_Status, 5);
  assert.equal(getNextModule1Screen('Configuration_09'), 'Configuration_01');
  assert.equal(getPreviousModule1Screen('Configuration_01'), 'Configuration_09');
  assert.equal(getNextModule1Screen('Projection_Status_05'), 'Projection_Status_01');
  assert.equal(getPreviousModule1Screen('Projection_Status_01'), 'Projection_Status_05');
});
