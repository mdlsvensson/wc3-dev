import type {
  CompiledPage,
  NavSection,
  PageRecord,
} from "../../shared/types.ts";
import { navigation } from "../../docs/navigation.ts";
import { buildSidebars } from "../../docs/sidebar.ts";
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

export async function listFiles(
  directory: URL,
  prefix = "",
): Promise<string[]> {
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

/** Every Markdown file under a content folder, keyed by its path from that folder. */
export async function readSources(content: URL): Promise<Map<string, string>> {
  const sources = new Map<string, string>();
  for (const source of await listFiles(content)) {
    if (source.endsWith(".md")) {
      sources.set(source, await Deno.readTextFile(new URL(source, content)));
    }
  }
  return sources;
}

/** The public paths of the files under `shared/static/` of a checkout ("/fonts/x.woff2"). */
export async function staticAssetPaths(root: URL): Promise<Set<string>> {
  const files = await listFiles(new URL("shared/static/", root));
  return new Set(files.map((file) => `/${file}`));
}

export interface PrepareOptions {
  /** The checkout that holds shared/static/ and receives docs/generated/. */
  root?: URL;
  /** The folder of Markdown. Default: docs/content/ under the root. */
  content?: URL;
  navigation?: readonly NavSection[];
}

/** What the Worker bundles of a page. Search text and links stay in the build. */
export function pageRecord(page: CompiledPage): PageRecord {
  const { source, url, title, description, section, html, headings } = page;
  return { source, url, title, description, section, html, headings };
}

export async function prepareDocumentation(
  options: PrepareOptions = {},
): Promise<void> {
  const root = options.root ?? repo;
  const content = options.content ?? new URL("docs/content/", root);
  const sections = options.navigation ?? navigation;
  const sources = await readSources(content);
  const assets = await staticAssetPaths(root);
  const pages = await compileDocumentation(sources, sections, assets);
  const landingPage = compileLandingPage(pages, assets);
  const search = JSON.stringify(buildSearchPayload([landingPage, ...pages]));
  const module =
    'import type { PageRecord, Sidebars } from "../../shared/types.ts";\n\n' +
    `export const pages: readonly PageRecord[] = ${
      JSON.stringify(pages.map(pageRecord), null, 2)
    };\n\n` +
    `export const sidebars: Sidebars = ${
      JSON.stringify(buildSidebars(pages, sections), null, 2)
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
