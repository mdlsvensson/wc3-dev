import { assertEquals } from "@std/assert";
import { fileURLToPath } from "node:url";
import { compileDocumentation } from "../tools/content/compile.ts";

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
