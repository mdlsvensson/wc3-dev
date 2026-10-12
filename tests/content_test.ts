import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import type { NavSection } from "../shared/types.ts";
import {
  compileDocumentation,
  compileLandingPage,
} from "../tools/content/compile.ts";
import { resolveContentLink } from "../tools/content/links.ts";
import { flatSection } from "./support/site.ts";

const sections: readonly NavSection[] = [
  flatSection("moonwell", ["moonwell/index.md"]),
];
const simple = new Map([[
  "moonwell/index.md",
  "# Moonwell\n\n## A *heading*\n\n## A heading\n\n## Ångström\n",
]]);

Deno.test("heading IDs are stable and duplicates are distinct", async () => {
  const [page] = await compileDocumentation(simple, sections, new Set());
  assertEquals(page.url, "/moonwell/");
  assertEquals(page.title, "Moonwell");
  assertEquals(page.section, "moonwell");
  assertEquals(page.headings.map((h) => h.id), [
    "moonwell",
    "a-heading",
    "a-heading-1",
    "ångström",
  ]);
  assertStringIncludes(page.html, 'id="a-heading-1"');
  assertEquals(
    resolveContentLink(page.source, "#a-heading-1", [page], new Set()),
    "#a-heading-1",
  );
});

Deno.test("fixture renders Markdown, escaped HTML and searchable code without network", async () => {
  const fixture = await Deno.readTextFile(
    new URL("./fixtures/markdown.md", import.meta.url),
  );
  const sources = new Map([["moonwell/index.md", fixture], [
    "moonwell/getting-started.md",
    "# Start\n",
  ]]);
  const nav: readonly NavSection[] = [
    flatSection("moonwell", [...sources.keys()]),
  ];
  const [page] = await compileDocumentation(sources, nav, new Set(["/mw.gif"]));
  for (
    const html of [
      "<table>",
      "<ul>",
      "<code>value</code>",
      'src="/mw.gif"',
      'href="/moonwell/getting-started?from=fixture#start"',
      'id="code-value"',
      'id="details"',
      "&lt;script&gt;",
      "&lt;img",
      "&gt;",
      'class="shiki github-dark"',
    ]
  ) {
    assertStringIncludes(page.html, html);
  }
  assertEquals(page.html.includes("<script>"), false);
  assertEquals(page.html.includes("<img src=x"), false);
  for (
    const text of [
      "A heading",
      "Name Value",
      "First item",
      "<img src=x onerror=alert(1)>",
      "local value",
    ]
  ) {
    assertStringIncludes(page.text, text);
  }
  assertEquals(
    page.links.find((link) => link.target === "/mw.gif")?.image,
    true,
  );
});

for (
  const target of [
    "missing.md",
    "#absent",
    "/missing.png",
    "/missing/",
    "https://docs.wc3.dev/missing",
    "https://wc3.dev/unrelated",
    "javascript:alert(1)",
    "data:text/html,hello",
  ]
) {
  Deno.test(`rejects missing or unsafe target ${target}`, async () => {
    const bad = new Map([[
      "moonwell/index.md",
      `# Moonwell\n\n[link](${target})\n`,
    ]]);
    const error = await assertRejects(() =>
      compileDocumentation(bad, sections, new Set())
    );
    assertInstanceOf(error, Error);
    assertStringIncludes(error.message, "moonwell/index.md");
    assertStringIncludes(error.message, target);
  });
}

Deno.test("rejects a missing image with source and target", async () => {
  const error = await assertRejects(() =>
    compileDocumentation(
      new Map([[
        "moonwell/index.md",
        "# Moonwell\n\n![image](./missing.png)\n",
      ]]),
      sections,
      new Set(),
    )
  );
  assertInstanceOf(error, Error);
  assertStringIncludes(error.message, "moonwell/index.md");
  assertStringIncludes(error.message, "./missing.png");
});

for (const markdown of ["No title", "# First\n\n# Second\n"]) {
  Deno.test(`rejects invalid level-one heading count: ${markdown.split("\n")[0]}`, async () => {
    const error = await assertRejects(() =>
      compileDocumentation(
        new Map([["moonwell/index.md", markdown]]),
        sections,
        new Set(),
      )
    );
    assertInstanceOf(error, Error);
    assertStringIncludes(error.message, "moonwell/index.md");
    assertStringIncludes(error.message, "h1");
  });
}

for (
  const [name, sources, nav, target] of [
    [
      "omitted source",
      new Map([...simple, ["moonwell/other.md", "# Other"]]),
      sections,
      "moonwell/other.md",
    ],
    ["duplicate nav source", simple, [
      flatSection("moonwell", ["moonwell/index.md", "moonwell/index.md"]),
    ], "moonwell/index.md"],
    ["missing nav source", simple, [
      flatSection("moonwell", ["moonwell/index.md", "moonwell/absent.md"]),
    ], "moonwell/absent.md"],
    [
      "duplicate canonical URL",
      new Map([["moonwell.md", "# One"], ["moonwell/index.md", "# Two"]]),
      [flatSection("moonwell", ["moonwell.md", "moonwell/index.md"])],
      "moonwell/index.md",
    ],
  ] as const
) {
  Deno.test(`rejects ${name}`, async () => {
    const error = await assertRejects(() =>
      compileDocumentation(sources, nav, new Set())
    );
    assertInstanceOf(error, Error);
    assertStringIncludes(error.message, target);
  });
}

Deno.test("links resolve against complete page records preserving queries and fragments", async () => {
  const sources = new Map([["moonwell/index.md", "# Moonwell\n"], [
    "moonwell/getting-started.md",
    "# Start\n\n## Install\n",
  ]]);
  const nav: readonly NavSection[] = [
    flatSection("moonwell", [...sources.keys()]),
  ];
  const pages = await compileDocumentation(sources, nav, new Set(["/mw.gif"]));
  for (
    const [target, expected] of [
      [
        "./getting-started.md?q=1#install",
        "/moonwell/getting-started?q=1#install",
      ],
      [
        "./getting-started?q=1#install",
        "/moonwell/getting-started?q=1#install",
      ],
      ["/moonwell", "/moonwell/"],
      ["/moonwell/", "/moonwell/"],
      ["../moonwell/index.md", "/moonwell/"],
      [
        "https://docs.wc3.dev/moonwell/getting-started.html?q=1#install",
        "/moonwell/getting-started?q=1#install",
      ],
      [
        "https://wc3.dev/moonwell/getting-started?q=1#install",
        "/moonwell/getting-started?q=1#install",
      ],
      ["https://www.wc3.dev/moonwell?x=1#moonwell", "/moonwell/?x=1#moonwell"],
      ["/mw.gif?v=1", "/mw.gif?v=1"],
      ["/", "/"],
      ["https://example.org/a?x=1#part", "https://example.org/a?x=1#part"],
      ["mailto:hello@example.org", "mailto:hello@example.org"],
    ]
  ) {
    assertEquals(
      resolveContentLink(
        "moonwell/index.md",
        target,
        pages,
        new Set(["/mw.gif"]),
      ),
      expected,
    );
  }
});

for (const origin of ["https://wc3.dev", "https://www.wc3.dev"]) {
  Deno.test(`compiler accepts actual home targets at ${origin}`, async () => {
    const targets = [
      `${origin}/?from=docs%2Fhome`,
      `${origin}/?from=docs%2Fhome#main-content`,
      `${origin}/mw.gif?v=1#frame`,
      `${origin}/fonts/Jersey10-Regular.woff2?v=2`,
    ];
    const [page] = await compileDocumentation(
      new Map([[
        "moonwell/index.md",
        `# Moonwell\n\n${
          targets.map((target) => `[Home](${target})`).join("\n")
        }\n` +
        `\n![Moonwell](${origin}/mw.gif?v=1#frame)\n`,
      ]]),
      sections,
      new Set(["/mw.gif", "/fonts/Jersey10-Regular.woff2"]),
    );
    for (const target of targets) {
      assertStringIncludes(page.html, `href="${target}"`);
      assertEquals(page.links.some((link) => link.target === target), true);
    }
    assertStringIncludes(page.html, `src="${origin}/mw.gif?v=1#frame"`);
  });
}

Deno.test("compiler preserves the actual docs landing fragment", async () => {
  const [page] = await compileDocumentation(
    new Map([[
      "moonwell/index.md",
      "# Moonwell\n\n[Landing](https://docs.wc3.dev/?q=1#main-content)\n",
    ]]),
    sections,
    new Set(),
  );
  assertStringIncludes(page.html, 'href="/?q=1#main-content"');
});

Deno.test("compiler canonicalizes known overview aliases before checking fragments", async () => {
  const nav: readonly NavSection[] = ["moonwell", "wrappers", "systems"].map(
    (id) => flatSection(id as NavSection["id"], [`${id}/index.md`]),
  );
  const targets: [string, string][] = [];
  for (const section of nav) {
    for (const alias of ["index", "index.html"]) {
      for (
        const prefix of [
          "../",
          "",
          "/",
          "https://docs.wc3.dev/",
          "https://wc3.dev/",
          "https://www.wc3.dev/",
        ]
      ) {
        targets.push([
          `${prefix}${section.id}/${alias}?from=docs%2Falias#details`,
          `/${section.id}/?from=docs%2Falias#details`,
        ]);
      }
    }
  }
  targets.push([
    "./index.html?from=local#details",
    "/moonwell/?from=local#details",
  ]);
  const sources = new Map(nav.map((section) => [
    `${section.id}/index.md`,
    `# ${section.label}\n\n## Details\n` +
    (section.id === "moonwell"
      ? targets.map(([target]) => `\n[Overview](${target})`).join("")
      : ""),
  ]));
  const [page] = await compileDocumentation(sources, nav, new Set());
  for (const [target] of targets) {
    assertEquals(page.links.some((link) => link.target === target), true);
  }
  assertEquals(
    [...page.html.matchAll(/<a href="([^"]*)"/g)].map((match) => match[1]),
    targets.map(([, expected]) => expected),
  );
});

Deno.test("compiler still rejects missing home targets and invalid overview fragments", async () => {
  for (
    const target of [
      "https://wc3.dev/missing",
      "https://www.wc3.dev/missing",
      "https://wc3.dev/missing.gif",
      "https://www.wc3.dev/fonts/missing.woff2",
      "https://wc3.dev/?q=1#absent",
      "https://www.wc3.dev/?q=1#absent",
      "https://docs.wc3.dev/?q=1#absent",
      "https://wc3.dev/?q=1#%FF",
      "https://docs.wc3.dev/moonwell/index.html?q=1#absent",
      "https://wc3.dev/moonwell/index?q=1#absent",
      "https://www.wc3.dev/moonwell/index.html?q=1#absent",
      "https://docs.wc3.dev/moonwell/index.html?q=1#%FF",
      "./index#absent",
      "/unknown/index",
      "/unknown/index.html",
      "/moonwell/missing/index.html",
      "https://docs.wc3.dev/unknown/index.html",
      "https://wc3.dev/moonwell/missing/index",
      "https://www.wc3.dev/unknown/index",
    ]
  ) {
    const error = await assertRejects(() =>
      compileDocumentation(
        new Map([[
          "moonwell/index.md",
          `# Moonwell\n\n[Missing](${target})\n`,
        ]]),
        sections,
        new Set(["/mw.gif"]),
      )
    );
    assertInstanceOf(error, Error);
    assertStringIncludes(error.message, "moonwell/index.md");
    assertStringIncludes(error.message, target);
    if (target.includes("#absent")) {
      assertStringIncludes(error.message, "fragment");
    } else if (target.includes("#%FF")) {
      assertStringIncludes(error.message, "invalid fragment encoding");
    }
  }
});

Deno.test("heading slugs never collide with authored numeric suffixes", async () => {
  const [page] = await compileDocumentation(
    new Map([["moonwell/index.md", "# Moonwell\n\n## A\n\n## A\n\n## A-1\n"]]),
    sections,
    new Set(),
  );
  assertEquals(page.headings.map((h) => h.id), [
    "moonwell",
    "a",
    "a-1",
    "a-1-1",
  ]);
});

Deno.test("clean section links fall back to canonical site paths after source-relative resolution", async () => {
  const sources = new Map([[
    "moonwell/index.md",
    "# Moonwell\n\n[Wrappers](wrappers/)\n",
  ], ["wrappers/index.md", "# Wrappers\n"]]);
  const nav: readonly NavSection[] = [
    sections[0],
    flatSection("wrappers", ["wrappers/index.md"]),
  ];
  const pages = await compileDocumentation(sources, nav, new Set());
  assertStringIncludes(pages[0].html, 'href="/wrappers/"');
});

Deno.test("landing record prepares shared searchable copy and validates its links", async () => {
  const sources = new Map([["moonwell/index.md", "# Moonwell"], [
    "wrappers/index.md",
    "# Wrappers",
  ], ["systems/index.md", "# Systems"]]);
  const nav: readonly NavSection[] = [
    sections[0],
    flatSection("wrappers", ["wrappers/index.md"]),
    flatSection("systems", ["systems/index.md"]),
  ];
  const pages = await compileDocumentation(sources, nav, new Set());
  const assets = new Set(["/mw.gif", "/mw-moonwell.png", "/mw-text-edit.png"]);
  const landing = compileLandingPage(pages, assets);
  assertEquals([landing.source, landing.url, landing.title, landing.section], [
    "landing",
    "/",
    "Moonwell",
    null,
  ]);
  assertStringIncludes(
    landing.text,
    "Multilingual modding framework for Warcraft III: Reforged",
  );
  assertStringIncludes(landing.text, "damage engine, physics, save/load");
  const error = assertThrows(() =>
    compileLandingPage(pages.slice(0, 1), assets)
  );
  assertInstanceOf(error, Error);
  assertStringIncludes(error.message, "landing");
  assertStringIncludes(error.message, "/wrappers/");
});
