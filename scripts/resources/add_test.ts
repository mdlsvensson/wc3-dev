import { strict as assert } from 'node:assert';
import { join } from 'jsr:@std/path@^1';
import { addResource } from './add.ts';
import { dryRunStore, localStore } from './store.ts';
import { encodePng } from './png.ts';
import { makeBlp, makeMdx, makeWav } from './testdata.ts';

async function workspace() {
  const root = await Deno.makeTempDir({ prefix: 'wc3-resource-' });
  return { root, content: join(root, 'content'), store: join(root, 'store') };
}

async function folder(root: string, slug: string, authored: object, files: Record<string, Uint8Array>) {
  const dir = join(root, 'input', slug);
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(join(dir, 'resource.json'), JSON.stringify(authored));
  for (const [name, bytes] of Object.entries(files)) await Deno.writeFile(join(dir, name), bytes);
  return dir;
}

const hosted = {
  authors: [{ name: 'Tester' }],
  source: { site: 'hive', url: 'https://www.hiveworkshop.com/threads/test.1/' },
  compat: { sd: true, hd: false },
};

Deno.test('adds a model: uploads files, reads animations, uses the authored preview', async () => {
  const ws = await workspace();
  const dir = await folder(ws.root, 'test-footman', { type: 'model', title: 'Test Footman', summary: 'A test.', kind: 'unit', ...hosted }, {
    'Footman.mdx': makeMdx(['Stand', 'Walk']),
    'Footman.blp': makeBlp(),
    'preview.png': await encodePng(1, 1, new Uint8Array([1, 2, 3, 255])),
  });
  const result = await addResource({ folder: dir, contentRoot: ws.content, store: localStore(ws.store), today: '2026-09-22' });
  assert.equal(result.path, join(ws.content, 'model', 'test-footman.json'));
  const written = JSON.parse(await Deno.readTextFile(result.path));
  assert.equal(written.type, 'model');
  assert.deepEqual(written.animations, ['Stand', 'Walk']);
  assert.deepEqual(written.textures, ['Textures\\Footman.blp']);
  assert.equal(written.added, '2026-09-22');
  assert.deepEqual(written.files.map((file: { role: string; format: string }) => [file.role, file.format]).sort(), [['model', 'mdx'], ['texture', 'blp']]);
  assert.deepEqual([written.preview.width, written.preview.height], [1, 1]);
  for (const key of [...written.files.map((file: { key: string }) => file.key), written.preview.key]) {
    assert.match(key, /^resources\/model\/test-footman\/[0-9a-f]{12}\/[^/]+$/);
    assert((await Deno.stat(join(ws.store, ...key.split('/')))).isFile, `missing ${key}`);
  }
  assert.deepEqual(result.warnings, []);
});

Deno.test('adds an icon with a generated PNG preview', async () => {
  const ws = await workspace();
  const dir = await folder(ws.root, 'test-sword', { type: 'icon', title: 'Test Sword', summary: 'A test.', variants: ['BTN'], ...hosted }, { 'BTNSword.blp': makeBlp() });
  const { resource } = await addResource({ folder: dir, contentRoot: ws.content, store: localStore(ws.store), today: '2026-09-22' });
  assert(resource.type === 'icon' && resource.preview);
  assert.deepEqual([resource.preview.width, resource.preview.height], [2, 2]);
  assert.match(resource.preview.key, /\/preview\.png$/);
});

Deno.test('adds audio with its duration read from the WAV header', async () => {
  const ws = await workspace();
  const dir = await folder(ws.root, 'test-horn', { type: 'audio', title: 'Test Horn', summary: 'A test.', usage: 'sfx', ...hosted }, { 'Horn.wav': makeWav(2) });
  const { resource } = await addResource({ folder: dir, contentRoot: ws.content, store: localStore(ws.store), today: '2026-09-22' });
  assert(resource.type === 'audio');
  assert.equal(resource.durationSec, 2);
});

Deno.test('rejects files that are not what they claim, or wrong for the type', async () => {
  const ws = await workspace();
  const fake = await folder(ws.root, 'fake-model', { type: 'model', title: 'Fake', summary: 'A test.', kind: 'unit', ...hosted }, { 'Fake.mdx': new TextEncoder().encode('not a model') });
  await assert.rejects(() => addResource({ folder: fake, contentRoot: ws.content, store: dryRunStore(() => {}), today: '2026-09-22' }), /Fake\.mdx/);
  const wrong = await folder(ws.root, 'wrong-type', { type: 'icon', title: 'Wrong', summary: 'A test.', variants: ['BTN'], ...hosted }, { 'Horn.wav': makeWav(1) });
  await assert.rejects(() => addResource({ folder: wrong, contentRoot: ws.content, store: dryRunStore(() => {}), today: '2026-09-22' }), /Horn\.wav/);
});

Deno.test('refuses to overwrite without update, and keeps the added date on update', async () => {
  const ws = await workspace();
  const dir = await folder(ws.root, 'test-horn', { type: 'audio', title: 'Test Horn', summary: 'A test.', usage: 'sfx', ...hosted }, { 'Horn.wav': makeWav(1) });
  const store = localStore(ws.store);
  await addResource({ folder: dir, contentRoot: ws.content, store, today: '2026-09-01' });
  await assert.rejects(() => addResource({ folder: dir, contentRoot: ws.content, store, today: '2026-09-22' }), /--update/);
  const { resource } = await addResource({ folder: dir, contentRoot: ws.content, store, today: '2026-09-22', update: true });
  assert.equal(resource.added, '2026-09-01');
  assert.equal(resource.updated, '2026-09-22');
});

Deno.test('a dry run writes and uploads nothing', async () => {
  const ws = await workspace();
  const dir = await folder(ws.root, 'test-horn', { type: 'audio', title: 'Test Horn', summary: 'A test.', usage: 'sfx', ...hosted }, { 'Horn.wav': makeWav(1) });
  const planned: string[] = [];
  const result = await addResource({ folder: dir, contentRoot: ws.content, store: dryRunStore((line) => planned.push(line)), today: '2026-09-22', write: false });
  assert.equal(planned.length, 1);
  assert.match(planned[0], /resources\/audio\/test-horn\//);
  await assert.rejects(() => Deno.stat(result.path));
});

Deno.test('validates every file before uploading any of them: nothing is uploaded when a later file is invalid', async () => {
  const ws = await workspace();
  const dir = await folder(ws.root, 'test-mixed', { type: 'model', title: 'Test', summary: 'A test.', kind: 'unit', ...hosted }, {
    'AGood.blp': makeBlp(),
    'ZBad.mdx': new TextEncoder().encode('not a model'),
  });
  const puts: string[] = [];
  const store = { label: 'recording', put: (key: string) => { puts.push(key); return Promise.resolve(); } };
  await assert.rejects(() => addResource({ folder: dir, contentRoot: ws.content, store, today: '2026-09-22' }), /ZBad\.mdx/);
  assert.deepEqual(puts, []);
});

Deno.test('refuses to add a resource whose slug already exists under a different type', async () => {
  const ws = await workspace();
  const store = localStore(ws.store);
  const audioDir = await folder(ws.root, 'dual-type', { type: 'audio', title: 'Test', summary: 'A test.', usage: 'sfx', ...hosted }, { 'Horn.wav': makeWav(1) });
  await addResource({ folder: audioDir, contentRoot: ws.content, store, today: '2026-09-01' });

  const iconDir = join(ws.root, 'input2', 'dual-type');
  await Deno.mkdir(iconDir, { recursive: true });
  await Deno.writeTextFile(join(iconDir, 'resource.json'), JSON.stringify({ type: 'icon', title: 'Test', summary: 'A test.', variants: ['BTN'], ...hosted }));
  await Deno.writeFile(join(iconDir, 'BTNTest.blp'), makeBlp());
  await assert.rejects(
    () => addResource({ folder: iconDir, contentRoot: ws.content, store, today: '2026-09-22', update: true }),
    /"dual-type" already exists as an audio resource.*delete it before adding it as an icon resource/,
  );
});

Deno.test('rejects bad slugs and link resources', async () => {
  const ws = await workspace();
  const badSlug = await folder(ws.root, 'Bad_Slug', { type: 'audio', title: 'x', summary: 'x', usage: 'sfx', ...hosted }, { 'Horn.wav': makeWav(1) });
  await assert.rejects(() => addResource({ folder: badSlug, contentRoot: ws.content, store: dryRunStore(() => {}), today: '2026-09-22' }), /kebab-case/);
  const link = await folder(ws.root, 'a-link', { type: 'link', title: 'x', summary: 'x', source: hosted.source, category: 'Community', order: 1 }, {});
  await assert.rejects(() => addResource({ folder: link, contentRoot: ws.content, store: dryRunStore(() => {}), today: '2026-09-22' }), /by hand/);
});
