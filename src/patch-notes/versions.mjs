import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const defaultDocsDir = resolve(process.cwd(), "src/patch-notes/content/docs");

/**
 * Sorts an array of version strings in descending numeric order (newest first).
 * @param {string[]} versions
 * @returns {string[]}
 */
export function sortPatchVersions(versions) {
  return [...versions].sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }),
  );
}

/**
 * Reads all `.md` patch files from `src/patch-notes/content/docs` and returns
 * their version identifiers sorted newest-first.
 * @param {string} [dir]
 * @returns {string[]}
 */
export function getPatchVersions(dir = defaultDocsDir) {
  const versions = readdirSync(dir)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .map((file) => file.replace(/\.md$/i, ""));
  return sortPatchVersions(versions);
}
