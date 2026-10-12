import type { NavSection, SectionId } from "../../shared/types.ts";
import { buildSidebars } from "../../docs/sidebar.ts";
import { compileDocumentation } from "../../tools/content/compile.ts";
import { listFiles, readSources } from "../../tools/content/prepare.ts";
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

export async function staticAssets(): Promise<Set<string>> {
  const files = await listFiles(
    new URL("../../shared/static/", import.meta.url),
  );
  return new Set(files.map((file) => `/${file}`));
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
