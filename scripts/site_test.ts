import { strict as assert } from 'node:assert';
import { createHighlighter, type HighlighterGeneric } from 'shiki';
import { jass } from '../src/syntax/jass.ts';

const root = new URL('../dist/', import.meta.url);
const ASSETS = 'https://assets.example.test/';
// Scoped to inside an <a ...> tag: an unscoped \sdownload(?=[\s=>]) also matches the plain
// English word, which shows up legitimately in documentation prose (e.g. "package download fails").
const DOWNLOAD_ATTRIBUTE = /<a\b[^>]*\sdownload(?=[\s=>/])/;
async function htmlFiles(directory: URL): Promise<URL[]> {
  const files: URL[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const url = new URL(entry.name + (entry.isDirectory ? '/' : ''), directory);
    if (entry.isDirectory) files.push(...await htmlFiles(url));
    else if (entry.name.endsWith('.html')) files.push(url);
  }
  return files;
}

Deno.test('the download-attribute check matches download in any attribute position and not the plain word', () => {
  assert.match('<a download href="x">', DOWNLOAD_ATTRIBUTE);
  assert.match('<a href="x" download>', DOWNLOAD_ATTRIBUTE);
  assert.match('<a href="x" download="f.mdx">', DOWNLOAD_ATTRIBUTE);
  assert(!DOWNLOAD_ATTRIBUTE.test('<abbr download>'), 'Must not match non-<a> tags');
  assert(!DOWNLOAD_ATTRIBUTE.test('<p>the package download fails</p>'), 'Must not match prose');
});

Deno.test('portal, framework, and migrated documentation routes are built', async () => {
  for (const route of ['', 'resources/', 'learn/', 'framework/', 'framework/docs/', ...[
    'installation', 'custom-maps', 'map-making', 'object-data', 'architecture', 'reference', 'troubleshooting',
  ].map((slug) => `framework/docs/${slug}/`)]) {
    const html = await Deno.readTextFile(new URL(`${route}index.html`, root));
    assert.match(html, /<h1[\s>]/, `Missing heading at /${route}`);
  }
  const homepage = await Deno.readTextFile(new URL('index.html', root));
  assert.match(homepage, /Hive Workshop/);
  assert.match(homepage, /wc3\.dev-framework/);
  for (const title of ['Lua Reference', 'w3ts', 'WCSharp', 'Jassbot']) assert(homepage.includes(title), `Missing link ${title}`);
  const search = await Deno.stat(new URL('pagefind/pagefind.js', root));
  assert(search.isFile, 'Search bundle must exist');
});

Deno.test('built pages have no broken local links, anchors, or asset references, and never link or download store files', async () => {
  for (const file of await htmlFiles(root)) {
    const html = await Deno.readTextFile(file);
    const pathname = file.href.slice(root.href.length).replace(/index\.html$/, '');
    assert(!html.includes(`href="${ASSETS}`), `Store files must never be linked (${pathname})`);
    assert(!DOWNLOAD_ATTRIBUTE.test(html), `No download attributes (${pathname})`);
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

Deno.test('resource detail pages credit and link the source without offering downloads', async () => {
  const html = await Deno.readTextFile(new URL('resources/models/fixture-footman/index.html', root));
  assert.match(html, /href="https:\/\/www\.hiveworkshop\.com\/threads\/fixture-footman\.1\/"[^>]*>\s*View on Hive Workshop/);
  assert.match(html, /id="resource-preview"/);
  assert.match(html, /name="wc3-tab"/);
  assert(html.includes(`src="${ASSETS}resources/model/fixture-footman/2123456789ab/preview.png"`), 'Preview image must load from the asset store');
  // Store URLs are allowed only inside data-files (for the previewers); nothing visible may name a file.
  const visible = html.replace(/data-files="[^"]*"/, '');
  assert(!visible.includes('Footman.mdx'), 'File names must not be shown');
  for (const text of ['Fixture Author', 'Stand', 'Walk', 'Attack', 'Fixture Sword Icon']) assert(html.includes(text), `Missing ${text}`);
});

Deno.test('every hosted fixture has a detail page, with an icon when it has no preview', async () => {
  for (const route of ['icons/fixture-sword-icon', 'textures/fixture-grass-tile', 'audio/fixture-horn', 'scripts/fixture-damage-lib']) {
    const html = await Deno.readTextFile(new URL(`resources/${route}/index.html`, root));
    assert.match(html, /id="resource-preview"/, `Missing preview area on ${route}`);
  }
  const texture = await Deno.readTextFile(new URL('resources/textures/fixture-grass-tile/index.html', root));
  const preview = texture.match(/<section[^>]*id="resource-preview"[\s\S]*?<\/section>/)?.[0] ?? '';
  assert(!preview.includes('<img'), 'A resource without a preview shows its type icon');
  assert.match(texture, /Original source/);
  assert.match(texture, /Derived from Blizzard Entertainment assets/);
  const audio = await Deno.readTextFile(new URL('resources/audio/fixture-horn/index.html', root));
  assert.match(audio, /0:03/);
});

Deno.test('the resource browser lists hosted fixtures, filters, and curated links', async () => {
  const html = await Deno.readTextFile(new URL('resources/index.html', root));
  assert.equal(html.match(/<a class="catalog-card"/g)?.length, 5);
  assert.match(html, /data-filter-form/);
  assert.match(html, /Hive Workshop/);
  assert.match(html, /Jassbot/);
  assert(html.indexOf('data-resource-card') < html.indexOf('Jassbot'), 'Curated links come after the catalog');
});

Deno.test('type pages list only their type', async () => {
  const expected = { models: 'fixture-footman', icons: 'fixture-sword-icon', textures: 'fixture-grass-tile', audio: 'fixture-horn', scripts: 'fixture-damage-lib' };
  for (const [segment, slug] of Object.entries(expected)) {
    const html = await Deno.readTextFile(new URL(`resources/${segment}/index.html`, root));
    assert.equal(html.match(/<a class="catalog-card"/g)?.length, 1, `/resources/${segment}/ should list one card`);
    assert(html.includes(`/resources/${segment}/${slug}/`), `/resources/${segment}/ should link ${slug}`);
  }
});

Deno.test('resource previews keep a static fallback and model pages carry their game textures', async () => {
  for (const route of ['models/fixture-footman', 'icons/fixture-sword-icon', 'textures/fixture-grass-tile', 'audio/fixture-horn', 'scripts/fixture-damage-lib']) {
    const html = await Deno.readTextFile(new URL(`resources/${route}/index.html`, root));
    assert.match(html, /class="preview-fallback"/, `Missing static fallback on ${route}`);
    assert.match(html, /<p class="preview-message" role="status" hidden/, `Missing message slot on ${route}`);
    assert.equal(/data-game-textures=/.test(html), route.startsWith('models/'), `data-game-textures only on model pages (${route})`);
  }
});

// Heavy previewer code, each found by a string only its chunk contains. Shiki's error message names
// createJavaScriptRegexEngine; theme names such as github-dark also appear in pages' highlighted code.
const LAZY_CHUNKS = [
  { name: 'the WebGL model viewer', marker: 'WEBGL_lose_context' },
  { name: 'the Shiki script highlighter', marker: 'createJavaScriptRegexEngine' },
];

for (const { name, marker } of LAZY_CHUNKS) {
  Deno.test(`${name} is a separate chunk that no page loads up front`, async () => {
    const assets = new URL('_astro/', root);
    const chunks: string[] = [];
    for await (const entry of Deno.readDir(assets)) {
      if (entry.name.endsWith('.js') && (await Deno.readTextFile(new URL(entry.name, assets))).includes(marker)) chunks.push(entry.name);
    }
    assert(chunks.length > 0, `The chunk for ${name} must be built`);
    for (const file of await htmlFiles(root)) {
      const html = await Deno.readTextFile(file);
      assert(!html.includes(marker), `Code for ${name} inlined into ${file.pathname}`);
      for (const [, src] of html.matchAll(/(?:src|href)="\/_astro\/([^"]+\.js)"/g)) {
        assert(!chunks.includes(src), `${file.pathname} loads ${name} eagerly`);
      }
    }
  });
}

/** Lesson ids (`<chapter>/<slug>`) from the content folder. */
async function lessonIds(): Promise<string[]> {
  const base = new URL('../src/content/tutorials/', import.meta.url);
  const ids: string[] = [];
  for await (const chapter of Deno.readDir(base)) {
    if (!chapter.isDirectory) continue;
    for await (const file of Deno.readDir(new URL(`${chapter.name}/`, base))) {
      if (file.isFile && file.name.endsWith('.md')) ids.push(`${chapter.name}/${file.name.slice(0, -3)}`);
    }
  }
  return ids.sort();
}

const readRoute = (path: string) => Deno.readTextFile(new URL(`${path.replace(/^\//, '')}index.html`, root));
const between = (html: string, start: string, end: string) => html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)));

/** Fails when a directive reached the page as text: an unknown one (`:key[F9]`), or a stray `:::` fence. */
function assertNoRawDirectives(html: string, path: string): void {
  const text = between(html, '<main', '</main>')
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<style\b[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]*>/g, ' ');
  // Prose such as "Hint:yes" has no space or bracket before the colon, so it is not a directive.
  const raw = text.match(/(^|[\s(])::?[a-z][\w-]*[\[{]|:::/m);
  assert(!raw, `Raw directive text "${raw?.[0].trim()}" on ${path}`);
}

Deno.test('the tutorial track chains every lesson from the overview to the closing page', async () => {
  const landing = await readRoute('/learn/');
  assert(!landing.includes('name="wc3-tab"'), 'The track overview is a section page, not a tab');
  let path = landing.match(/<a class="button primary track-start" href="([^"]+)"/)?.[1];
  assert(path, 'Missing "Start the track" link');
  const visited: string[] = [];
  let previous = '/learn/';
  while (path !== '/learn/next/') {
    assert(!visited.includes(path), `The lesson chain loops at ${path}`);
    visited.push(path);
    const html = await readRoute(path);
    assert.match(html, /<meta name="wc3-tab"/, `Lessons open as tabs (${path})`);
    assert.equal(html.match(/<a class="pager-prev" rel="prev" href="([^"]+)"/)?.[1], previous, `Previous link of ${path}`);
    const outline = between(html, '<nav class="track-outline"', '</nav>');
    const current = [...outline.matchAll(/<a href="([^"]+)" aria-current="page"/g)].map((match) => match[1]);
    assert.deepEqual(current, [path], `The outline marks exactly the current lesson (${path})`);
    const main = between(html, '<main', '</main>');
    assertNoRawDirectives(html, path);
    for (const [, attributes] of main.matchAll(/<h2([^>]*)>/g)) assert.match(attributes, /\bid="/, `A heading without an id on ${path}`);
    previous = path;
    path = html.match(/<a class="pager-next" rel="next" href="([^"]+)"/)?.[1];
    assert(path, `Missing next link on ${previous}`);
  }
  assert.deepEqual(visited.map((route) => route.slice('/learn/'.length, -1)).sort(), await lessonIds());
  const closing = await readRoute('/learn/next/');
  assert.match(closing, /<meta name="wc3-tab"/);
  assertNoRawDirectives(closing, '/learn/next/');
  assert.equal(closing.match(/<a class="pager-prev" rel="prev" href="([^"]+)"/)?.[1], previous);
  assert(!closing.includes('class="pager-next"'), 'The closing page ends the track');
});

Deno.test('tutorial markup stays out of the framework docs', async () => {
  for (const file of await htmlFiles(new URL('framework/docs/', root))) {
    const html = await Deno.readTextFile(file);
    assert(!/class="(keys|menu-path|tutorial-[a-z-]+|shot[a-z -]*)"/.test(html), `Tutorial markup in ${file.pathname}`);
  }
});
