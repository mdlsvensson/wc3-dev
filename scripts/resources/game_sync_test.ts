import { strict as assert } from 'node:assert';
import { dirname, join } from 'jsr:@std/path@^1';
import { gameKey, indexGameRoot, neededGamePaths, planGameSync, syncGameTextures } from './game-sync.ts';
import { dryRunStore, localStore } from './store.ts';

async function write(path: string, text: string) {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, text);
}

const modelJson = (textures: string[], replaceables: string[] = []) => ({
  type: 'model', title: 'Gutz', summary: 'A test.', authors: [{ name: 'Tester' }],
  source: { site: 'hive', url: 'https://www.hiveworkshop.com/threads/gutz.1/' },
  compat: { sd: true, hd: false }, kind: 'unit', textures, replaceables,
  files: [{ key: 'resources/model/gutz/0123456789ab/Gutz.mdx', role: 'model', format: 'mdx', bytes: 10 }],
  added: '2026-09-23',
});

async function workspace() {
  const root = await Deno.makeTempDir({ prefix: 'wc3-game-' });
  const sd = join(root, 'war3.w3mod');
  const hd = join(root, 'war3.w3mod', '_hd.w3mod');
  await write(join(sd, 'Textures', 'Gutz.blp'), 'gutz-sd');
  await write(join(sd, 'ReplaceableTextures', 'TeamColor', 'TeamColor00.blp'), 'red');
  await write(join(hd, 'ReplaceableTextures', 'Cliff', 'Cliff0.dds'), 'cliff-hd');
  const content = join(root, 'content');
  await write(join(content, 'model', 'gutz.json'), JSON.stringify(modelJson(['Textures\\gutz.blp', 'Textures\\Nowhere.blp'], ['ReplaceableTextures\\Cliff\\Cliff0'])));
  return { root, sd, hd, content, store: join(root, 'store'), manifest: join(root, 'game-textures.json') };
}

Deno.test('indexGameRoot maps normalised relative paths to files', async () => {
  const ws = await workspace();
  const index = await indexGameRoot(ws.sd);
  assert.equal(index.get('textures/gutz.blp'), join(ws.sd, 'Textures', 'Gutz.blp'));
  assert.equal(index.get('replaceabletextures/teamcolor/teamcolor00.blp'), join(ws.sd, 'ReplaceableTextures', 'TeamColor', 'TeamColor00.blp'));
});

Deno.test('neededGamePaths adds the team sets only for the sets being synced', () => {
  const models = [{ textures: ['Textures\\a.blp'], replaceables: [], ownFiles: [] }];
  assert.equal(neededGamePaths(models, ['sd']).length, 1 + 32);
  assert.equal(neededGamePaths(models, ['sd', 'hd']).length, 1 + 32 + 56);
});

Deno.test('planGameSync finds files per set and reports only textures found nowhere', () => {
  const sd = new Map([['textures/a.blp', '/sd/a.blp'], ['replaceabletextures/cliff/cliff0.blp', '/sd/cliff.blp']]);
  const hd = new Map([['textures/a.blp', '/hd/a.blp']]);
  const plan = planGameSync(['Textures\\A.blp', 'ReplaceableTextures\\Cliff\\Cliff0.blp', 'ReplaceableTextures\\Cliff\\Cliff0.dds', 'Textures\\Gone.blp'], { sd, hd });
  assert.deepEqual(plan.items.map((item) => item.entry), ['sd:textures/a.blp', 'hd:textures/a.blp', 'sd:replaceabletextures/cliff/cliff0.blp']);
  assert.deepEqual(plan.missing, ['Textures\\Gone.blp']);
});

Deno.test('gameKey is content-addressed under the set', () => {
  assert.equal(gameKey('hd', 'ba7816bf8f01cfea41', 'ReplaceableTextures\\Cliff\\Cliff0.dds'), 'game/hd/ba7816bf8f01/replaceabletextures/cliff/cliff0.dds');
});

Deno.test('syncGameTextures uploads needed files, writes the manifest, and is idempotent', async () => {
  const ws = await workspace();
  const options = { contentRoot: ws.content, roots: { sd: ws.sd, hd: ws.hd }, store: localStore(ws.store), manifestPath: ws.manifest };
  const first = await syncGameTextures(options);
  assert.deepEqual(first.uploaded.sort(), ['hd:replaceabletextures/cliff/cliff0.dds', 'sd:replaceabletextures/teamcolor/teamcolor00.blp', 'sd:textures/gutz.blp']);
  assert(first.missing.includes('Textures\\Nowhere.blp'));
  const manifest = JSON.parse(await Deno.readTextFile(ws.manifest));
  assert.match(manifest['sd:textures/gutz.blp'], /^game\/sd\/[0-9a-f]{12}\/textures\/gutz\.blp$/);
  assert((await Deno.stat(join(ws.store, ...manifest['sd:textures/gutz.blp'].split('/')))).isFile);

  const second = await syncGameTextures(options);
  assert.deepEqual(second.uploaded, []);
  assert.equal(second.unchanged.length, 3);
});

Deno.test('syncGameTextures drops unused entries of synced sets and keeps other sets', async () => {
  const ws = await workspace();
  await Deno.writeTextFile(ws.manifest, JSON.stringify({
    'sd:textures/old.blp': 'game/sd/000000000000/textures/old.blp',
    'hd:textures/kept.dds': 'game/hd/000000000000/textures/kept.dds',
  }));
  const result = await syncGameTextures({ contentRoot: ws.content, roots: { sd: ws.sd }, store: localStore(ws.store), manifestPath: ws.manifest });
  assert.deepEqual(result.dropped, ['sd:textures/old.blp']);
  const manifest = JSON.parse(await Deno.readTextFile(ws.manifest));
  assert.equal(manifest['hd:textures/kept.dds'], 'game/hd/000000000000/textures/kept.dds');
  assert.equal(manifest['sd:textures/old.blp'], undefined);
});

Deno.test('a dry run writes no manifest', async () => {
  const ws = await workspace();
  const logged: string[] = [];
  await syncGameTextures({ contentRoot: ws.content, roots: { sd: ws.sd }, store: dryRunStore((line) => logged.push(line)), manifestPath: ws.manifest, write: false });
  assert(logged.length > 0);
  await assert.rejects(() => Deno.stat(ws.manifest));
});
