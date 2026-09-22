import { strict as assert } from 'node:assert';
import { sniff } from './sniff.ts';
import { isSlug, sha256Hex, storeKey } from './keys.ts';
import { wavDurationSec } from './wav.ts';
import { encodePng, pngSize } from './png.ts';

const bytes = (text: string, extra: number[] = []) => new Uint8Array([...new TextEncoder().encode(text), ...extra]);

/** 16-bit mono PCM WAV of silence. */
function wav(seconds: number, sampleRate = 8000): Uint8Array {
  const dataSize = seconds * sampleRate * 2;
  const buffer = new Uint8Array(44 + dataSize);
  const view = new DataView(buffer.buffer);
  buffer.set(new TextEncoder().encode('RIFF'), 0);
  view.setUint32(4, 36 + dataSize, true);
  buffer.set(new TextEncoder().encode('WAVEfmt '), 8);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  buffer.set(new TextEncoder().encode('data'), 36);
  view.setUint32(40, dataSize, true);
  return buffer;
}

Deno.test('sniff accepts files whose contents match their extension', () => {
  assert.equal(sniff('Footman.mdx', bytes('MDLX', [0, 0])), 'mdx');
  assert.equal(sniff('Footman.mdl', bytes('// comment\nVersion {\n\tFormatVersion 800,\n}\n')), 'mdl');
  assert.equal(sniff('BTNSword.BLP', bytes('BLP1', [0, 0])), 'blp');
  assert.equal(sniff('Grass.dds', bytes('DDS ', [0])), 'dds');
  assert.equal(sniff('preview.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'png');
  assert.equal(sniff('Horn.wav', wav(1)), 'wav');
  assert.equal(sniff('Theme.mp3', bytes('ID3', [3, 0])), 'mp3');
  assert.equal(sniff('Theme.mp3', new Uint8Array([0xff, 0xfb, 0x90, 0x00])), 'mp3');
  assert.equal(sniff('Theme.ogg', bytes('OggS', [0])), 'ogg');
  assert.equal(sniff('Theme.flac', bytes('fLaC', [0])), 'flac');
  assert.equal(sniff('Lib.j', bytes('function Foo takes nothing returns nothing\nendfunction\n')), 'jass');
  assert.equal(sniff('Lib.lua', bytes('local x = 1\n')), 'lua');
  assert.equal(sniff('lib.ts', bytes('export const x = 1;\n')), 'ts');
  const tga = new Uint8Array(18);
  tga[2] = 2;
  tga[16] = 32;
  assert.equal(sniff('Skin.tga', tga), 'tga');
});

Deno.test('sniff rejects mismatches, BLP2, binary scripts, and unknown extensions', () => {
  assert.equal(sniff('Footman.mdx', bytes('BLP1')), null);
  assert.equal(sniff('Sword.blp', bytes('BLP2')), null);
  assert.equal(sniff('Lib.lua', new Uint8Array([0x6c, 0x00, 0x61])), null);
  assert.equal(sniff('Lib.lua', new Uint8Array()), null);
  assert.equal(sniff('Lib.lua', new Uint8Array([0xc3, 0x28])), null);
  assert.equal(sniff('Footman.mdl', bytes('Model "x" {}')), null);
  assert.equal(sniff('readme.txt', bytes('hello')), null);
  assert.equal(sniff('Horn.wav', bytes('RIFF')), null);
});

Deno.test('store keys follow the resource layout and refuse unsafe names', async () => {
  const hash = await sha256Hex(bytes('abc'));
  assert.equal(hash, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(storeKey('model', 'footman', hash, 'Footman.mdx'), 'resources/model/footman/ba7816bf8f01/Footman.mdx');
  assert.throws(() => storeKey('model', 'Footman', hash, 'Footman.mdx'));
  assert.throws(() => storeKey('model', 'footman', hash, '../Footman.mdx'));
  assert.throws(() => storeKey('model', 'footman', hash, 'a\\b.mdx'));
  assert.throws(() => storeKey('model', 'footman', hash, ''));
  assert(isSlug('night-elf-archer'));
  assert(!isSlug('night--elf'));
  assert(!isSlug('-archer'));
  assert.equal(storeKey('icon', 'sword', hash, 'Death Knight - Sword.blp'), 'resources/icon/sword/ba7816bf8f01/Death Knight - Sword.blp');
  assert.throws(() => storeKey('icon', 'sword', hash, 'a\x00b.blp'));
});

Deno.test('wavDurationSec reads PCM headers', () => {
  assert.equal(wavDurationSec(wav(3)), 3);
  assert.equal(wavDurationSec(bytes('RIFF....WAVE')), null);
});

Deno.test('encodePng writes a valid PNG that round-trips the pixels', async () => {
  const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 0]);
  const png = await encodePng(2, 2, rgba);
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.deepEqual(pngSize(png), { width: 2, height: 2 });
  assert.equal(new TextDecoder().decode(png.subarray(12, 16)), 'IHDR');
  assert.equal(png[24], 8);
  assert.equal(png[25], 6);
  const idatLength = new DataView(png.buffer).getUint32(33);
  assert.equal(new TextDecoder().decode(png.subarray(37, 41)), 'IDAT');
  const stream = new Blob([new Uint8Array(png.subarray(41, 41 + idatLength))]).stream().pipeThrough(new DecompressionStream('deflate'));
  const raw = new Uint8Array(await new Response(stream).arrayBuffer());
  assert.deepEqual([...raw], [0, ...rgba.subarray(0, 8), 0, ...rgba.subarray(8)]);
  assert.equal(new TextDecoder().decode(png.subarray(-8, -4)), 'IEND');
});
