import { assertEquals } from "@std/assert";
import { fileURLToPath } from "node:url";
import { compileDocumentation } from "../tools/content/compile.ts";
// @deno-types="@types/markdown-it"
import MarkdownIt from "markdown-it";
import { createHomeApp } from "../home/app.tsx";
import { createDocsApp } from "../docs/app.tsx";
import { assertStringIncludes } from "@std/assert";

const baselinePages = [
  ["moonwell/index.md", "/moonwell/", "moonwell", "moonwell"],
  [
    "moonwell/getting-started.md",
    "/moonwell/getting-started",
    "Getting started with Moonwell",
    "getting-started-with-moonwell",
  ],
  ["wrappers/index.md", "/wrappers/", "moonwell-wrappers", "moonwell-wrappers"],
  [
    "wrappers/getting-started.md",
    "/wrappers/getting-started",
    "Getting started with Moonwell Wrappers",
    "getting-started-with-moonwell-wrappers",
  ],
  ["systems/index.md", "/systems/", "moonwell-systems", "moonwell-systems"],
  [
    "systems/getting-started.md",
    "/systems/getting-started",
    "Getting started with Moonwell Systems",
    "getting-started-with-moonwell-systems",
  ],
] as const;

async function baseline(path: string): Promise<string> {
  const result = await new Deno.Command("git", {
    args: [
      "-C",
      fileURLToPath(new URL("../", import.meta.url)),
      "show",
      `feca80d:${path}`,
    ],
  }).output();
  assertEquals(result.code, 0);
  return new TextDecoder().decode(result.stdout);
}

function prose(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

Deno.test("all eight public pages retain canonical URLs, baseline prose, alternatives and navigation", async () => {
  const { navigation } = await import("../docs/navigation.ts");
  const sources = new Map<string, string>();
  for (const [source] of baselinePages) {
    sources.set(
      source,
      await Deno.readTextFile(
        new URL(`../docs/content/${source}`, import.meta.url),
      ),
    );
  }
  const pages = await compileDocumentation(sources, navigation, new Set());
  const docs = createDocsApp(pages).handler();
  const home = createHomeApp().handler();
  const urls = [
    "https://wc3.dev/",
    "https://docs.wc3.dev/",
    ...pages.map((p) => `https://docs.wc3.dev${p.url}`),
  ];
  assertEquals(urls, [
    "https://wc3.dev/",
    "https://docs.wc3.dev/",
    "https://docs.wc3.dev/moonwell/",
    "https://docs.wc3.dev/moonwell/getting-started",
    "https://docs.wc3.dev/wrappers/",
    "https://docs.wc3.dev/wrappers/getting-started",
    "https://docs.wc3.dev/systems/",
    "https://docs.wc3.dev/systems/getting-started",
  ]);
  const markdown = new MarkdownIt();
  for (const url of urls) {
    const response = await (url === urls[0] ? home : docs)(new Request(url));
    assertEquals(response.status, 200, url);
    const html = await response.text();
    const nav =
      html.match(/<nav class="desktop-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
    assertEquals([...nav.matchAll(/>([^<]+)<\/a>/g)].map((match) => match[1]), [
      "docs",
      "wrappers",
      "systems",
    ]);
    assertStringIncludes(
      html,
      'href="https://github.com/mdlsvensson/moonwell"',
    );
    assertStringIncludes(html, 'alt="Moonwell"');
    assertEquals(
      [...html.matchAll(/<img\b[^>]*\balt="([^"]*)"/g)].map((match) =>
        match[1]
      ),
      new URL(url).pathname === "/" ? ["Moonwell", "A moonwell"] : ["Moonwell"],
      `Image alternatives: ${url}`,
    );
    if (new URL(url).pathname === "/") {
      const original = await baseline(
        url === urls[0] ? "home/index.md" : "docs/index.md",
      );
      const expected = [
        ...original.matchAll(
          /^\s*(?:- )?(?:name|tagline|title|details): (.+)$/gm,
        ),
      ]
        .map((match) => match[1].replace(/^"|"$/g, ""));
      const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
      assertEquals(prose(main), expected.join(" "));
      assertStringIncludes(html, 'alt="A moonwell"');
      for (const match of original.matchAll(/^\s*link: (.+)$/gm)) {
        assertStringIncludes(main, `href="${match[1]}"`);
      }
    } else {
      const page = pages.find((p) => p.url === new URL(url).pathname)!;
      const original = await baseline(`docs/${page.source}`);
      const article =
        html.match(/<article class="doc-prose"[^>]*>([\s\S]*?)<\/article>/)
          ?.[1] ?? "";
      assertEquals(prose(article), prose(markdown.render(original)), url);
    }
  }
});

Deno.test("six authored documents preserve every baseline byte", async () => {
  for (const [source] of baselinePages) {
    const blob = await new Deno.Command("git", {
      args: [
        "-C",
        fileURLToPath(new URL("../", import.meta.url)),
        "show",
        `feca80d:docs/${source}`,
      ],
    }).output();
    assertEquals(blob.code, 0);
    const actual = await Deno.readFile(
      new URL(`../docs/content/${source}`, import.meta.url),
    );
    assertEquals(
      actual,
      blob.stdout,
      `Changed authored Markdown bytes: ${source}`,
    );
  }
});

Deno.test("six documentation URLs titles and headings retain the baseline", async () => {
  const { navigation } = await import("../docs/navigation.ts");
  const sources = new Map<string, string>();
  for (const [source] of baselinePages) {
    sources.set(
      source,
      await Deno.readTextFile(
        new URL(`../docs/content/${source}`, import.meta.url),
      ),
    );
  }
  const pages = await compileDocumentation(sources, navigation, new Set());
  assertEquals<readonly (readonly (string | undefined)[])[]>(
    pages.map((p) => [p.source, p.url, p.title, p.headings[0]?.id]),
    baselinePages,
  );
});

Deno.test("shared static assets preserve every baseline byte and licence", async () => {
  const repo = new URL("../", import.meta.url);
  const listing = await new Deno.Command("git", {
    args: [
      "-C",
      fileURLToPath(repo),
      "ls-tree",
      "-r",
      "--name-only",
      "feca80d:docs/public",
    ],
  }).output();
  assertEquals(listing.code, 0);
  const paths = new TextDecoder().decode(listing.stdout).trim().split("\n");
  for (const path of paths) {
    const blob = await new Deno.Command("git", {
      args: [
        "-C",
        fileURLToPath(repo),
        "show",
        `feca80d:docs/public/${path}`,
      ],
    }).output();
    assertEquals(blob.code, 0);
    let actual: Uint8Array | undefined;
    try {
      actual = await Deno.readFile(
        new URL(`../shared/static/${path}`, import.meta.url),
      );
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
    assertEquals(actual !== undefined, true, `Missing static asset: ${path}`);
    assertEquals(
      actual?.length,
      blob.stdout.length,
      `Changed static asset length: ${path}`,
    );
    assertEquals(
      actual?.every((byte, i) => byte === blob.stdout[i]),
      true,
      `Changed static asset bytes: ${path}`,
    );
  }
});
