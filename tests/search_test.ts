import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { buildSearchPayload } from "../docs/search/index.ts";
import { createSearchEngine } from "../docs/search/engine.ts";
import { createSearchLoader } from "../docs/search/loader.ts";
import { tabBoundaryTarget } from "../docs/search/focus.ts";
import type { SearchEngine } from "../docs/search/types.ts";
import type { CompiledPage } from "../shared/types.ts";
import { landingPage, pages } from "../docs/generated/pages.ts";
import { createDocsApp } from "../docs/app.tsx";
import { compileDocumentation } from "../tools/content/compile.ts";

function page(
  title: string,
  text: string,
  extra: Partial<CompiledPage> = {},
): CompiledPage {
  return {
    source: `${title}.md`,
    url: `/${title}/`,
    title,
    text,
    html: `<h1 id="${title}">${title}</h1><p>${text}</p>`,
    section: "moonwell",
    headings: [{ id: title, text: title, level: 1 }],
    links: [],
    ...extra,
  };
}

Deno.test("serialized search covers all seven documentation pages and prefix/typo queries", () => {
  const payload = buildSearchPayload([landingPage, ...pages]);
  assertEquals(payload.entries.map((entry) => entry.url), [
    "/",
    "/moonwell/",
    "/moonwell/getting-started",
    "/wrappers/",
    "/wrappers/getting-started",
    "/systems/",
    "/systems/getting-started",
  ]);
  const engine = createSearchEngine(JSON.parse(JSON.stringify(payload)));
  for (const query of ["wrappers", "wrap", "wrapers"]) {
    assertEquals(
      engine.search(query).some((entry) => entry.url === "/wrappers/"),
      true,
      query,
    );
  }
  for (const query of ["Moonwell", "systems"]) {
    assertEquals(engine.search(query).length > 0, true, query);
  }
  assertEquals(engine.search("PixelCode LICENSE README").length, 0);
});

Deno.test("search ranks title and heading matches above body matches", () => {
  const payload = buildSearchPayload([
    page("Body", "installation"),
    page("Installation", "unrelated"),
    page("Guide", "Guide installation details", {
      html:
        '<h1 id="guide">Guide</h1><h2 id="install">installation</h2><p>details</p>',
      headings: [
        { id: "guide", text: "Guide", level: 1 },
        { id: "install", text: "installation", level: 2 },
      ],
    }),
  ]);
  const results = createSearchEngine(payload).search("installation");
  assertEquals(results[0].url, "/Installation/");
  assertEquals(results[1].url, "/Guide/#install");
  assertEquals(results.findIndex((entry) => entry.url === "/Body/") > 1, true);
});

Deno.test("heading results use section excerpts and exclude h1/h4 entries", () => {
  const payload = buildSearchPayload([
    page(
      "Guide",
      "Guide Earlier passage Setup First section Nested Second section Footer",
      {
        html:
          '<h1 id="guide">Guide</h1><p>Earlier passage</p><h2 id="setup">Setup</h2><p>First &amp; section &lt;script&gt;</p><h3 id="nested">Nested</h3><p>Second section</p><h4 id="footer">Footer</h4>',
        headings: [
          { id: "guide", text: "Guide", level: 1 },
          { id: "setup", text: "Setup", level: 2 },
          { id: "nested", text: "Nested", level: 3 },
          { id: "footer", text: "Footer", level: 4 },
        ],
      },
    ),
  ]);
  assertEquals(payload.entries.length, 3);
  assertEquals(payload.entries[1].excerpt, "First & section <script>");
  assertEquals(payload.entries[2].excerpt, "Second section Footer");
  const [match] = createSearchEngine(payload).search("setup");
  assertEquals(match.url, "/Guide/#setup");
  assertStringIncludes(match.excerpt, "<script>");
});

Deno.test("excerpts never split a surrogate pair at the 180 character boundary", () => {
  const payload = buildSearchPayload([
    page("Long", "a".repeat(179) + "😀 ending"),
  ]);
  assertEquals(payload.entries[0].excerpt, "a".repeat(179));
  assertEquals(payload.entries[0].excerpt.length <= 180, true);
});

Deno.test("compiled inline headings and highlighted code retain decoded searchable section text", async () => {
  const compiled = await compileDocumentation(
    new Map([[
      "moonwell/index.md",
      '# Guide\n\nEarlier text\n\n## A *heading* & `value`\n\nEncoded &copy; &amp; &#x1F600; &lt;script&gt;\n\n```lua\nlocal value = "<script>"\n```\n\n### Next\n\nAnother section\n',
    ]]),
    [{ id: "moonwell", label: "moonwell", sources: ["moonwell/index.md"] }],
    new Set(),
  );
  const payload = buildSearchPayload(compiled);
  assertEquals(payload.entries[1].url, "/moonwell/#a-heading-value");
  assertEquals(payload.entries[1].heading, "A heading & value");
  assertEquals(
    payload.entries[1].excerpt,
    'Encoded © & 😀 <script> local value = "<script>"',
  );
  assertEquals(payload.entries[1].excerpt.includes("Earlier"), false);
  assertEquals(payload.entries[1].excerpt.includes("Another"), false);
});

Deno.test("invalid fetched search payloads fail rather than returning a broken engine", () => {
  for (
    const payload of [null, {}, { index: "{}", entries: [] }, {
      index: "{}",
      entries: [{ id: 1 }],
    }]
  ) assertThrows(() => createSearchEngine(payload));
});

Deno.test("heading section text keeps table cells separate for search", async () => {
  const compiled = await compileDocumentation(
    new Map([[
      "moonwell/index.md",
      "# Guide\n\n## Table\n\n| Name | Value |\n| --- | --- |\n| Moonwell | wrappers |\n",
    ]]),
    [{ id: "moonwell", label: "moonwell", sources: ["moonwell/index.md"] }],
    new Set(),
  );
  const payload = buildSearchPayload(compiled);
  assertEquals(payload.entries[1].excerpt, "Name Value Moonwell wrappers");
  assertEquals(
    createSearchEngine(payload).search("wrappers").some((entry) =>
      entry.url === "/moonwell/#table"
    ),
    true,
  );
});

Deno.test("search loads once concurrently and retries a rejected load", async () => {
  let calls = 0;
  const engine: SearchEngine = { search: () => [] };
  const load = createSearchLoader(() => {
    calls++;
    return calls === 1
      ? Promise.reject(new Error("offline"))
      : Promise.resolve(engine);
  });
  await assertRejects(() => load(), Error, "offline");
  const [first, second] = await Promise.all([load(), load()]);
  assertEquals(first, engine);
  assertEquals(second, engine);
  assertEquals(calls, 2);
  assertEquals(await load(), engine);
  assertEquals(calls, 2);
});

Deno.test("concurrent search callers share the same pending promise", async () => {
  let resolve!: (value: SearchEngine) => void;
  const pending = new Promise<SearchEngine>((done) => resolve = done);
  let calls = 0;
  const load = createSearchLoader(() => {
    calls++;
    return pending;
  });
  const first = load();
  const second = load();
  assertEquals(first, second);
  assertEquals(calls, 1);
  const engine: SearchEngine = { search: () => [] };
  resolve(engine);
  assertEquals(await first, engine);
  assertEquals(await load(), engine);
});

Deno.test("docs header serves labelled search alongside its existing mobile navigation", async () => {
  const html = await (await createDocsApp([]).handler()(
    new Request("https://docs.wc3.dev/"),
  )).text();
  assertStringIncludes(html, 'aria-label="Search documentation"');
  assertStringIncludes(html, 'aria-label="Main navigation"');
  assertStringIncludes(html, 'aria-label="Main menu"');
  assertStringIncludes(html, "<dialog");
  assertStringIncludes(html, "<label");
});

Deno.test("documentation search stays beside the brand before the main navigation", async () => {
  const html = await (await createDocsApp([]).handler()(
    new Request("https://docs.wc3.dev/"),
  )).text();
  assertEquals(
    html.indexOf('aria-label="Search documentation"') <
      html.indexOf('aria-label="Main navigation"'),
    true,
  );
});

Deno.test("modal tab boundaries wrap in both directions including focused result options", () => {
  const stops = ["input", "close", "retry"];
  assertEquals(tabBoundaryTarget(stops, "retry", false), "input");
  assertEquals(tabBoundaryTarget(stops, "input", true), "retry");
  assertEquals(tabBoundaryTarget(stops, "close", false), undefined);
  assertEquals(tabBoundaryTarget(stops, "close", true), undefined);
  assertEquals(tabBoundaryTarget(stops, "result-option", false), "input");
  assertEquals(tabBoundaryTarget(stops, "result-option", true), "retry");
  assertEquals(tabBoundaryTarget(stops, null, false), "input");
  assertEquals(tabBoundaryTarget([], null, false), undefined);
});
