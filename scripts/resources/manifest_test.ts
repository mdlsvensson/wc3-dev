import { strict as assert } from 'node:assert';
import { join } from 'jsr:@std/path@^1';
import { readManifest, writeManifest } from './manifest.ts';

Deno.test('readManifest of a missing file is empty', async () => {
  const dir = await Deno.makeTempDir({ prefix: 'wc3-manifest-' });
  assert.deepEqual(await readManifest(join(dir, 'absent.json')), {});
});

Deno.test('writeManifest writes keys in code-point order with a trailing newline', async () => {
  const dir = await Deno.makeTempDir({ prefix: 'wc3-manifest-' });
  const path = join(dir, 'game-textures.json');
  await writeManifest(path, { 'sd:textures/b.blp': 'b', 'hd:Z.dds': 'z', 'sd:textures/B.blp': 'B', 'hd:a.dds': 'a' });
  const text = await Deno.readTextFile(path);
  assert(text.endsWith('}\n'));
  assert.deepEqual(Object.keys(JSON.parse(text)), ['hd:Z.dds', 'hd:a.dds', 'sd:textures/B.blp', 'sd:textures/b.blp']);
  assert.deepEqual(await readManifest(path), { 'hd:Z.dds': 'z', 'hd:a.dds': 'a', 'sd:textures/B.blp': 'B', 'sd:textures/b.blp': 'b' });
});
