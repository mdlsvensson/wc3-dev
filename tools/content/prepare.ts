import { navigation } from "../../docs/navigation.ts";
import { compileDocumentation, compileLandingPage } from "./compile.ts";

const repo = new URL("../../", import.meta.url);

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

export async function prepareDocumentation(): Promise<void> {
  const content = new URL("docs/content/", repo);
  const sources = new Map<string, string>();
  for (const source of await listFiles(content)) {
    if (source.endsWith(".md")) {
      sources.set(source, await Deno.readTextFile(new URL(source, content)));
    }
  }
  const assets = new Set(
    (await listFiles(new URL("shared/static/", repo))).map((asset) =>
      `/${asset}`
    ),
  );
  const pages = await compileDocumentation(sources, navigation, assets);
  const landingPage = compileLandingPage(pages, assets);
  const module =
    'import type { CompiledPage } from "../../shared/types.ts";\n\n' +
    `export const pages: readonly CompiledPage[] = ${
      JSON.stringify(pages, null, 2)
    };\n\n` +
    `export const landingPage: CompiledPage = ${
      JSON.stringify(landingPage, null, 2)
    };\n`;
  // Finish all validation before touching output; replace the module only once it is fully written.
  const generated = new URL("docs/generated/", repo);
  await Deno.mkdir(generated, { recursive: true });
  const temporary = new URL("pages.ts.tmp", generated);
  await Deno.writeTextFile(temporary, module);
  await Deno.rename(temporary, new URL("pages.ts", generated));
}

if (import.meta.main) await prepareDocumentation();
