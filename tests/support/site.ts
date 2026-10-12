import type { NavSection, SectionId } from "../../shared/types.ts";

/** One untitled group: the shape of a section whose pages are not written yet. */
export function flatSection(
  id: SectionId,
  sources: readonly string[],
  label: string = id,
): NavSection {
  return { id, label, groups: [{ pages: sources }] };
}
