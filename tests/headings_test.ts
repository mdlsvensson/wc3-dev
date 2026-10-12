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
  ] as const
) {
  Deno.test(`rejects ${name}`, async () => {
    const error = await assertRejects(() => compile(markdown));
    assertInstanceOf(error, Error);
    assertStringIncludes(error.message, `moonwell/index.md:${message}`);
  });
}

Deno.test("made ids are unchanged: repeats take a suffix and Unicode is kept", async () => {
  const [page] = await compile("## A heading\n\n## A heading\n\n## Ångström\n");
  assertEquals(page.headings.slice(1).map((heading) => heading.id), [
    "a-heading",
    "a-heading-1",
    "ångström",
  ]);
});
