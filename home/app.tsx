import { App } from "fresh";
import type { SiteState } from "../shared/types.ts";
import HomePage from "./routes/index.tsx";

export function createHomeApp(): App<SiteState> {
  return new App<SiteState>().get("/", (ctx) => ctx.render(<HomePage />));
}
