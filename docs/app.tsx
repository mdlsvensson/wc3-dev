import { App } from "fresh";
import type { CompiledPage, SiteState } from "../shared/types.ts";
import DocsLandingPage from "./routes/index.tsx";

export function createDocsApp(_pages: readonly CompiledPage[]): App<SiteState> {
  return new App<SiteState>().get(
    "/",
    (ctx) => ctx.render(<DocsLandingPage />),
  );
}
