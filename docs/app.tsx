import { App } from "fresh";
import type { CompiledPage, SiteState } from "../shared/types.ts";
import DocsLandingPage from "./routes/index.tsx";
import { docsRedirect } from "../shared/routing.ts";
import { ErrorPage } from "../shared/components/ErrorPage.tsx";
import { DocPage } from "./components/DocPage.tsx";
import { navigation } from "./navigation.ts";

export function createDocsApp(pages: readonly CompiledPage[]): App<SiteState> {
  const app = new App<SiteState>()
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
      const response = docsRedirect(ctx.url, pages) ?? await ctx.next();
      if (ctx.req.method !== "HEAD") return response;
      await response.body?.cancel();
      return new Response(null, response);
    })
    .get("/", (ctx) => ctx.render(<DocsLandingPage />));
  for (const page of pages) {
    app.get(
      page.url,
      (ctx) =>
        ctx.render(<DocPage page={page} pages={pages} sections={navigation} />),
    );
  }
  return app.notFound((ctx) =>
    ctx.render(<ErrorPage status={404} />, { status: 404 })
  );
}
