import { strict as assert } from 'node:assert';
import { emptyFilters, matchesFilters, parseFilters, serializeFilters } from '../../src/scripts/resources/filter-state.ts';

const card = { tags: ['orc', 'unit'], authors: ['Grom Hellscream', 'Thrall'], sd: true, hd: false };

Deno.test('parseFilters reads, normalises, and de-duplicates the query string', () => {
  assert.deepEqual(parseFilters('?tag=Unit&tag=orc&tag=orc&hd=1&author=%20thrall%20'), { tags: ['orc', 'unit'], sd: false, hd: true, author: 'thrall' });
  assert.deepEqual(parseFilters(''), emptyFilters);
  assert.deepEqual(parseFilters('?sd=yes&tag='), emptyFilters);
});

Deno.test('serializeFilters is stable and empty for no filters', () => {
  assert.equal(serializeFilters(emptyFilters), '');
  assert.equal(serializeFilters({ tags: ['unit', 'orc'], sd: true, hd: false, author: 'Thrall' }), '?tag=orc&tag=unit&sd=1&author=Thrall');
  const state = { tags: ['orc'], sd: false, hd: true, author: 'a b' };
  assert.deepEqual(parseFilters(serializeFilters(state)), state);
});

Deno.test('matchesFilters requires every selected tag, each compat flag, and an author substring', () => {
  assert(matchesFilters(card, emptyFilters));
  assert(matchesFilters(card, { ...emptyFilters, tags: ['orc', 'unit'] }));
  assert(!matchesFilters(card, { ...emptyFilters, tags: ['orc', 'hero'] }));
  assert(matchesFilters(card, { ...emptyFilters, sd: true }));
  assert(!matchesFilters(card, { ...emptyFilters, hd: true }));
  assert(matchesFilters(card, { ...emptyFilters, author: 'HELLS' }));
  assert(!matchesFilters(card, { ...emptyFilters, author: 'jaina' }));
});
