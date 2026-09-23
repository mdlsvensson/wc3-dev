import { strict as assert } from 'node:assert';
import {
  isTeamTexture, lookupGameTexture, manifestEntry, manifestSubset, modelGamePaths, normalizeGamePath, teamTexturePaths, unhostedGameTextures,
} from '../../src/lib/game-textures.ts';

Deno.test('game paths normalise to lowercase with forward slashes', () => {
  assert.equal(normalizeGamePath('Textures\\Footman.BLP'), 'textures/footman.blp');
  assert.equal(normalizeGamePath('\\Units/Human\\Footman.blp'), 'units/human/footman.blp');
  assert.equal(manifestEntry('hd', 'Textures\\A.dds'), 'hd:textures/a.dds');
});

Deno.test('lookups prefer HD only when asked, then fall back to SD', () => {
  const map = { 'sd:textures/a.blp': 'sd-key', 'hd:textures/a.blp': 'hd-key', 'sd:textures/b.blp': 'b-key' };
  assert.equal(lookupGameTexture(map, 'Textures\\A.blp', true), 'hd-key');
  assert.equal(lookupGameTexture(map, 'Textures\\A.blp', false), 'sd-key');
  assert.equal(lookupGameTexture(map, 'textures/b.blp', true), 'b-key');
  assert.equal(lookupGameTexture(map, 'textures/c.blp', true), undefined);
});

Deno.test('team texture sets match what the viewer requests', () => {
  const sd = teamTexturePaths('sd');
  const hd = teamTexturePaths('hd');
  assert.equal(sd.length, 32);
  assert.equal(hd.length, 56);
  assert.equal(sd[0], 'ReplaceableTextures\\TeamColor\\TeamColor00.blp');
  assert.equal(sd[1], 'ReplaceableTextures\\TeamGlow\\TeamGlow00.blp');
  assert.equal(hd.at(-1), 'ReplaceableTextures\\TeamGlow\\TeamGlow27.dds');
  assert(isTeamTexture(sd[5]));
  assert(isTeamTexture('ReplaceableTextures\\TeamColor/TeamColor00.blp'));
  assert(!isTeamTexture('ReplaceableTextures\\Cliff\\Cliff0.blp'));
});

const refs = {
  textures: ['Textures\\Footman.blp', 'Units\\Human\\Footman\\Footman.blp', 'Textures\\gutz.blp'],
  replaceables: ['ReplaceableTextures\\Cliff\\Cliff0'],
  ownFiles: ['Footman.blp'],
};

Deno.test('a model needs its non-own textures and both extensions of its replaceables', () => {
  assert.deepEqual(modelGamePaths(refs), ['Textures\\gutz.blp', 'ReplaceableTextures\\Cliff\\Cliff0.blp', 'ReplaceableTextures\\Cliff\\Cliff0.dds']);
});

Deno.test('a page gets only the manifest entries its model can use', () => {
  const manifest = {
    'sd:textures/gutz.blp': 'k1',
    'sd:textures/other.blp': 'k2',
    'hd:replaceabletextures/cliff/cliff0.dds': 'k3',
    'sd:replaceabletextures/teamcolor/teamcolor00.blp': 'k4',
  };
  assert.deepEqual(manifestSubset(manifest, refs), {
    'sd:textures/gutz.blp': 'k1',
    'hd:replaceabletextures/cliff/cliff0.dds': 'k3',
    'sd:replaceabletextures/teamcolor/teamcolor00.blp': 'k4',
  });
});

Deno.test('unhosted game textures are reported once per texture', () => {
  assert.deepEqual(unhostedGameTextures({}, refs), ['Textures\\gutz.blp', 'ReplaceableTextures\\Cliff\\Cliff0']);
  assert.deepEqual(unhostedGameTextures({ 'sd:textures/gutz.blp': 'k', 'hd:replaceabletextures/cliff/cliff0.dds': 'k' }, refs), []);
});
