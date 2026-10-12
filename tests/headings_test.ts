import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { buildSearchPayload } from "../docs/search/index.ts";
import { compileDocumentation } from "../tools/content/compile.ts";
import { flatSection } from "./support/site.ts";

const nav = [flatSection("moonwell", ["moonwell/index.md"])];
const compile = (markdown: string) =>
  compileDocumentation(
    new Map([["moonwell/index.md", `# Headings\n\n${markdown}`]]),
    nav,
    new Set(),
  );

Deno.test("a hand-written id replaces the made one and its marker is not shown", async () => {
  const [page] = await compile(
    "## Creating a unit {#create}\n\n### `Unit.create(player, typeId)` {#unit.create}\n\n[up](#create)\n",
  );
  assertEquals(page.headings.slice(1), [
    { id: "create", text: "Creating a unit", level: 2 },
    { id: "unit.create", text: "Unit.create(player, typeId)", level: 3 },
  ]);
  assertStringIncludes(page.html, '<h2 id="create">Creating a unit<a');
  assertEquals(page.html.includes("{#"), false);
  assertEquals(page.text.includes("{#"), false);
  assertStringIncludes(page.html, '<a href="#create">up</a>');
});

Deno.test("a made id keeps a dot between two letters or digits and drops every other dot", async () => {
  const [page] = await compile(
    [
      "## The project: `moonwell.toml`",
      "### Unit.create",
      "### Pkl 0.32.1 is pinned.",
      "### e.g. this",
      "### `.luarc.json`",
      "### `Unit.create(player, typeId)`",
    ].join("\n\n") + "\n",
  );
  assertEquals(page.headings.slice(1).map((heading) => heading.id), [
    "the-project-moonwell.toml",
    "unit.create",
    "pkl-0.32.1-is-pinned",
    "e.g-this",
    "luarc.json",
    "unit.createplayer-typeid",
  ]);
  assertStringIncludes(page.html, '<h3 id="unit.create">');
  assertStringIncludes(page.html, 'href="#unit.create"');
});

Deno.test("h2 to h4 link to themselves with a name, h1 does not, and search text has no link text", async () => {
  const [page] = await compile(
    '## One & "two"\n\nFirst.\n\n### Three\n\n#### Four\n\nLast.\n',
  );
  assertStringIncludes(
    page.html,
    '<a class="heading-anchor" href="#one-two" aria-label="Link to One &amp; &quot;two&quot;"></a></h2>',
  );
  assertStringIncludes(
    page.html,
    'href="#three" aria-label="Link to Three"></a></h3>',
  );
  assertStringIncludes(
    page.html,
    'href="#four" aria-label="Link to Four"></a></h4>',
  );
  assertEquals(/<h1[^>]*>[^<]*<a/.test(page.html), false);
  const payload = buildSearchPayload([page]);
  assertEquals(payload.entries[1].heading, 'One & "two"');
  assertEquals(payload.entries[2].excerpt, "Four Last.");
});

for (
  const [name, markdown, message] of [
    [
      "two equal hand-written ids",
      "## A {#x}\n\n## B {#x}\n",
      "5: heading id x is written twice",
    ],
    [
      "a hand-written id equal to a made one",
      "## Setup\n\n## Other {#setup}\n",
      "3: heading id setup is also written by hand",
    ],
    [
      "a made id that is empty",
      "## Fine\n\n### +\n",
      "5: heading has no id: write one as {#id}",
    ],
    [
      "a hand-written id with a space",
      "## A {#a b}\n",
      "3: heading id may hold a-z, 0-9, '.', '_' and '-': a b",
    ],
    ["a heading that is only a marker", "## {#x}\n", "3: heading has no text"],
    [
      "an empty marker",
      "## A {#}\n",
      "3: heading id is empty: write one as {#id}",
    ],
    [
      "a made suffixed id equal to a later hand-written one",
      "## Setup\n\n## Setup\n\n## Other {#setup-1}\n",
      "5: heading id setup-1 is also written by hand",
    ],
    [
      "a made suffixed id equal to an earlier hand-written one",
      "## Other {#setup-1}\n\n## Setup\n\n## Setup\n",
      "7: heading id setup-1 is also written by hand",
    ],
    [
      "a made id equal to an earlier hand-written one",
      "## Other {#setup}\n\n## Setup\n",
      "5: heading id setup is also written by hand",
    ],
    [
      "a marker inside emphasis",
      "## *Foo {#x}*\n",
      "3: heading id marker must end the heading: {#x}",
    ],
    [
      "a marker followed by more text",
      "## Foo {#x} *bar*\n",
      "3: heading id marker must end the heading: {#x}",
    ],
    [
      "two markers",
      "## Foo {#a}{#b}\n",
      "3: heading id marker must end the heading: {#a}",
    ],
    [
      "a made id that the page shell uses",
      "## Fine\n\n## Top\n",
      "5: heading id top is used by the page itself: write another as {#id}",
    ],
    [
      "a hand-written id that the page shell uses",
      "## X {#main-content}\n",
      "3: heading id main-content is used by the page itself: write another as {#id}",
    ],
    [
      "a made id that the search uses",
      "## Search results\n",
      "3: heading id search-results is used by the page itself: write another as {#id}",
    ],
    [
      "a hand-written id of the form the search gives a result",
      "## Results {#search-result-3}\n",
      "3: heading id search-result-3 is used by the page itself: write another as {#id}",
    ],
    [
      "a hand-written id of the form the page script gives a code block",
      "## Code {#code-0-lua}\n",
      "3: heading id code-0-lua is used by the page itself: write another as {#id}",
    ],
    [
      "a made id of the form the page script gives a code block",
      "## Code 0 lua\n",
      "3: heading id code-0-lua is used by the page itself: write another as {#id}",
    ],
    [
      "a hand-written id of the form the page script gives a code block's tab",
      "## X {#code-12-powershell-tab}\n",
      "3: heading id code-12-powershell-tab is used by the page itself: write another as {#id}",
    ],
  ] as const
) {
  Deno.test(`rejects ${name}`, async () => {
    const error = await assertRejects(() => compile(markdown));
    assertInstanceOf(error, Error);
    assertStringIncludes(error.message, `moonwell/index.md:${message}`);
  });
}

Deno.test("an id that only starts like one of the page's own is kept, and a hand-written id is the way out", async () => {
  const [page] = await compile(
    "## Topic\n\n## Codes\n\n## Code 0\n\n## Search result\n\n## Top {#the-top}\n",
  );
  assertEquals(page.headings.slice(1).map((heading) => heading.id), [
    "topic",
    "codes",
    "code-0",
    "search-result",
    "the-top",
  ]);
});

Deno.test("only the ids the page script gives a code block are kept from a heading that starts with code and a number", async () => {
  const [page] = await compile(
    "## Code 404 errors\n\n## Code 0\n\n## Code 0\n\n## Code 1 lua lessons\n",
  );
  assertEquals(page.headings.slice(1).map((heading) => heading.id), [
    "code-404-errors",
    "code-0",
    "code-0-1",
    "code-1-lua-lessons",
  ]);
});

Deno.test("made ids are unchanged: repeats take a suffix and Unicode is kept", async () => {
  const [page] = await compile("## A heading\n\n## A heading\n\n## Ångström\n");
  assertEquals(page.headings.slice(1).map((heading) => heading.id), [
    "a-heading",
    "a-heading-1",
    "ångström",
  ]);
});

Deno.test("a made id steps over other made ids", async () => {
  const [page] = await compile("## Setup\n\n## Setup 1\n\n## Setup\n");
  assertEquals(page.headings.slice(1).map((heading) => heading.id), [
    "setup",
    "setup-1",
    "setup-2",
  ]);
});

Deno.test("a marker inside a code span is shown and the heading gets a made id", async () => {
  const [page] = await compile("## The `{#id}` marker\n");
  assertEquals(page.headings[1], {
    id: "the-id-marker",
    text: "The {#id} marker",
    level: 2,
  });
  assertStringIncludes(page.html, "<code>{#id}</code>");
});
