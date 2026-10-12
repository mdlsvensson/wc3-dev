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
import {
  searchTerms,
  searchWords,
  segmentParts,
  wordSegments,
} from "../docs/search/terms.ts";
import { resultLimit, resultStatus } from "../docs/search/limit.ts";
import type { SearchEngine } from "../docs/search/types.ts";
import type { CompiledPage } from "../shared/types.ts";
import { createDocsApp } from "../docs/app.tsx";
import {
  compileDocumentation,
  compileLandingPage,
} from "../tools/content/compile.ts";
import { flatSection, loadSampleSite, staticAssets } from "./support/site.ts";

function page(
  title: string,
  text: string,
  extra: Partial<CompiledPage> = {},
): CompiledPage {
  return {
    source: `${title}.md`,
    url: `/${title}/`,
    title,
    description: "",
    text,
    html: `<h1 id="${title}">${title}</h1><p>${text}</p>`,
    section: "moonwell",
    headings: [{ id: title, text: title, level: 1 }],
    links: [],
    code: [],
    ...extra,
  };
}

Deno.test("serialized search covers the landing page and every sample page, with prefix and typo queries", async () => {
  const { pages } = await loadSampleSite();
  const landing = compileLandingPage(pages, await staticAssets());
  const payload = buildSearchPayload([landing, ...pages]);
  const urls = new Set(payload.entries.map((entry) => entry.url));
  for (const page of [landing, ...pages]) {
    assertEquals(urls.has(page.url), true, page.url);
  }
  const engine = createSearchEngine(JSON.parse(JSON.stringify(payload)));
  for (const query of ["installation", "install", "instalation"]) {
    assertEquals(
      engine.search(query).some((entry) =>
        entry.url === "/moonwell/installation"
      ),
      true,
      query,
    );
  }
  assertEquals(
    engine.search("issueTargetOrder").some((entry) =>
      entry.url === "/wrappers/reference/unit#issuetargetorder"
    ),
    true,
  );
  // Static files such as the fonts and their licences are not documentation.
  for (const entry of payload.entries) {
    for (const name of ["fonts", "README", "LICENSE"]) {
      assertEquals(entry.url.includes(name), false, entry.url);
      assertEquals(entry.id.includes(name), false, entry.id);
    }
  }
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
    [flatSection("moonwell", ["moonwell/index.md"])],
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
    [flatSection("moonwell", ["moonwell/index.md"])],
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

Deno.test("a word is a term whole and by its parts", () => {
  assertEquals(searchTerms("Unit.issueTargetOrder(target)"), [
    "Unit.issueTargetOrder",
    "Unit",
    "issueTargetOrder",
    "issue",
    "Target",
    "Order",
    "target",
  ]);
  assertEquals(searchTerms("moonwell_library v2beta"), [
    "moonwell_library",
    "moonwell",
    "library",
    "v2beta",
    "beta",
  ]);
  assertEquals(searchTerms("EVENT_PLAYER_UNIT_DEATH"), [
    "EVENT_PLAYER_UNIT_DEATH",
    "EVENT",
    "PLAYER",
    "UNIT",
    "DEATH",
  ]);
  assertEquals(searchTerms("End of a sentence. Next one."), [
    "End",
    "of",
    "a",
    "sentence",
    "Next",
    "one",
  ]);
  assertEquals(searchTerms("local u=Unit.create(x+1)"), [
    "local",
    "u",
    "Unit.create",
    "Unit",
    "create",
    "x",
    "1",
  ]);
  assertEquals(searchTerms("moonwell.toml and v0.12.2"), [
    "moonwell.toml",
    "moonwell",
    "toml",
    "and",
    "v0.12.2",
    "v0",
    "12",
  ]);
  assertEquals(searchTerms("issueTargetOrder"), [
    "issueTargetOrder",
    "issue",
    "Target",
    "Order",
  ]);
  assertEquals(searchTerms("... :: --"), []);
});

Deno.test("a word has segments at dots and underscores, and parts at case and digits", () => {
  assertEquals(wordSegments("Unit.getLife"), ["Unit", "getLife"]);
  assertEquals(wordSegments("getLife"), ["getLife"]);
  assertEquals(segmentParts("getLife"), ["get", "Life"]);
  assertEquals(segmentParts("issueT"), ["issue"]);
  assertEquals(segmentParts("Unit"), []);
  assertEquals(searchWords("a_b. .c x.y."), ["a_b", "c", "x.y"]);
});

async function sampleEngine() {
  const { pages } = await loadSampleSite();
  const landing = compileLandingPage(pages, await staticAssets());
  return createSearchEngine(
    JSON.parse(JSON.stringify(buildSearchPayload([landing, ...pages]))),
  );
}

Deno.test("a name cut short finds what its whole part finds and no more", async () => {
  const engine = await sampleEngine();
  const issue = engine.search("issue").map((entry) => entry.url).sort();
  const cut = engine.search("issueT").map((entry) => entry.url).sort();
  assertEquals(cut, issue);
  assertEquals(cut.length < 10, true);
  assertEquals(
    cut.filter((url) => url.startsWith("/wrappers/reference/unit#issue"))
      .length >= 2,
    true,
  );
});

Deno.test("a name finds its section first and few others", async () => {
  const engine = await sampleEngine();
  for (const query of ["getLife", "Unit.getLife"]) {
    const results = engine.search(query);
    assertEquals(
      results[0].url,
      "/wrappers/reference/unit#getlife",
      query,
    );
    assertEquals(results.length < 10, true, `${query}: ${results.length}`);
  }
});

Deno.test("the title of a page finds the page before its sections", async () => {
  const engine = await sampleEngine();
  for (const query of ["unit", "wrappers.unit"]) {
    assertEquals(
      engine.search(query)[0].url,
      "/wrappers/reference/unit",
      query,
    );
  }
});

Deno.test("words of a name find it from the sample, with a dot or run together", async () => {
  const engine = await sampleEngine();
  const target = "/wrappers/reference/unit#issuetargetorder";
  assertEquals(
    engine.search("target order").some((entry) => entry.url === target),
    true,
  );
  const together = engine.search("TargetOrder").map((entry) => entry.url);
  assertEquals(together[0], target);
  assertEquals(
    engine.search("map.folder").some((entry) =>
      entry.url.startsWith("/moonwell/first-map")
    ),
    true,
  );
});

Deno.test("a name that no page mentions gives no results", () => {
  const engine = createSearchEngine(
    buildSearchPayload([page("Guide", "Some words about maps.")]),
  );
  for (const query of ["getL", "issueT", "Unit.getLife", "Math.lerp"]) {
    assertEquals(engine.search(query), [], query);
  }
});

Deno.test("a whole name decides over names that share its parts", () => {
  const engine = createSearchEngine(
    buildSearchPayload([
      page("Events", "", {
        html: '<h1 id="events">Events</h1>' +
          '<h3 id="death">EVENT_PLAYER_UNIT_DEATH</h3><p>A unit died.</p>' +
          '<h3 id="attacked">EVENT_PLAYER_UNIT_ATTACKED</h3>' +
          "<p>A player&#39;s unit event, not a death.</p>",
        headings: [
          { id: "events", text: "Events", level: 1 },
          { id: "death", text: "EVENT_PLAYER_UNIT_DEATH", level: 3 },
          { id: "attacked", text: "EVENT_PLAYER_UNIT_ATTACKED", level: 3 },
        ],
      }),
    ]),
  );
  assertEquals(
    engine.search("EVENT_PLAYER_UNIT_DEATH")[0].url,
    "/Events/#death",
  );
});

Deno.test("parts of a function name find it, and the whole name ranks first", () => {
  const payload = buildSearchPayload([
    page("Unit", "", {
      html:
        '<h1 id="unit">Unit</h1><h3 id="issueorder">issueOrder</h3><p>Gives an order.</p>' +
        '<h3 id="issuetargetorder">issueTargetOrder</h3><p>Gives an order with a target.</p>',
      headings: [
        { id: "unit", text: "Unit", level: 1 },
        { id: "issueorder", text: "issueOrder", level: 3 },
        { id: "issuetargetorder", text: "issueTargetOrder", level: 3 },
      ],
    }),
  ]);
  const engine = createSearchEngine(JSON.parse(JSON.stringify(payload)));
  assertEquals(
    engine.search("issueTargetOrder")[0].url,
    "/Unit/#issuetargetorder",
  );
  for (const query of ["target order", "TargetOrder"]) {
    assertEquals(
      engine.search(query).some((entry) =>
        entry.url === "/Unit/#issuetargetorder"
      ),
      true,
      query,
    );
  }
});

Deno.test("the shipped entries hold what the dialog draws and no full text", () => {
  const payload = buildSearchPayload([
    page("Guide", "", {
      html:
        '<h1 id="guide">Guide</h1><p>Opening words.</p><h2 id="setup">Setup</h2><p>Hidden treasure.</p>',
      headings: [
        { id: "guide", text: "Guide", level: 1 },
        { id: "setup", text: "Setup", level: 2 },
      ],
    }),
  ]);
  for (const entry of payload.entries) {
    assertEquals(Object.keys(entry).sort(), [
      "excerpt",
      "heading",
      "id",
      "title",
      "url",
    ]);
  }
  assertEquals(payload.entries[0].excerpt, "Opening words.");
  const engine = createSearchEngine(payload);
  // Text under a heading is indexed in that heading's entry only.
  assertEquals(engine.search("treasure").map((entry) => entry.url), [
    "/Guide/#setup",
  ]);
  assertEquals(engine.search("opening").map((entry) => entry.url), [
    "/Guide/",
  ]);
});

Deno.test("a query with no word in it has no results and does not throw", () => {
  const engine = createSearchEngine(
    buildSearchPayload([page("Guide", "words")]),
  );
  for (const query of ["...", "::", " - ", ""]) {
    assertEquals(engine.search(query), []);
  }
});

Deno.test("the status line counts every match and names the limit", () => {
  assertEquals(resultLimit, 20);
  assertEquals(resultStatus(1), "1 result");
  assertEquals(resultStatus(20), "20 results");
  assertEquals(resultStatus(21), "20 of 21 results");
  assertEquals(resultStatus(143), "20 of 143 results");
});

function moduleEngine(
  title: string,
  sections: readonly (readonly [string, string])[],
) {
  const slug = (name: string) => name.toLowerCase().replace(/\W+/g, "");
  return createSearchEngine(
    buildSearchPayload([
      page(title, "", {
        html: `<h1 id="top">${title}</h1>` +
          sections.map(([name, text]) =>
            `<h3 id="${slug(name)}">${name}</h3><p>${text}</p>`
          ).join(""),
        headings: [
          { id: "top", text: title, level: 1 },
          ...sections.map(([name]) => ({
            id: slug(name),
            text: name,
            level: 3,
          })),
        ],
      }),
    ]),
  );
}

Deno.test("a qualified name finds a section that does not say its page's name", () => {
  const math = moduleEngine("wrappers.math", [
    ["lerp", "Interpolates between two numbers."],
    ["clamp", "Keeps a number in a range."],
    ["angleBetween", "The angle from one point to another."],
  ]);
  const base = "/wrappers.math/";
  assertEquals(math.search("Math.lerp")[0].url, `${base}#lerp`);
  assertEquals(
    math.search("Math.angleBetween")[0].url,
    `${base}#anglebetween`,
  );
  assertEquals(math.search("wrappers.math.lerp")[0].url, `${base}#lerp`);
  assertEquals(math.search("math")[0].url, base);
  assertEquals(math.search("lerp")[0].url, `${base}#lerp`);
  const unit = moduleEngine("wrappers.unit", [[
    "kill",
    "Removes it from play.",
  ]]);
  for (const query of ["Unit.kill", "unit.kill"]) {
    assertEquals(unit.search(query)[0].url, "/wrappers.unit/#kill", query);
  }
});

Deno.test("a qualified heading is found by its bare name and by its qualified name", () => {
  const engine = moduleEngine("Reference", [[
    "Unit.getLife",
    "Returns the life.",
  ]]);
  for (
    const query of [
      "getLife",
      "getlife",
      "Unit.getLife",
      "unit.getlife",
      "get life",
    ]
  ) {
    assertEquals(
      engine.search(query)[0].url,
      "/Reference/#unitgetlife",
      query,
    );
  }
});

Deno.test("the sample ranks a page by its title and a function by its name", async () => {
  const engine = await sampleEngine();
  for (const query of ["unit", "wrappers.unit"]) {
    assertEquals(
      engine.search(query)[0].url,
      "/wrappers/reference/unit",
      query,
    );
  }
  assertEquals(
    engine.search("installation")[0].url,
    "/moonwell/installation",
  );
  assertEquals(
    engine.search("TargetOrder")[0].url,
    "/wrappers/reference/unit#issuetargetorder",
  );
  for (const query of ["getLife", "Unit.getLife"]) {
    const results = engine.search(query);
    assertEquals(results[0].url, "/wrappers/reference/unit#getlife", query);
    assertEquals(results.length < 10, true, query);
  }
});
