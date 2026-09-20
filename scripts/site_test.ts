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
  for (const route of ['', 'framework/', 'framework/docs/', ...[
    'installation', 'custom-maps', 'map-making', 'object-data', 'architecture', 'reference', 'troubleshooting',
  ].map((slug) => `framework/docs/${slug}/`)]) {
    const html = await Deno.readTextFile(new URL(`${route}index.html`, root));
    assert.match(html, /<h1[\s>]/, `Missing heading at /${route}`);
  }
  const homepage = await Deno.readTextFile(new URL('index.html', root));
  assert.match(homepage, /Hive Workshop/);
  assert.match(homepage, /TypeScriptToLua/);
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
