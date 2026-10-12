import type { SectionId } from "../../shared/types.ts";

/** The release each section documents, and the sections whose pages are written. */
export interface Versions {
  /** Moonwell's version, without the tag's prefix: `0.12.3`. */
  moonwell: string;
  /** The tag of moonwell-wrappers: `v0.10.1`. */
  wrappers: string;
  /** The tag of moonwell-systems: `v0.6.1`. */
  systems: string;
  /** A section that still holds placeholders is left out. */
  written: readonly SectionId[];
}

const libraries = [
  ["wrappers", "moonwell-wrappers"],
  ["systems", "moonwell-systems"],
] as const;

const version = "\\d+\\.\\d+\\.\\d+";

function lineAt(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

/** Each place where a page names another version than `versions` holds, as `file:line: reason`. */
export function versionMistakes(
  sources: ReadonlyMap<string, string>,
  versions: Versions,
): string[] {
  const mistakes: string[] = [];
  for (const [source, markdown] of sources) {
    const hold = (pattern: string, wanted: string, name: string) => {
      for (const match of markdown.matchAll(new RegExp(pattern, "g"))) {
        if (match[1] !== wanted) {
          const line = lineAt(markdown, match.index ?? 0);
          mistakes.push(
            `${source}:${line}: ${name} is ${wanted}, not ${match[1]}`,
          );
        }
      }
    };
    hold(`\\bmoonwell@(${version})`, versions.moonwell, "Moonwell");
    hold(`\\bMoonwell\\s+(${version})`, versions.moonwell, "Moonwell");
    for (const [section, repository] of libraries) {
      const wanted = versions[section];
      hold(
        `${repository}/(?:tree|blob|releases/tag|releases/download)/(v${version})`,
        wanted,
        repository,
      );
      hold(`${repository}\\s+(v${version})`, wanted, repository);
      // A `[[libraries]]` entry: the tag that follows the repository, before the next table or the fence's end.
      hold(
        `github\\s*=\\s*"mdlsvensson/${repository}"[^\\[\`]*?\\btag\\s*=\\s*"([^"]*)"`,
        wanted,
        repository,
      );
    }
  }
  for (const section of versions.written) {
    if (!sources.get(`${section}/index.md`)?.includes(versions[section])) {
      mistakes.push(
        `${section}/index.md: the Overview does not name ${versions[section]}`,
      );
    }
  }
  return mistakes;
}
