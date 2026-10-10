import { App } from "fresh";
import type { CompiledPage, SiteState } from "../shared/types.ts";

export function createDocsApp(_pages: readonly CompiledPage[]): App<SiteState> {
  return new App<SiteState>().get("/", (ctx) => ctx.render(<h1>Moonwell</h1>));
}
