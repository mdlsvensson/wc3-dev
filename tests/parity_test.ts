import { assertEquals } from "@std/assert";
import { fileURLToPath } from "node:url";

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
