import { strict as assert } from 'node:assert';
import { defaultSequence, isHdModel, teamColorOptions } from '../../src/scripts/previewers/model-info.ts';
import { cameraPosition, orbitFromExtent, panOrbit, rotateOrbit, zoomOrbit } from '../../src/scripts/previewers/orbit.ts';
import { createTextureResolver, summarizeMissing } from '../../src/scripts/previewers/textures.ts';

const files = [
  { role: 'model', format: 'mdx', url: 'https://a.test/k/Footman.mdx', name: 'Footman.mdx' },
  { role: 'texture', format: 'blp', url: 'https://a.test/k/Footman.blp', name: 'Footman.blp' },
];
const game = {
  'sd:replaceabletextures/teamcolor/teamcolor00.blp': 'https://a.test/game/sd/red.blp',
  'hd:replaceabletextures/teamcolor/teamcolor00.dds': 'https://a.test/game/hd/red.dds',
  'sd:textures/gutz.blp': 'https://a.test/game/sd/gutz.blp',
};
const MISSING = { missing: true };

Deno.test('the resolver prefers the resource’s own files, then game textures, then a stand-in', () => {
  const resolver = createTextureResolver(files, game, () => MISSING);
  const parsed = { parsed: true };
  assert.equal(resolver.solve(parsed), parsed);
  assert.equal(resolver.solve('Textures\\FOOTMAN.blp'), 'https://a.test/k/Footman.blp');
  assert.equal(resolver.solve('Textures\\gutz.blp'), 'https://a.test/game/sd/gutz.blp');
  assert.equal(resolver.solve('ReplaceableTextures\\TeamColor\\TeamColor00.dds', { reforged: true }), 'https://a.test/game/hd/red.dds');
  assert.equal(resolver.solve('ReplaceableTextures\\TeamColor\\TeamColor00.blp'), 'https://a.test/game/sd/red.blp');
  assert.equal(resolver.solve('Textures\\Nowhere.blp'), MISSING);
  assert.deepEqual([...resolver.missing], ['Textures\\Nowhere.blp']);
});

Deno.test('missing team textures collapse into one line', () => {
  assert.deepEqual(summarizeMissing([
    'ReplaceableTextures\\TeamColor/TeamColor00.blp', 'ReplaceableTextures\\TeamGlow\\TeamGlow00.blp', 'Textures/Zed.blp', 'Textures\\Abe.blp',
  ]), ['Textures\\Abe.blp', 'Textures\\Zed.blp', 'Team colour textures (2)']);
  assert.deepEqual(summarizeMissing([]), []);
});

Deno.test('model facts: HD rule, default animation, team colours', () => {
  assert(isHdModel(1000, ['', 'Shader_HD_DefaultUnit']));
  assert(!isHdModel(1000, ['', '']));
  assert(!isHdModel(800, ['Shader_HD_DefaultUnit']));
  assert.equal(defaultSequence(['Walk', 'Stand - 2', 'Stand']), 1);
  assert.equal(defaultSequence(['Walk', 'Attack']), 0);
  assert.equal(defaultSequence([]), -1);
  assert.equal(teamColorOptions(false).length, 16);
  assert.equal(teamColorOptions(true).length, 28);
  assert.deepEqual(teamColorOptions(false)[0], { value: '0', text: 'Red' });
  assert.equal(teamColorOptions(true)[27].text, 'Neutral 4');
});

const close = (a: number[], b: number[]) => a.every((value, index) => Math.abs(value - b[index]) < 1e-6);

Deno.test('orbit framing, rotation limits, zoom limits, and panning', () => {
  const orbit = orbitFromExtent([-50, -50, 0], [50, 50, 100]);
  assert.deepEqual(orbit.target, [0, 0, 50]);
  assert(close(cameraPosition({ ...orbit, yaw: 0, pitch: 0, distance: 10 }), [10, 0, 50]));
  assert(close(cameraPosition({ ...orbit, yaw: Math.PI / 2, pitch: 0, distance: 10 }), [0, 10, 50]));
  assert.equal(rotateOrbit(orbit, 0, 10_000).pitch, 1.45);
  assert.equal(rotateOrbit(orbit, 0, -10_000).pitch, -1.45);
  assert.equal(zoomOrbit(orbit, 1e-6).distance, orbit.minDistance);
  assert.equal(zoomOrbit(orbit, 1e6).distance, orbit.maxDistance);
  const panned = panOrbit({ ...orbit, yaw: 0, pitch: 0 }, 100, 0);
  assert(panned.target[1] < 0 && Math.abs(panned.target[0]) < 1e-9 && panned.target[2] === 50);
  const empty = orbitFromExtent([0, 0, 0], [0, 0, 0]);
  assert.deepEqual(empty.target, [0, 0, 50]);
  assert(empty.distance > 0);
});
