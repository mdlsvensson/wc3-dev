import { strict as assert } from 'node:assert';
import { join } from 'jsr:@std/path@^1';
import { checkResources } from './check.ts';

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
