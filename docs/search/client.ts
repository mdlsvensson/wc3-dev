// @deno-types="./assets.d.ts"
import searchUrl from "../generated/search.json?url&no-inline";
import { createSearchEngine } from "./engine.ts";
import { createSearchLoader } from "./loader.ts";

export const loadSearchEngine = createSearchLoader(async () => {
  const response = await fetch(searchUrl);
  if (!response.ok) throw new Error("Documentation search could not be loaded");
  return createSearchEngine(await response.json());
});
