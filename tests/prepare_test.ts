import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { pathToFileURL } from "node:url";
import { prepareDocumentation } from "../tools/content/prepare.ts";

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
    for (const directory of ["docs/content/", "shared/static/"]) {
      await copy(
        new URL(`../${directory}`, import.meta.url),
        new URL(directory, root),
      );
    }
    await prepareDocumentation(root);
    const outputs = ["pages.ts", "search.json"].map((name) =>
      new URL(`docs/generated/${name}`, root)
    );
    const before = await Promise.all(
      outputs.map((path) => Deno.readFile(path)),
    );
    const source = new URL("docs/content/moonwell/index.md", root);
    const original = await Deno.readTextFile(source);
    await Deno.writeTextFile(
      source,
      `${original}\n[broken](missing-task6.md)\n`,
    );
    await assertRejects(
      () => prepareDocumentation(root),
      Error,
      "missing-task6.md",
    );
    assertEquals(
      await Promise.all(outputs.map((path) => Deno.readFile(path))),
      before,
    );
    await Deno.writeTextFile(
      source,
      `${original}\n## Task Six Recovery\n\nRecovered content.\n`,
    );
    await prepareDocumentation(root);
    for (const path of outputs) {
      assertStringIncludes(await Deno.readTextFile(path), "Task Six Recovery");
    }
    const recovered = await Promise.all(
      outputs.map((path) => Deno.readFile(path)),
    );
    const section = new URL("docs/content/moonwell/", root);
    const moved = new URL("removed-section/", root);
    await Deno.rename(section, moved);
    await assertRejects(
      () => prepareDocumentation(root),
      Error,
      "missing navigation source",
    );
    assertEquals(
      await Promise.all(outputs.map((path) => Deno.readFile(path))),
      recovered,
    );
    await Deno.rename(moved, section);
    await prepareDocumentation(root);
    assertEquals(
      await Promise.all(outputs.map((path) => Deno.readFile(path))),
      recovered,
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
