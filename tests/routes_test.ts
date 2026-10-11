import { assertEquals, assertStringIncludes } from "@std/assert";
import { createHomeApp } from "../home/app.tsx";
import { createDocsApp } from "../docs/app.tsx";
import { navigation } from "../docs/navigation.ts";
import { compileDocumentation } from "../tools/content/compile.ts";
import type { CompiledPage } from "../shared/types.ts";

const sources = new Map(navigation.flatMap((section) =>
  [
    [
      section.sources[0],
      `# ${section.label}\n\nOverview.\n\n## Installation\n\n### Details\n\n\`\`\`lua\nprint("${
        "wide ".repeat(60)
      }")\n\`\`\`\n\n| Name | Value |\n| --- | --- |\n| Wide | ${
        "wide".repeat(70)
      } |\n`,
    ],
    [
      section.sources[1],
      `# Getting started with ${section.label}\n\nStart here.`,
    ],
  ] as [string, string][]
));
const pages = await compileDocumentation(sources, navigation, new Set());

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

Deno.test("docs redirect only known section and HTML aliases", async () => {
  const handler = createDocsApp(pages).handler();
  for (const section of ["moonwell", "wrappers", "systems"]) {
    for (
      const [path, target] of [
        [`/${section}`, `/${section}/`],
        [`/${section}/index`, `/${section}/`],
        [`/${section}/index.html`, `/${section}/`],
        [`/${section}/getting-started.html`, `/${section}/getting-started`],
      ]
    ) {
      const response = await handler(
        new Request(`https://docs.wc3.dev${path}?q=x%2Fy`),
      );
      assertEquals(response.status, 301);
      assertEquals(
        response.headers.get("location"),
        `https://docs.wc3.dev${target}?q=x%2Fy`,
      );
    }
  }
});

Deno.test("unknown paths and missing assets return readable 404s", async () => {
  for (const app of [createHomeApp(), createDocsApp(pages)]) {
    for (
      const path of [
        "/moonwells",
        "/wrappers-extra",
        "/unknown",
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
    (await createDocsApp(pages).handler()(
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
      [createDocsApp(pages), [["/", 200], ...pages.map((p) => [p.url, 200]), [
        "/moonwell",
        301,
      ], ["/missing.woff2", 404]]],
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

Deno.test("documentation sidebar, pager and outline follow authored navigation", async () => {
  const handler = createDocsApp([...pages].reverse()).handler();
  for (const page of pages) {
    const html =
      await (await handler(new Request(`https://docs.wc3.dev${page.url}`)))
        .text();
    assertEquals((html.match(/<h1\b/g) ?? []).length, 1);
    assertStringIncludes(html, `<title>${page.title} | wc3.dev</title>`);
    assertStringIncludes(html, `href="${page.url}" aria-current="page"`);
    assertStringIncludes(html, 'aria-label="Documentation navigation"');
    assertEquals(
      html.indexOf('href="/wrappers/"') < html.indexOf('href="/systems/"'),
      true,
    );
    const sidebar = html.slice(
      html.indexOf('class="sidebar-links"'),
      html.indexOf("</nav>", html.indexOf('class="sidebar-links"')),
    );
    assertStringIncludes(sidebar, ">Getting started</a>");
    assertEquals(sidebar.includes("Getting started with"), false);
    assertEquals(
      sidebar.indexOf(`href="/${page.section}/"`) <
        sidebar.indexOf(`href="/${page.section}/getting-started"`),
      true,
    );
    for (
      const other of ["moonwell", "wrappers", "systems"].filter((id) =>
        id !== page.section
      )
    ) assertEquals(sidebar.includes(`href="/${other}/"`), false);
    if (page.source.endsWith("index.md")) {
      assertStringIncludes(
        html,
        `rel="next" href="/${page.section}/getting-started"`,
      );
      const pager = html.slice(html.indexOf('class="doc-pager"'));
      assertStringIncludes(pager, "<strong>Getting started</strong>");
      assertStringIncludes(html, 'href="#installation"');
      assertStringIncludes(html, 'href="#details"');
      assertStringIncludes(html, "<table>");
      assertStringIncludes(html, "<pre");
    } else assertStringIncludes(html, `rel="prev" href="/${page.section}/"`);
  }
  const root = await (await handler(new Request("https://docs.wc3.dev/")))
    .text();
  assertEquals(root.includes('aria-label="Documentation navigation"'), false);
});

Deno.test("render failures are logged and return a generic 500", async () => {
  const broken: CompiledPage = {
    source: "moonwell/index.md",
    url: "/moonwell/",
    title: "Moonwell",
    section: "moonwell",
    headings: [],
    links: [],
    text: "Moonwell",
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
