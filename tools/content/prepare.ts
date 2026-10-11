import { navigation } from "../../docs/navigation.ts";
import { compileDocumentation, compileLandingPage } from "./compile.ts";
import { buildSearchPayload } from "../../docs/search/index.ts";

const repo = new URL("../../", import.meta.url);

async function removeTemporary(path: URL): Promise<void> {
  try {
    await Deno.remove(path);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
}

async function listFiles(directory: URL, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory) {
      files.push(
        ...await listFiles(
          new URL(`${entry.name}/`, directory),
          `${relative}/`,
        ),
      );
    } else if (entry.isFile) files.push(relative);
  }
  return files.sort();
}

export async function prepareDocumentation(root: URL = repo): Promise<void> {
  const content = new URL("docs/content/", root);
  const sources = new Map<string, string>();
  for (const source of await listFiles(content)) {
    if (source.endsWith(".md")) {
      sources.set(source, await Deno.readTextFile(new URL(source, content)));
    }
  }
  const assets = new Set(
    (await listFiles(new URL("shared/static/", root))).map((asset) =>
      `/${asset}`
    ),
  );
  const pages = await compileDocumentation(sources, navigation, assets);
  const landingPage = compileLandingPage(pages, assets);
  const search = JSON.stringify(buildSearchPayload([landingPage, ...pages]));
  const module =
    'import type { CompiledPage } from "../../shared/types.ts";\n\n' +
    `export const pages: readonly CompiledPage[] = ${
      JSON.stringify(pages, null, 2)
    };\n\n` +
    `export const landingPage: CompiledPage = ${
      JSON.stringify(landingPage, null, 2)
    };\n`;
  // Validate once, stage both outputs, then publish while the Vite plugin withholds
  // requests and reloads. Retain the previous pair if filesystem publication fails.
  const generated = new URL("docs/generated/", root);
  await Deno.mkdir(generated, { recursive: true });
  const outputs = [["pages.ts", module], ["search.json", search]] as const;
  const previous = await Promise.all(outputs.map(async ([name]) => {
    try {
      return await Deno.readFile(new URL(name, generated));
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
      return undefined;
    }
  }));
  let published = 0;
  try {
    for (const [name, value] of outputs) {
      await Deno.writeTextFile(new URL(`${name}.tmp`, generated), value);
    }
    for (const [name] of outputs) {
      await Deno.rename(
        new URL(`${name}.tmp`, generated),
        new URL(name, generated),
      );
      published++;
    }
  } catch (error) {
    for (let i = 0; i < published; i++) {
      const target = new URL(outputs[i][0], generated);
      if (previous[i]) await Deno.writeFile(target, previous[i]!);
      else await Deno.remove(target);
    }
    throw error;
  } finally {
    for (const [name] of outputs) {
      await removeTemporary(new URL(`${name}.tmp`, generated));
    }
  }
}

if (import.meta.main) await prepareDocumentation();
