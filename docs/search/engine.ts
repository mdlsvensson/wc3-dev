import MiniSearch, { type Query } from "minisearch";
import {
  searchTerms,
  searchWords,
  segmentParts,
  wordSegments,
} from "./terms.ts";
import type { SearchEngine, SearchPayload } from "./types.ts";

// The index is cut into words, segments and parts by searchTerms. A query is cut by createSearchEngine into a tree
// whose leaves are single terms, so the search-time tokenizer must keep a leaf whole. 'page' holds the title of the
// page a section is on; it is an index field only and is not shipped with the entries.
export const searchOptions = {
  fields: ["title", "heading", "text", "page"],
  tokenize: searchTerms,
  searchOptions: {
    tokenize: (term: string) => [term],
    boost: { title: 4, heading: 3, page: 0.5 },
    prefix: true,
    fuzzy: 0.2,
  },
};

function segmentQuery(segment: string): Query {
  const parts = segmentParts(segment);
  return parts.length
    ? {
      combineWith: "OR",
      queries: [segment, { combineWith: "AND", queries: parts }],
    }
    : segment;
}

function wordQuery(word: string): Query {
  const all = wordSegments(word);
  const segments = all.filter((segment) => segment.length >= 2);
  return all.length > 1 && segments.length
    ? {
      combineWith: "OR",
      queries: [
        word,
        { combineWith: "AND", queries: segments.map(segmentQuery) },
      ],
    }
    : segmentQuery(word);
}

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
      const words = searchWords(query);
      if (!words.length) return [];
      // Words of the query stay alternatives. A word matches whole, or by all of its segments; a segment matches
      // whole, or by all of its parts. 'issueT' must not match every word that starts with 't'.
      const tree: Query = { combineWith: "OR", queries: words.map(wordQuery) };
      return index.search(tree).map((result) => {
        const entry = entries.get(String(result.id));
        if (!entry) throw new Error("Missing documentation search entry");
        return entry;
      });
    },
  };
}
