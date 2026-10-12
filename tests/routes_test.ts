import { assertEquals, assertStringIncludes } from "@std/assert";
import { createHomeApp } from "../home/app.tsx";
import { createDocsApp } from "../docs/app.tsx";
import { buildSidebars } from "../docs/sidebar.ts";
import type { PageRecord } from "../shared/types.ts";
import { compileDocumentation } from "../tools/content/compile.ts";
import { flatSection, loadSampleSite, titleElement } from "./support/site.ts";

const { navigation, pages, sidebars } = await loadSampleSite();

/** What every page's header holds, and the alternative of every image on the page. */
function assertHeader(html: string, alternatives: readonly string[]): void {
  const nav =
    html.match(/<nav class="desktop-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
  assertEquals([...nav.matchAll(/>([^<]+)<\/a>/g)].map((match) => match[1]), [
    "docs",
    "wrappers",
    "systems",
  ]);
  assertStringIncludes(html, 'href="https://github.com/mdlsvensson/moonwell"');
  assertEquals(
    [...html.matchAll(/<img\b[^>]*\balt="([^"]*)"/g)].map((match) => match[1]),
    alternatives,
  );
}

Deno.test("home redirects preserve section paths and queries on both hosts", async () => {
  for (const host of ["wc3.dev", "www.wc3.dev"]) {
    for (const section of ["moonwell", "wrappers", "systems"]) {
      for (
        const [path, target] of [
          [`/${section}`, `/${section}/`],
          [`/${section}/`, `/${section}/`],
          [
            `/${section}/getting-started.html`,
            `/${section}/getting-started.html`,
          ],
          [`/${section}/a%20b`, `/${section}/a%20b`],
          [`/${section}/%2F%2Fevil.example`, `/${section}/%2F%2Fevil.example`],
        ]
      ) {
        const response = await createHomeApp().handler()(
          new Request(`https://${host}${path}?q=x%2Fy`),
        );
        assertEquals(response.status, 301);
        assertEquals(
          response.headers.get("location"),
          `https://docs.wc3.dev${target}?q=x%2Fy`,
        );
      }
    }
  }
});

Deno.test("docs redirect the aliases of every page and nothing else", async () => {
  const handler = createDocsApp(pages, sidebars).handler();
  for (const page of pages) {
    const aliases = page.url.endsWith("/")
      ? [page.url.slice(0, -1), `${page.url}index`, `${page.url}index.html`]
      : [`${page.url}.html`, `${page.url}/`];
    for (const alias of aliases) {
      const response = await handler(
        new Request(`https://docs.wc3.dev${alias}?q=x%2Fy`),
      );
      assertEquals(response.status, 301, alias);
      assertEquals(
        response.headers.get("location"),
        `https://docs.wc3.dev${page.url}?q=x%2Fy`,
      );
    }
  }
});

Deno.test("unknown paths and missing assets return readable 404s", async () => {
  for (
    const app of [
      createHomeApp(),
      createDocsApp(pages, sidebars),
    ]
  ) {
    for (
      const path of [
        "/moonwells",
        "/wrappers-extra",
        "/unknown",
        "/unknown/",
        "/unknown.html",
        "/unknown/index",
        "/unknown/index.html",
        "/missing.woff2",
      ]
    ) {
      const response = await app.handler()(
        new Request(`https://wc3.dev${path}`),
      );
      assertEquals(response.status, 404);
      const html = await response.text();
      assertStringIncludes(html, "Page not found");
      assertStringIncludes(html, 'href="/"');
    }
  }
  assertEquals(
    (await createDocsApp(pages, sidebars).handler()(
      new Request("https://docs.wc3.dev/moonwell/%2F%2Fevil.example"),
    )).status,
    404,
  );
});

Deno.test("GET and HEAD share status and headers while unsupported methods fail", async () => {
  for (
    const [app, paths] of [
      [createHomeApp(), [["/", 200], ["/moonwell", 301], [
        "/missing.woff2",
        404,
      ]]],
      [createDocsApp(pages, sidebars), [
        ["/", 200],
        ...pages.map((p) => [p.url, 200]),
        ["/moonwell", 301],
        ["/missing.woff2", 404],
      ]],
    ] as const
  ) {
    const handler = app.handler();
    for (const [path, status] of paths) {
      const get = await handler(new Request(`https://wc3.dev${path}`));
      const head = await handler(
        new Request(`https://wc3.dev${path}`, { method: "HEAD" }),
      );
      assertEquals(get.status, status);
      assertEquals(head.status, status);
      assertEquals(
        head.headers.get("content-type"),
        get.headers.get("content-type"),
      );
      assertEquals(head.headers.get("location"), get.headers.get("location"));
      assertEquals(await head.text(), "");
      await get.body?.cancel();
      const post = await handler(
        new Request(`https://wc3.dev${path}`, { method: "POST" }),
      );
      assertEquals(post.status, 405);
    }
  }
});

Deno.test("every sample page shows its own section's sidebar, its title and one h1", async () => {
  // The records arrive in the wrong order: the sidebars must come out as navigation orders them.
  const reversed = [...pages].reverse();
  const handler = createDocsApp(reversed, buildSidebars(reversed, navigation))
    .handler();
  for (const page of pages) {
    const html =
      await (await handler(new Request(`https://docs.wc3.dev${page.url}`)))
        .text();
    assertEquals((html.match(/<h1\b/g) ?? []).length, 1);
    assertStringIncludes(html, titleElement(page.title));
    assertStringIncludes(html, `href="${page.url}" aria-current="page"`);
    assertStringIncludes(html, 'aria-label="Documentation navigation"');
    assertHeader(html, ["Moonwell"]);
    const sidebar = html.slice(
      html.indexOf('class="sidebar-links"'),
      html.indexOf("</nav>", html.indexOf('class="sidebar-links"')),
    );
    for (
      const other of ["moonwell", "wrappers", "systems"].filter((id) =>
        id !== page.section
      )
    ) assertEquals(sidebar.includes(`href="/${other}/"`), false);
  }
  const overview =
    await (await handler(new Request("https://docs.wc3.dev/moonwell/")))
      .text();
  assertStringIncludes(overview, 'href="#what-a-build-does"');
  assertStringIncludes(overview, 'href="#the-staged-copy"');
  assertStringIncludes(overview, 'rel="next" href="/moonwell/installation"');
  const wide = await (await handler(
    new Request("https://docs.wc3.dev/moonwell/first-map"),
  ))
    .text();
  assertStringIncludes(wide, "<table>");
  assertStringIncludes(wide, "<pre");
  const root = await (await handler(new Request("https://docs.wc3.dev/")))
    .text();
  assertEquals(root.includes('aria-label="Documentation navigation"'), false);
});

Deno.test("a title that holds markup characters is found as the page writes it", async () => {
  const nav = [
    flatSection("moonwell", ["moonwell/index.md", "moonwell/quoted.md"]),
  ];
  const titled = await compileDocumentation(
    new Map([
      ["moonwell/index.md", "# Save & load <fast>\n"],
      ["moonwell/quoted.md", '# The "staged" copy\n'],
    ]),
    nav,
    new Set(),
  );
  assertEquals(titled.map((page) => page.title), [
    "Save & load <fast>",
    'The "staged" copy',
  ]);
  const handler = createDocsApp(titled, buildSidebars(titled, nav)).handler();
  for (const page of titled) {
    const html =
      await (await handler(new Request(`https://docs.wc3.dev${page.url}`)))
        .text();
    assertEquals(html.includes(`<title>${page.title} |`), false, page.title);
    assertStringIncludes(html, titleElement(page.title));
  }
});

Deno.test("both landing pages keep the header's links, the GitHub link and their two images", async () => {
  for (
    const [app, url] of [
      [createHomeApp(), "https://wc3.dev/"],
      [createDocsApp(pages, sidebars), "https://docs.wc3.dev/"],
    ] as const
  ) {
    const response = await app.handler()(new Request(url));
    assertEquals(response.status, 200, url);
    assertHeader(await response.text(), ["Moonwell", "A moonwell"]);
  }
});

Deno.test("render failures are logged and return a generic 500", async () => {
  const broken: PageRecord = {
    source: "moonwell/index.md",
    url: "/moonwell/",
    title: "Moonwell",
    description: "",
    section: "moonwell",
    headings: [],
    get html(): string {
      throw new Error("private failure detail");
    },
  };
  const logger = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => logged.push(args);
  try {
    const handler = createDocsApp([broken]).handler();
    for (const method of ["GET", "HEAD"]) {
      const response = await handler(
        new Request("https://docs.wc3.dev/moonwell/", { method }),
      );
      assertEquals(response.status, 500);
      const html = await response.text();
      assertEquals(html.includes("private failure detail"), false);
      assertEquals(html.includes("Error:"), false);
      if (method === "GET") assertStringIncludes(html, "Something went wrong");
      else assertEquals(html, "");
    }
    assertEquals(
      logged.some((args) =>
        args.some((arg) =>
          arg instanceof Error && arg.message === "private failure detail"
        )
      ),
      true,
    );
  } finally {
    console.error = logger;
  }
});
