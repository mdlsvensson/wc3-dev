import { App } from "fresh";
import type { SiteState } from "../shared/types.ts";

export function createHomeApp(): App<SiteState> {
  return new App<SiteState>().get("/", (ctx) => ctx.render(<h1>Moonwell</h1>));
}
