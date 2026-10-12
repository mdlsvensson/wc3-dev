import MiniSearch from "minisearch";
import { searchTerms } from "./terms.ts";
import type { SearchEngine, SearchPayload } from "./types.ts";

export const searchOptions = {
  fields: ["title", "heading", "text"],
  tokenize: searchTerms,
  searchOptions: {
    boost: { title: 4, heading: 3 },
    prefix: true,
    fuzzy: 0.2,
  },
};

export function createSearchEngine(payload: unknown): SearchEngine {
  if (
    !payload || typeof payload !== "object" ||
    !("index" in payload) || typeof payload.index !== "string" ||
    !("entries" in payload) || !Array.isArray(payload.entries) ||
    !payload.entries.every((entry: unknown) =>
      entry !== null && typeof entry === "object" &&
      ["id", "url", "title", "heading", "excerpt"].every((field) =>
        field in entry &&
        typeof (entry as Record<string, unknown>)[field] === "string"
      )
    )
  ) throw new Error("Invalid documentation search data");
  const data = payload as SearchPayload;
  const entries = new Map(data.entries.map((entry) => [entry.id, entry]));
  if (entries.size !== data.entries.length) {
    throw new Error("Duplicate documentation search entries");
  }
  const index = MiniSearch.loadJSON(data.index, searchOptions);
  return {
    search(query) {
      if (!searchTerms(query).length) return [];
      return index.search(query).map((result) => {
        const entry = entries.get(String(result.id));
        if (!entry) throw new Error("Missing documentation search entry");
        return entry;
      });
    },
  };
}
