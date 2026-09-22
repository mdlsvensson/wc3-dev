import { strict as assert } from 'node:assert';
import { createHighlighter, type HighlighterGeneric } from 'shiki';
import { jass } from '../src/syntax/jass.ts';

const root = new URL('../dist/', import.meta.url);
async function htmlFiles(directory: URL): Promise<URL[]> {
  const files: URL[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const url = new URL(entry.name + (entry.isDirectory ? '/' : ''), directory);
    if (entry.isDirectory) files.push(...await htmlFiles(url));
    else if (entry.name.endsWith('.html')) files.push(url);
  }
  return files;
}

Deno.test('portal, framework, and migrated documentation routes are built', async () => {
  for (const route of ['', 'resources/', 'learn/', 'framework/', 'framework/docs/', ...[
    'installation', 'custom-maps', 'map-making', 'object-data', 'architecture', 'reference', 'troubleshooting',
  ].map((slug) => `framework/docs/${slug}/`)]) {
    const html = await Deno.readTextFile(new URL(`${route}index.html`, root));
    assert.match(html, /<h1[\s>]/, `Missing heading at /${route}`);
  }
  const homepage = await Deno.readTextFile(new URL('index.html', root));
  assert.match(homepage, /Hive Workshop/);
  assert.match(homepage, /w3ts framework/);
  for (const title of ['Lua Reference', 'w3ts', 'WCSharp', 'Jassbot']) assert(homepage.includes(title), `Missing link ${title}`);
  const search = await Deno.stat(new URL('pagefind/pagefind.js', root));
  assert(search.isFile, 'Search bundle must exist');
});

Deno.test('built pages have no broken local links, anchors, or asset references', async () => {
  for (const file of await htmlFiles(root)) {
    const html = await Deno.readTextFile(file);
    const pathname = file.href.slice(root.href.length).replace(/index\.html$/, '');
    for (const [, reference] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = new URL(reference.replaceAll('&amp;', '&'), `https://wc3.dev/${pathname}`);
      if (url.origin !== 'https://wc3.dev') continue;
      // Astro serves the special error page from 404.html, including at /404/.
      const localPath = url.pathname === '/404/' ? '404.html' : decodeURIComponent(url.pathname.slice(1));
      const target = new URL(localPath + (localPath.endsWith('/') || !localPath ? 'index.html' : ''), root);
      const stat = await Deno.stat(target).catch(() => null);
      assert(stat?.isFile, `Broken reference in ${pathname}: ${reference}`);
      if (url.hash && target.pathname.endsWith('.html')) {
        const destination = await Deno.readTextFile(target);
        const ids = [...destination.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
        assert(ids.includes(decodeURIComponent(url.hash.slice(1))), `Missing anchor in ${pathname}: ${reference}`);
      }
    }
  }
});

Deno.test('TypeScript, Lua, and JASS produce distinct syntax tokens', async () => {
  // Widen the bundled-language union to include the registered custom grammar.
  const highlighter = await createHighlighter({ themes: ['github-dark'], langs: ['typescript', 'lua', jass] }) as HighlighterGeneric<string, string>;
  try {
    const samples = {
      typescript: 'const name: string = "Vanguard"; // unit',
      lua: 'local name = "Vanguard" -- unit',
      jass: 'function Spawn takes nothing returns nothing\n  call CreateUnit(Player(0), \'hfoo\', 0., 0., 270.)\nendfunction // unit',
    };
    for (const [lang, source] of Object.entries(samples)) {
      const { tokens } = highlighter.codeToTokens(source, { lang, theme: 'github-dark' });
      const colors = new Set(tokens.flat().filter((token) => token.content.trim()).map((token) => token.color));
      assert(colors.size >= 3, `${lang} must highlight more than plain text`);
    }
  } finally { highlighter.dispose(); }
});

Deno.test('shell pages share the application shell', async () => {
  for (const route of ['', 'resources/', 'learn/', 'framework/']) {
    const html = await Deno.readTextFile(new URL(`${route}index.html`, root));
    assert.match(html, /class="activity-rail"/, `Missing activity rail at /${route}`);
    assert.match(html, /data-astro-transition-persist="tabs"/, `Tab strip must persist at /${route}`);
    assert.match(html, /data-pagefind-body/, `Workspace must be searchable at /${route}`);
    assert.match(html, /name="astro-view-transitions-enabled"/, `Client router missing at /${route}`);
    assert.match(html, /class="status-bar"/, `Missing status bar at /${route}`);
    assert.match(html, /id="command-palette"/, `Missing command palette at /${route}`);
  }
  const docs = await Deno.readTextFile(new URL('framework/docs/index.html', root));
  assert.match(docs, /class="status-bar"/, 'Docs must share the status bar');
});

Deno.test('the search index covers every page marked for indexing', async () => {
  let marked = 0;
  for (const file of await htmlFiles(root)) if ((await Deno.readTextFile(file)).includes('data-pagefind-body')) marked++;
  const entry = JSON.parse(await Deno.readTextFile(new URL('pagefind/pagefind-entry.json', root)));
  const indexed = Object.values(entry.languages as Record<string, { page_count: number }>)
    .reduce((total, language) => total + language.page_count, 0);
  assert.equal(indexed, marked);
});
