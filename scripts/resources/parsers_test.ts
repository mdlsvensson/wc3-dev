import { strict as assert } from 'node:assert';
import ModelModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/model.js';
import { decodeTexture, pickMipmap } from './images.ts';
import { readModelMeta } from './model-meta.ts';
import { makeBlp, makeDxt1Dds, makeMdl, makeMdx, makeTexturedMdx } from './testdata.ts';

Deno.test('readModelMeta lists sequences and unique texture paths from MDX', () => {
  const meta = readModelMeta(makeMdx(['Stand', 'Walk', 'Attack'], ['Textures\\Footman.blp', 'Textures\\Footman.blp']));
  assert.deepEqual(meta, { animations: ['Stand', 'Walk', 'Attack'], textures: ['Textures\\Footman.blp'], replaceables: [] });
});

Deno.test('readModelMeta reads MDL text', () => {
  assert.deepEqual(readModelMeta(makeMdl(['Stand'])).animations, ['Stand']);
});

Deno.test('readModelMeta throws on garbage', () => {
  assert.throws(() => readModelMeta(new TextEncoder().encode('MDLX-not-really')));
});

Deno.test('decodeTexture decodes palettised BLP1 to RGBA', () => {
  const image = decodeTexture('blp', makeBlp());
  assert.equal(image.width, 2);
  assert.equal(image.height, 2);
  assert.deepEqual([...image.data.subarray(0, 8)], [0, 0, 0, 255, 0, 0, 255, 255]);
});

Deno.test('decodeTexture decodes DXT1 DDS to RGBA', () => {
  const image = decodeTexture('dds', makeDxt1Dds());
  assert.equal(image.data.length, 4 * 4 * 4);
  const [r, g, b, a] = image.data;
  assert(r > 200 && g === 0 && b === 0 && a === 255, `unexpected pixel ${[r, g, b, a]}`);
});

Deno.test('decodeTexture rejects non-image data', () => {
  assert.throws(() => decodeTexture('dds', new Uint8Array(200)));
});

Deno.test('pickMipmap chooses the first level at or under the preview size', () => {
  assert.equal(pickMipmap(64, 64, 1), 0);
  assert.equal(pickMipmap(2048, 1024, 12), 2);
  assert.equal(pickMipmap(2048, 2048, 1), 0);
});

Deno.test('readModelMeta lists replaceable textures other than team colour and glow', () => {
  const meta = readModelMeta(makeMdx(['Stand'], ['Textures\\A.blp'], [1, 2, 11, 31]));
  assert.deepEqual(meta.replaceables, ['ReplaceableTextures\\Cliff\\Cliff0', 'ReplaceableTextures\\LordaeronTree\\LordaeronSummerTree']);
  assert.deepEqual(meta.textures, ['Textures\\A.blp']);
});

Deno.test('makeTexturedMdx builds a parseable model with geometry', () => {
  const meta = readModelMeta(makeTexturedMdx({ sequences: ['Stand', 'Walk'], textures: ['Textures\\Footman.blp', 'Textures\\Missing.blp'], replaceableIds: [1] }));
  assert.deepEqual(meta.animations, ['Stand', 'Walk']);
  assert.deepEqual(meta.textures, ['Textures\\Footman.blp', 'Textures\\Missing.blp']);
  assert.deepEqual(meta.replaceables, []);

  // The quad must face +X, the viewer's default camera direction, or the first view shows it edge-on.
  const model = new ModelModule.default();
  model.load(makeTexturedMdx());
  assert.equal(model.geosets.length, 1);
  const normals = [...model.geosets[0].normals];
  assert.equal(normals.length, 12);
  for (let index = 0; index < normals.length; index += 3) assert.deepEqual(normals.slice(index, index + 3), [1, 0, 0]);
});
