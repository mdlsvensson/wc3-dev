import type { SearchEngine } from "./types.ts";

export function createSearchLoader(
  load: () => Promise<SearchEngine>,
): () => Promise<SearchEngine> {
  let pending: Promise<SearchEngine> | undefined;
  return () => {
    pending ??= load().catch((error) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
}
