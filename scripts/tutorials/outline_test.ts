import { strict as assert } from 'node:assert';
import { activeIndex } from '../../src/scripts/learn/outline-state.ts';

Deno.test('the active heading is the last one scrolled past the offset', () => {
  assert.equal(activeIndex([], 80, false), -1);
  assert.equal(activeIndex([200, 900, 1600], 80, false), -1, 'Nothing is active above the first section');
  assert.equal(activeIndex([60, 900, 1600], 80, false), 0);
  assert.equal(activeIndex([-700, 40, 900], 80, false), 1);
  assert.equal(activeIndex([-1500, -700, 300], 80, false), 1);
  assert.equal(activeIndex([-1500, -700, 300], 80, true), 2, 'At the bottom, the last section is active');
});
