import { assertEquals, assertMatch, assertStringIncludes } from "@std/assert";
import type { PageRecord, Sidebars } from "../shared/types.ts";

// Opt in with test:preview after building and starting both independent Workers.
const [docsOrigin, homeOrigin] = Deno.args;
const enabled = Boolean(docsOrigin && homeOrigin);
const sections = ["moonwell", "wrappers", "systems"];
// What content preparation wrote last: the sample after build:sample or dev:sample, the authored pages after
// build:docs, build:home, check, content or dev. Run this test against Workers built from those same records.
const generated: { pages: readonly PageRecord[]; sidebars: Sidebars } = enabled
  ? await import("../docs/generated/pages.ts")
  : { pages: [], sidebars: {} };
const records = generated.pages;
const docsPaths = ["/", ...records.map((page) => page.url)];

// The words a page shows outside its article: titles, outline headings and the sidebar.
const chrome: readonly string[] = [
  ...records.flatMap((page) => [
    page.title,
    ...page.headings.map((heading) => heading.text),
  ]),
  ...Object.values(generated.sidebars).flatMap((tree) => [
    tree.label,
    ...tree.groups.flatMap((group) => [
      group.title ?? "",
      ...group.items.map((item) => item.label),
    ]),
  ]),
];

/**
 * Text to look for in a response: 24 or more letters, digits, spaces, commas and full stops that
 * stand between two tags of the page's article, exactly once in the article, with no space at
 * either end. HTML and JSON write such text unchanged, so any copy of the article holds it. Text
 * that a title, a heading or the sidebar holds is passed over: pages show those elsewhere too.
 */
function probe(page: PageRecord): string | undefined {
  const runs = page.html.replace(/<[^>]*>/g, "\n").match(/[A-Za-z0-9 ,.]+/g);
  return (runs ?? []).map((run) => run.trim()).find((text) =>
    text.length >= 24 && page.html.split(text).length === 2 &&
    !chrome.some((words) => words.includes(text))
  );
}

async function request(
  origin: string,
  path: string,
  method = "GET",
  host?: string,
) {
  return await fetch(`${origin}${path}`, {
    method,
    redirect: "manual",
    headers: host ? { host } : undefined,
  });
}

Deno.test({
  name: "built Workers serve canonical pages and empty HEAD bodies",
  ignore: !enabled,
  async fn() {
    for (
      const [origin, paths] of [[docsOrigin, docsPaths], [homeOrigin, [
        "/",
      ]]] as const
    ) {
      for (const path of paths) {
        const get = await request(origin, path);
        const head = await request(origin, path, "HEAD");
        assertEquals(get.status, 200, `${origin}${path}`);
        assertEquals(head.status, get.status);
        assertEquals(
          head.headers.get("content-type"),
          get.headers.get("content-type"),
        );
        assertStringIncludes(await get.text(), 'id="main-content"');
        assertEquals(await head.text(), "");
      }
      for (
        const path of [
          "/unknown",
          "/unknown.html",
          "/missing.woff2",
          "/moonwells",
        ]
      ) {
        for (const method of ["GET", "HEAD"]) {
          const response = await request(origin, path, method);
          assertEquals(response.status, 404, `${method} ${origin}${path}`);
          const body = await response.text();
          if (method === "HEAD") assertEquals(body, "");
          else assertStringIncludes(body, "Page not found");
        }
      }
    }
  },
});

Deno.test({
  name: "built docs aliases and both home hosts preserve redirect queries",
  ignore: !enabled,
  async fn() {
    for (const page of records) {
      const aliases = page.url.endsWith("/")
        ? [page.url.slice(0, -1), `${page.url}index`, `${page.url}index.html`]
        : [`${page.url}.html`, `${page.url}/`];
      for (const alias of aliases) {
        for (const method of ["GET", "HEAD"]) {
          const response = await request(
            docsOrigin,
            `${alias}?q=x%2Fy`,
            method,
          );
          assertEquals(response.status, 301, alias);
          assertEquals(
            response.headers.get("location"),
            `https://docs.wc3.dev${page.url}?q=x%2Fy`,
          );
          if (method === "HEAD") assertEquals(await response.text(), "");
          else await response.body?.cancel();
        }
      }
    }
    for (const section of sections) {
      for (const host of ["wc3.dev", "www.wc3.dev"]) {
        for (
          const path of [
            `/${section}`,
            `/${section}/`,
            `/${section}/any-page.html`,
          ]
        ) {
          for (const method of ["GET", "HEAD"]) {
            const response = await request(
              homeOrigin,
              `${path}?q=x%2Fy`,
              method,
              host,
            );
            assertEquals(response.status, 301);
            assertEquals(
              response.headers.get("location"),
              `https://docs.wc3.dev${
                path === `/${section}` ? `${path}/` : path
              }?q=x%2Fy`,
            );
            assertEquals(await response.text(), "");
          }
        }
      }
    }
  },
});

Deno.test({
  name: "a built page holds its own text once and no other page's text",
  ignore: !enabled,
  async fn() {
    const probes = records.flatMap((page) => {
      const text = probe(page);
      return text ? [{ page, text }] : [];
    });
    // Without a probe the loops below would pass without looking at anything.
    assertEquals(probes.length > 0, true, "no page yields text to look for");
    for (const page of records) {
      const html = await (await request(docsOrigin, page.url)).text();
      for (const { page: other, text } of probes) {
        const count = html.split(text).length - 1;
        if (other === page) {
          // The article is in the response once, and once more in the meta description when the
          // description (plain text, as the probe is) holds the probe. Anything above that is a
          // record given to an island.
          const expected = 1 + (page.description.includes(text) ? 1 : 0);
          assertEquals(
            count,
            expected,
            `${page.url} holds its own text ${count} times, not ${expected}`,
          );
        } else if (!page.html.includes(text)) {
          assertEquals(count, 0, `${page.url} holds text of ${other.url}`);
        }
      }
    }
  },
});

async function assetPaths(root: URL, prefix = ""): Promise<string[]> {
  const paths: string[] = [];
  for await (const entry of Deno.readDir(root)) {
    if (entry.isDirectory) {
      paths.push(
        ...await assetPaths(
          new URL(`${entry.name}/`, root),
          `${prefix}${entry.name}/`,
        ),
      );
    } else if (entry.isFile) paths.push(`${prefix}${entry.name}`);
  }
  return paths.sort();
}

Deno.test({
  name:
    "both built Workers serve every artwork font licence and provenance byte",
  ignore: !enabled,
  async fn() {
    const root = new URL("../shared/static/", import.meta.url);
    const paths = await assetPaths(root);
    assertEquals(paths.length, 19);
    for (const origin of [docsOrigin, homeOrigin]) {
      for (const path of paths) {
        const expected = await Deno.readFile(new URL(path, root));
        const response = await request(origin, `/${path}`);
        assertEquals(response.status, 200, path);
        const type = path.endsWith(".woff2")
          ? /^font\/woff2/
          : path.endsWith(".png")
          ? /^image\/png/
          : path.endsWith(".gif")
          ? /^image\/gif/
          : /^text\/(?:plain|markdown)/;
        assertMatch(response.headers.get("content-type") ?? "", type, path);
        assertEquals(
          new Uint8Array(await response.arrayBuffer()),
          expected,
          path,
        );
        const head = await request(origin, `/${path}`, "HEAD");
        assertEquals(head.status, 200, path);
        assertMatch(head.headers.get("content-type") ?? "", type, path);
        assertEquals(await head.text(), "");
      }
    }
  },
});
