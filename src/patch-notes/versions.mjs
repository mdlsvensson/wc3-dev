import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const defaultDocsDir = resolve(process.cwd(), "src/patch-notes/content/docs");

const PATCH_ICONS = {
  buff: '<span class="mw-patch-badge mw-patch-buff" title="Buff" aria-label="Buff"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-arrow-up" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/></svg></span>',
  nerf: '<span class="mw-patch-badge mw-patch-nerf" title="Nerf" aria-label="Nerf"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-arrow-down" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="m8 12 4 4 4-4"/></svg></span>',
  neutral:
    '<span class="mw-patch-badge mw-patch-neutral" title="Adjustment" aria-label="Adjustment"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-minus" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg></span>',
};

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

/**
 * Replaces `:buff:`, `:nerf:`, `:neutral:` shortcodes and Liquipedia buff/nerf/neutral
 * base64 image references with inline Lucide SVG badges.
 * @param {string} markdown
 * @returns {string}
 */
export function transformPatchNotesMarkdown(markdown) {
  /** @type {Map<string, "buff" | "nerf" | "neutral">} */
  const imageKinds = new Map();

  let output = markdown
    .replace(/^\s+(#{1,6}\s)/gm, "$1")
    .replace(/^\s*-\s*$/gm, "")
    .replace(/^\[(image\d+)\]:\s*(data:image\/[^\s]+)\s*$/gm, (fullMatch, id, dataUri) => {
      if (dataUri.includes("AAAEm0lEQVR4")) {
        imageKinds.set(id, "buff");
        return "";
      }
      if (dataUri.includes("AAADX9CSS")) {
        imageKinds.set(id, "nerf");
        return "";
      }
      if (dataUri.includes("AAAE4klEQVR4")) {
        imageKinds.set(id, "neutral");
        return "";
      }
      return fullMatch;
    });

  output = output.replace(
    /(?:\*\*)?!\[(Buff|Nerf|Neutral)?\]\[(image\d+)\](?:\*\*)?/gi,
    (fullMatch, altText, id) => {
      const explicitKind = altText ? altText.toLowerCase() : undefined;
      const kind =
        explicitKind === "buff" || explicitKind === "nerf" || explicitKind === "neutral"
          ? explicitKind
          : imageKinds.get(id);
      if (kind && PATCH_ICONS[kind]) {
        return PATCH_ICONS[kind];
      }
      return fullMatch;
    },
  );

  output = output.replace(
    /(?:\*\*)?(?::(buff|nerf|neutral):|!\[(buff|nerf|neutral)\](?!\[|\())(?:\*\*)?/gi,
    (_fullMatch, colonKind, bangKind) => {
      const kind = (colonKind || bangKind).toLowerCase();
      return PATCH_ICONS[kind];
    },
  );

  return output;
}
