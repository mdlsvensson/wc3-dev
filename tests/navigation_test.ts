import {
  assertEquals,
  assertInstanceOf,
  assertNotEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { isValidElement, type VNode } from "preact";
import type { NavSection } from "../shared/types.ts";
import { createDocsApp } from "../docs/app.tsx";
import { DocPage } from "../docs/components/DocPage.tsx";
import DocMenu from "../docs/islands/DocMenu.tsx";
import { buildSidebars, docMenuProps, sidebarItems } from "../docs/sidebar.ts";
import { compileDocumentation } from "../tools/content/compile.ts";

const nav: readonly NavSection[] = [{
  id: "moonwell",
  label: "moonwell",
  groups: [
    {
      title: "Guide",
      pages: [
        { source: "moonwell/index.md", label: "Overview" },
        "moonwell/install.md",
      ],
    },
    { title: "Reference", pages: ["moonwell/reference/commands.md"] },
    { title: "Internals", pages: ["moonwell/reference/files.md"] },
  ],
}, {
  id: "wrappers",
  label: "moonwell-wrappers",
  groups: [{ pages: ["wrappers/index.md"] }],
}];
const marker = "MARKER only the commands page says this.";
const sources = new Map([
  [
    "moonwell/index.md",
    "# Moonwell\n\n## Start\n\n### Deeper\n\n#### Deepest\n",
  ],
  ["moonwell/install.md", "# Installation\n"],
  ["moonwell/reference/commands.md", `# Commands\n\n${marker}\n`],
  ["moonwell/reference/files.md", "# Files and caches\n"],
  ["wrappers/index.md", "# Wrappers\n"],
]);
const pages = await compileDocumentation(sources, nav, new Set());
const sidebars = buildSidebars(pages, nav);
const handler = createDocsApp(pages, sidebars).handler();

async function get(path: string): Promise<string> {
  return await (await handler(new Request(`https://docs.wc3.dev${path}`)))
    .text();
}
function sidebarOf(html: string): string {
  const start = html.indexOf('class="sidebar-links"');
  return html.slice(start, html.indexOf("</nav>", start));
}
function detailsOf(sidebar: string, title: string): string | undefined {
  return sidebar.match(
    new RegExp(`<details([^>]*)><summary[^>]*>${title}</summary>`),
  )?.[1];
}

Deno.test("a sidebar label is the entry's label or else the page's h1", () => {
  assertEquals(sidebars.moonwell, {
    label: "moonwell",
    groups: [
      {
        title: "Guide",
        items: [
          { label: "Overview", url: "/moonwell/" },
          { label: "Installation", url: "/moonwell/install" },
        ],
      },
      {
        title: "Reference",
        items: [{ label: "Commands", url: "/moonwell/reference/commands" }],
      },
      {
        title: "Internals",
        items: [{
          label: "Files and caches",
          url: "/moonwell/reference/files",
        }],
      },
    ],
  });
  assertEquals(sidebarItems(sidebars.moonwell!).map((item) => item.url), [
    "/moonwell/",
    "/moonwell/install",
    "/moonwell/reference/commands",
    "/moonwell/reference/files",
  ]);
});

Deno.test("the first group and the current page's group are open, the others closed", async () => {
  const sidebar = sidebarOf(await get("/moonwell/reference/files"));
  for (const title of ["Guide", "Reference", "Internals"]) {
    assertNotEquals(detailsOf(sidebar, title), undefined);
  }
  assertEquals(/\bopen\b/.test(detailsOf(sidebar, "Guide") ?? ""), true);
  assertEquals(/\bopen\b/.test(detailsOf(sidebar, "Internals") ?? ""), true);
  assertEquals(/\bopen\b/.test(detailsOf(sidebar, "Reference") ?? "x"), false);
  assertStringIncludes(
    sidebar,
    'href="/moonwell/reference/files" aria-current="page"',
  );
  const overview = sidebarOf(await get("/moonwell/"));
  for (const title of ["Guide", "Reference", "Internals"]) {
    assertNotEquals(detailsOf(overview, title), undefined);
  }
  assertEquals(/\bopen\b/.test(detailsOf(overview, "Guide") ?? ""), true);
  assertEquals(/\bopen\b/.test(detailsOf(overview, "Internals") ?? "x"), false);
});

Deno.test("a group without a title is a flat list with no details element", async () => {
  const sidebar = sidebarOf(await get("/wrappers/"));
  assertEquals(sidebar.includes("<details"), false);
  assertStringIncludes(sidebar, 'href="/wrappers/" aria-current="page"');
  assertEquals(sidebar.includes('href="/moonwell/"'), false);
});

Deno.test("previous and next follow the groups in order within the section", async () => {
  const html = await get("/moonwell/install");
  const pager = html.slice(html.indexOf('class="doc-pager"'));
  assertStringIncludes(pager, 'rel="prev" href="/moonwell/"');
  assertStringIncludes(pager, "<strong>Overview</strong>");
  assertStringIncludes(pager, 'rel="next" href="/moonwell/reference/commands"');
  assertStringIncludes(pager, "<strong>Commands</strong>");
  const last = await get("/moonwell/reference/files");
  assertEquals(last.includes('rel="next"'), false);
});

Deno.test("the menu island is given the sidebar, the address and h2/h3 headings only", () => {
  const page = pages.find((p) => p.url === "/moonwell/")!;
  const props = docMenuProps(page, sidebars.moonwell!);
  assertEquals(Object.keys(props).sort(), ["current", "headings", "sidebar"]);
  assertEquals(props.current, "/moonwell/");
  assertEquals(props.headings, [
    { id: "start", text: "Start", level: 2 },
    { id: "deeper", text: "Deeper", level: 3 },
  ]);
  const sent = JSON.stringify(props);
  assertEquals(sent.includes(marker), false);
  assertEquals(sent.includes("<h1"), false);
});

/** The first vnode of a type in a tree that was built and not rendered: through `props.children`, arrays included. */
function findVNode(
  node: unknown,
  type: unknown,
): VNode<Record<string, unknown>> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findVNode(child, type);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  if (node.type === type) return node as VNode<Record<string, unknown>>;
  return findVNode((node.props as { children?: unknown }).children, type);
}

// A handler test cannot see what an island is given: only a built app serialises an island's properties.
Deno.test("the page hands the menu island the sidebar, the address and the headings, and no page's text", () => {
  const page = pages.find((p) => p.url === "/moonwell/")!;
  const menu = findVNode(
    DocPage({ page, sidebar: sidebars.moonwell! }),
    DocMenu,
  );
  assertNotEquals(menu, undefined);
  assertEquals(Object.keys(menu!.props).sort(), [
    "current",
    "headings",
    "sidebar",
  ]);
  const sent = JSON.stringify(menu!.props);
  // The page's HTML as JSON writes it: its quotes are escaped there.
  assertEquals(sent.includes(JSON.stringify(page.html).slice(1, -1)), false);
  assertEquals(sent.includes(marker), false);
});

for (
  const [name, groups, message] of [
    ["a source in two groups", [
      { title: "A", pages: ["moonwell/index.md"] },
      { title: "B", pages: ["moonwell/index.md"] },
    ], "duplicate navigation source"],
    ["a section with no page", [{ title: "A", pages: [] }], "has no page"],
  ] as const
) {
  Deno.test(`rejects ${name}`, async () => {
    const error = await assertRejects(() =>
      compileDocumentation(
        new Map([["moonwell/index.md", "# Moonwell\n"]]),
        [{ id: "moonwell", label: "moonwell", groups }],
        new Set(),
      )
    );
    assertInstanceOf(error, Error);
    assertStringIncludes(error.message, message);
  });
}
