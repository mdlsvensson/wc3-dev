import type { NavSection, SectionId } from "../../shared/types.ts";
import { buildSidebars } from "../../docs/sidebar.ts";
import { compileDocumentation } from "../../tools/content/compile.ts";
import { readSources, staticAssetPaths } from "../../tools/content/prepare.ts";
import { navigation as sampleNavigation } from "../fixtures/site/navigation.ts";

export const sampleContent = new URL(
  "../fixtures/site/content/",
  import.meta.url,
);

/** One untitled group: the shape of a section whose pages are not written yet. */
export function flatSection(
  id: SectionId,
  sources: readonly string[],
  label: string = id,
): NavSection {
  return { id, label, groups: [{ pages: sources }] };
}

/** The title element of a documentation page as the page writes it: the renderer escapes `&`, `<` and `"` in text. */
export function titleElement(title: string): string {
  const escaped = title.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
  return `<title>${escaped} | wc3.dev</title>`;
}

export function staticAssets(): Promise<Set<string>> {
  return staticAssetPaths(new URL("../../", import.meta.url));
}

export async function loadSampleSite() {
  const sources = await readSources(sampleContent);
  const pages = await compileDocumentation(
    sources,
    sampleNavigation,
    await staticAssets(),
  );
  return {
    sources,
    navigation: sampleNavigation,
    pages,
    sidebars: buildSidebars(pages, sampleNavigation),
  };
}
