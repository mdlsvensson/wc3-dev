import { codeLanguages } from "../../shared/code-languages.ts";

export const storageKey = "wc3.dev:code-languages";

const known = new Set(codeLanguages.map((language) => language.name));

/** The stored list of chosen languages, latest first. Anything that is not a language's name is dropped. */
export function parseStored(value: string | null): string[] {
  return [
    ...new Set((value ?? "").split(" ").filter((name) => known.has(name))),
  ];
}

/** The language a group shows: the first chosen one that it has, or else its first. */
export function pickLanguage(
  stored: readonly string[],
  group: readonly string[],
): string {
  return stored.find((name) => group.includes(name)) ?? group[0];
}

/** The list after a choice in a group: the choice first, and none of that group's other languages. */
export function chooseLanguage(
  stored: readonly string[],
  group: readonly string[],
  chosen: string,
): string[] {
  return [chosen, ...stored.filter((name) => !group.includes(name))];
}

/** The tab that a key moves to, in a tab list of `count` tabs with `index` focused. */
export function nextTab(
  count: number,
  index: number,
  key: string,
): number | undefined {
  if (key === "ArrowRight") return (index + 1) % count;
  if (key === "ArrowLeft") return (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return undefined;
}

/**
 * The list a page starts a choice from: the one it already holds (the root element's attribute, which every choice
 * updates) when it has one, else the stored one. Storage alone would lose choices when it cannot be written.
 */
export function pageLanguages(
  pageValue: string | null,
  storedValue: string | null,
): string[] {
  return parseStored(pageValue ?? storedValue);
}
