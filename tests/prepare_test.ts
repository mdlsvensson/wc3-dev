import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { pathToFileURL } from "node:url";
import { prepareDocumentation } from "../tools/content/prepare.ts";
import { navigation } from "./fixtures/site/navigation.ts";
import { sampleContent } from "./support/site.ts";

async function copy(from: URL, to: URL) {
  await Deno.mkdir(to, { recursive: true });
  for await (const entry of Deno.readDir(from)) {
    const name = entry.name + (entry.isDirectory ? "/" : "");
    if (entry.isDirectory) await copy(new URL(name, from), new URL(name, to));
    else await Deno.copyFile(new URL(name, from), new URL(name, to));
  }
}

Deno.test("invalid content preserves the generated page/search pair and recovery publishes both", async () => {
  const temporary = await Deno.makeTempDir();
  const root = pathToFileURL(`${temporary}/`);
  try {
    await copy(sampleContent, new URL("content/", root));
    await copy(
      new URL("../shared/static/", import.meta.url),
      new URL("shared/static/", root),
    );
    const options = { root, content: new URL("content/", root), navigation };
    await prepareDocumentation(options);
    const module = await Deno.readTextFile(
      new URL("docs/generated/pages.ts", root),
    );
    assertStringIncludes(module, "export const pages: readonly PageRecord[]");
    assertStringIncludes(module, "export const sidebars: Sidebars");
    assertStringIncludes(module, '"title": "Reference"');
    // A record's own keys are indented by four spaces; a heading's "text" is deeper.
    assertStringIncludes(module, '\n    "html":');
    assertStringIncludes(module, '\n    "description":');
    for (
      const key of [
        '\n    "text":',
        '\n    "links":',
        '\n    "code":',
        "landingPage",
      ]
    ) {
      assertEquals(module.includes(key), false, key);
    }
    const outputs = ["pages.ts", "search.json"].map((name) =>
      new URL(`docs/generated/${name}`, root)
    );
    const before = await Promise.all(
      outputs.map((path) => Deno.readFile(path)),
    );
    const source = new URL("content/moonwell/index.md", root);
    const original = await Deno.readTextFile(source);
    await Deno.writeTextFile(
      source,
      `${original}\n[broken](missing-page.md)\n`,
    );
    await assertRejects(
      () => prepareDocumentation(options),
      Error,
      "missing-page.md",
    );
    assertEquals(
      await Promise.all(outputs.map((path) => Deno.readFile(path))),
      before,
    );
    await Deno.writeTextFile(
      source,
      `${original}\n## Recovered heading\n\nRecovered content.\n`,
    );
    await prepareDocumentation(options);
    for (const path of outputs) {
      assertStringIncludes(await Deno.readTextFile(path), "Recovered heading");
    }
    const recovered = await Promise.all(
      outputs.map((path) => Deno.readFile(path)),
    );
    const section = new URL("content/moonwell/", root);
    const moved = new URL("removed-section/", root);
    await Deno.rename(section, moved);
    await assertRejects(
      () => prepareDocumentation(options),
      Error,
      "missing navigation source",
    );
    assertEquals(
      await Promise.all(outputs.map((path) => Deno.readFile(path))),
      recovered,
    );
    await Deno.rename(moved, section);
    await prepareDocumentation(options);
    assertEquals(
      await Promise.all(outputs.map((path) => Deno.readFile(path))),
      recovered,
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
