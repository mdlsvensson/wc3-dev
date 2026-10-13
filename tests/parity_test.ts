import { assertEquals } from "@std/assert";
import { fileURLToPath } from "node:url";

// Files of the baseline that were replaced on purpose since: the code font changed from Pixel Code to JetBrains
// Mono, and the fonts' provenance file with it.
const replaced = new Set([
  "fonts/PixelCode.woff2",
  "fonts/PixelCode-Italic.woff2",
  "fonts/PixelCode-Bold.woff2",
  "fonts/PixelCode-LICENSE.txt",
  "fonts/README.md",
]);

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
    if (replaced.has(path)) continue;
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
