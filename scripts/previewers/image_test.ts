import { strict as assert } from 'node:assert';
import { decodeImage, infoLine } from '../../src/scripts/previewers/decode.ts';
import { alphaOnly, displaySize } from '../../src/scripts/previewers/image-view.ts';
import { makeBlp, makeDxt1Dds } from '../resources/testdata.ts';

/** A 2×1 uncompressed 32-bit TGA: a red pixel then a half-transparent green one. */
function makeTga(): Uint8Array {
  const bytes = new Uint8Array(18 + 8);
  bytes[2] = 2; // uncompressed true-colour
  bytes[12] = 2; // width
  bytes[14] = 1; // height
  bytes[16] = 32; // bits per pixel
  bytes[17] = 0x28; // top-left origin, 8 alpha bits
  bytes.set([0, 0, 255, 255, 0, 255, 0, 128], 18); // BGRA
  return bytes;
}

Deno.test('decodeImage decodes BLP1 with its format label', () => {
  const image = decodeImage('blp', makeBlp());
  assert.deepEqual([image.width, image.height, image.mipmaps], [2, 2, 1]);
  assert.deepEqual([...image.data.subarray(4, 8)], [0, 0, 255, 255]);
  assert.equal(infoLine(image), 'BLP1, 2×2, 1 mipmap');
});

Deno.test('decodeImage decodes DXT1 DDS', () => {
  const image = decodeImage('dds', makeDxt1Dds());
  assert.deepEqual([image.width, image.height], [4, 4]);
  assert(image.data[0] > 200 && image.data[1] === 0 && image.data[3] === 255);
  assert.equal(infoLine(image), 'DDS, 4×4, 1 mipmap');
});

Deno.test('decodeImage decodes TGA', () => {
  const image = decodeImage('tga', makeTga());
  assert.deepEqual([image.width, image.height], [2, 1]);
  assert.deepEqual([...image.data], [255, 0, 0, 255, 0, 255, 0, 128]);
});

Deno.test('decodeImage rejects data it cannot read', () => {
  assert.throws(() => decodeImage('dds', new Uint8Array(200)));
});

Deno.test('displaySize fits or scales, pixelating at 2× and above', () => {
  assert.deepEqual(displaySize({ width: 64, height: 64 }, { width: 640, height: 360 }, 'fit'), { width: 360, height: 360, pixelated: true });
  assert.deepEqual(displaySize({ width: 1024, height: 512 }, { width: 512, height: 512 }, 'fit'), { width: 512, height: 256, pixelated: false });
  assert.deepEqual(displaySize({ width: 64, height: 32 }, { width: 10, height: 10 }, '4'), { width: 256, height: 128, pixelated: true });
  assert.deepEqual(displaySize({ width: 64, height: 32 }, { width: 0, height: 0 }, 'fit'), { width: 1, height: 1, pixelated: false });
});

Deno.test('alphaOnly shows the alpha channel as opaque greyscale', () => {
  assert.deepEqual([...alphaOnly(new Uint8ClampedArray([10, 20, 30, 128, 1, 2, 3, 0]))], [128, 128, 128, 255, 0, 0, 0, 255]);
});
