import { strict as assert } from 'node:assert';
import { join } from 'jsr:@std/path@^1';
import { checkResources, gameTextureWarnings } from './check.ts';

const icon = (related: string[] = []) => ({
  type: 'icon',
  title: 'Sword',
  summary: 'A sword.',
  authors: [{ name: 'Tester' }],
  source: { site: 'hive', url: 'https://www.hiveworkshop.com/threads/sword.1/' },
  compat: { sd: true, hd: true },
  variants: ['BTN'],
  files: [{ key: 'resources/icon/sword/0123456789ab/BTNSword.blp', role: 'icon', format: 'blp', bytes: 10 }],
  added: '2026-09-22',
  related,
});

const link = () => ({
  type: 'link',
  title: 'Hive Workshop',
  summary: 'The main community hub.',
  source: { site: 'hive', url: 'https://www.hiveworkshop.com/' },
  category: 'Community',
  order: 1,
  added: '2026-09-22',
});

async function tree(files: Record<string, unknown>) {
  const root = await Deno.makeTempDir({ prefix: 'wc3-check-' });
  for (const [path, data] of Object.entries(files)) {
    await Deno.mkdir(join(root, path, '..'), { recursive: true });
    await Deno.writeTextFile(join(root, path), typeof data === 'string' ? data : JSON.stringify(data));
  }
  return root;
}

Deno.test('a valid tree has no errors', async () => {
  assert.deepEqual(await checkResources(await tree({ 'icon/sword.json': icon() })), []);
});

Deno.test('reports schema errors, wrong folders, duplicate slugs, bad slugs, and missing related', async () => {
  const errors = await checkResources(await tree({
    'icon/sword.json': icon(['ghost']),
    'model/sword.json': icon(),
    'icon/Bad_Name.json': icon(),
    'icon/broken.json': { ...icon(), source: undefined },
    'icon/not-json.json': '{',
  }));
  const text = errors.join('\n');
  assert.match(text, /model\/sword\.json: type "icon" must live in an? "icon\/" folder/);
  assert.match(text, /slug "sword" is also used/);
  assert.match(text, /Bad_Name\.json: file name must be a lowercase kebab-case slug/);
  assert.match(text, /broken\.json: .*source/);
  assert.match(text, /not-json\.json: /);
  assert.match(text, /related resource "ghost" does not exist/);
});

Deno.test('rejects a related reference to a link-type resource', async () => {
  const errors = await checkResources(await tree({
    'icon/sword.json': icon(['hive-workshop']),
    'link/hive-workshop.json': link(),
  }));
  assert.match(errors.join('\n'), /related resource "hive-workshop" is a link, not a hosted resource/);
});

Deno.test('remote mode reports keys missing from the store', async () => {
  const requested: string[] = [];
  const fetchFn = ((input: string | URL) => {
    requested.push(String(input));
    return Promise.resolve(new Response(null, { status: 404 }));
  }) as typeof fetch;
  const errors = await checkResources(await tree({ 'icon/sword.json': icon() }), { remoteBase: 'https://assets.example.test/', fetchFn });
  assert.deepEqual(requested, ['https://assets.example.test/resources/icon/sword/0123456789ab/BTNSword.blp']);
  assert.match(errors.join('\n'), /missing from the store: resources\/icon\/sword\/0123456789ab\/BTNSword\.blp \(404\)/);
});

Deno.test('remote mode resolves the same URL as the site for a base with a path segment and no trailing slash', async () => {
  const requested: string[] = [];
  const fetchFn = ((input: string | URL) => {
    requested.push(String(input));
    return Promise.resolve(new Response(null, { status: 200 }));
  }) as typeof fetch;
  const errors = await checkResources(await tree({ 'icon/sword.json': icon() }), { remoteBase: 'https://assets.example.test/store', fetchFn });
  assert.deepEqual(errors, []);
  // Matches assetUrl(): the base's last path segment is kept, not treated as a file to replace.
  assert.deepEqual(requested, ['https://assets.example.test/store/resources/icon/sword/0123456789ab/BTNSword.blp']);
});

Deno.test('game texture warnings name models with unhosted game textures', async () => {
  const model = {
    type: 'model', title: 'Gutz', summary: 'A test.', authors: [{ name: 'Tester' }],
    source: { site: 'hive', url: 'https://www.hiveworkshop.com/threads/gutz.1/' },
    compat: { sd: true, hd: false }, kind: 'unit',
    textures: ['Textures\\Gutz.blp', 'Textures\\Own.blp'], replaceables: [],
    files: [
      { key: 'resources/model/gutz/0123456789ab/Gutz.mdx', role: 'model', format: 'mdx', bytes: 10 },
      { key: 'resources/model/gutz/1123456789ab/Own.blp', role: 'texture', format: 'blp', bytes: 10 },
    ],
    added: '2026-09-23',
  };
  const root = await tree({ 'model/gutz.json': model });
  assert.deepEqual(await gameTextureWarnings(root, {}), ['model/gutz.json: 1 game texture not hosted (run deno task game:sync): Textures\\Gutz.blp']);
  assert.deepEqual(await gameTextureWarnings(root, { 'sd:textures/gutz.blp': 'k' }), []);
});
