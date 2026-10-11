import { App } from "fresh";
import type { SiteState } from "../shared/types.ts";
import HomePage from "./routes/index.tsx";
import { homeRedirect } from "../shared/routing.ts";
import { ErrorPage } from "../shared/components/ErrorPage.tsx";

export function createHomeApp(): App<SiteState> {
  return new App<SiteState>()
    .onError("*", (ctx) => {
      console.error(ctx.error);
      return ctx.render(<ErrorPage status={500} />, { status: 500 });
    })
    .use(async (ctx) => {
      if (!["GET", "HEAD"].includes(ctx.req.method)) {
        return new Response(null, {
          status: 405,
          headers: { Allow: "GET, HEAD" },
        });
      }
      const response = homeRedirect(ctx.url) ?? await ctx.next();
      if (ctx.req.method !== "HEAD") return response;
      await response.body?.cancel();
      return new Response(null, response);
    })
    .get("/", (ctx) => ctx.render(<HomePage />))
    .notFound((ctx) => ctx.render(<ErrorPage status={404} />, { status: 404 }));
}
