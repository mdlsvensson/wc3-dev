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
    new Map([["moonwell/index.md", `# Blocks\n\n${markdown}`]]),
    nav,
    new Set(),
  );
const group = [
  "::: code-group",
  "```yue",
  "unit\\kill!",
  "```",
  "```lua",
  "unit:kill()",
  "```",
  ":::",
  "",
].join("\n");

Deno.test("a code group renders a tab per fence and a block per fence, with no text of its own", async () => {
  const [page] = await compile(`## Example\n\n${group}`);
  assertStringIncludes(
    page.html,
    '<div class="code-tabs" role="tablist" aria-label="Code language">',
  );
  assertStringIncludes(
    page.html,
    '<button type="button" role="tab" class="code-tab" data-lang="yue" aria-label="YueScript"></button>',
  );
  assertEquals(
    page.html.indexOf('class="code-block" data-lang="yue"') <
      page.html.indexOf('class="code-block" data-lang="lua"'),
    true,
  );
  assertEquals(page.code.map((block) => [block.language, block.group]), [
    ["yue", 0],
    ["lua", 0],
  ]);
  const payload = buildSearchPayload([page]);
  assertEquals(payload.entries[1].excerpt, "unit\\kill! unit:kill()");
});

Deno.test("each group on a page has its own index and a lone fence has none", async () => {
  const [page] = await compile(`${group}\n\`\`\`sh\nls\n\`\`\`\n\n${group}`);
  assertEquals(page.code.map((block) => block.group), [0, 0, null, 1, 1]);
});

Deno.test("a note with no title is labelled by an attribute, not by text", async () => {
  const [page] = await compile("## Sec\n\n::: warning\nIt desyncs.\n:::\n");
  assertStringIncludes(
    page.html,
    '<aside class="callout callout-warning" role="note" aria-label="Warning" data-title="Warning">',
  );
  assertEquals(page.html.includes("callout-title"), false);
  assertEquals(buildSearchPayload([page]).entries[1].excerpt, "It desyncs.");
  assertEquals(page.text.includes("Warning"), false);
  assertStringIncludes(page.text, "It desyncs.");
});

Deno.test("a written title is the author's prose, in the page and in its section", async () => {
  const [page] = await compile(
    "## Sec\n\n::: note Measured on 3.0.0.24268\nA *removed* unit.\n:::\n",
  );
  assertStringIncludes(
    page.html,
    '<aside class="callout callout-note" role="note" aria-label="Note"><p class="callout-title">Measured on 3.0.0.24268</p>',
  );
  assertEquals(page.html.includes("data-title"), false);
  assertStringIncludes(page.html, "<em>removed</em>");
  assertStringIncludes(page.text, "Measured on 3.0.0.24268");
  const excerpt = buildSearchPayload([page]).entries[1].excerpt;
  assertEquals(excerpt.startsWith("Measured on 3.0.0.24268"), true);
});

Deno.test("a callout tells its kind, with a written title and without one", async () => {
  const [page] = await compile(
    "::: warning Desyncs\nText.\n:::\n\n::: note\nText.\n:::\n",
  );
  assertStringIncludes(
    page.html,
    '<aside class="callout callout-warning" role="note" aria-label="Warning"><p class="callout-title">Desyncs</p>',
  );
  assertStringIncludes(
    page.html,
    '<aside class="callout callout-note" role="note" aria-label="Note" data-title="Note">',
  );
  assertEquals(page.html.split("data-title").length - 1, 1);
  assertEquals(page.html.split("callout-title").length - 1, 1);
});

Deno.test("the default title is drawn from data-title, which only a callout without a written title has", async () => {
  const css = await Deno.readTextFile(
    new URL("../shared/styles/site.css", import.meta.url),
  );
  assertStringIncludes(
    css,
    ".callout[data-title]::before {\n  content: attr(data-title);",
  );
  // Every callout has aria-label, so a rule that selects it would draw a second title on a titled one.
  assertEquals(/\.callout[\w-]*\[aria-label/.test(css), false);
});

Deno.test("a title is escaped", async () => {
  const [page] = await compile("::: note <b>x</b>\nText.\n:::\n");
  assertStringIncludes(
    page.html,
    '<p class="callout-title">&lt;b&gt;x&lt;/b&gt;</p>',
  );
});

Deno.test("a tab after the name of a block is read as the plugin reads it", async () => {
  const [page] = await compile("::: note\ttitle\nText.\n:::\n");
  assertStringIncludes(
    page.html,
    '<aside class="callout callout-note" role="note" aria-label="Note"><p class="callout-title">title</p>',
  );
});

Deno.test("a block inside a list item is taken", async () => {
  const [page] = await compile("- Item\n\n  ::: note\n  Text.\n  :::\n");
  assertEquals(page.html.split("<aside").length - 1, 1);
});

for (
  const [name, markdown, message] of [
    [
      "an unknown block name",
      "::: tip\nText.\n:::\n",
      "3: unknown block name tip",
    ],
    [
      "a block that is not closed",
      "::: note\nText.\n",
      "3: block note is not closed",
    ],
    [
      "an end without a block",
      "Text.\n\n:::\n",
      "5: block end without a block",
    ],
    [
      "a block inside a block",
      "::: note\n::: warning\nText.\n:::\n:::\n",
      "4: block warning inside block note",
    ],
    [
      "a group with one fence",
      "::: code-group\n```lua\n1\n```\n:::\n",
      "3: a code group needs at least two code blocks",
    ],
    [
      "a group with a paragraph",
      "::: code-group\nText.\n```lua\n1\n```\n```yue\n1\n```\n:::\n",
      "4: a code group holds code blocks only",
    ],
    [
      "a group with a language twice",
      "::: code-group\n```lua\n1\n```\n```lua\n2\n```\n:::\n",
      "7: lua is twice in one code group",
    ],
    [
      "a closer shorter than its opener",
      ":::: note\nText.\n:::\n\n## After\n",
      "3: block note is not closed",
    ],
    [
      "an unknown name in a block quote",
      "> ::: tip\n> Text.\n> :::\n",
      "3: unknown block name tip",
    ],
    [
      "a block in a block quote that is not closed",
      "> ::: note\n> Text.\n",
      "3: block note is not closed",
    ],
    [
      "an unknown name after an inline code span at the start of a line",
      "```code``` is inline.\n\n::: tip\nText.\n:::\n",
      "5: unknown block name tip",
    ],
    [
      "a word after code-group",
      "::: code-group extra\n```lua\n1\n```\n```yue\n1\n```\n:::\n",
      "3: unknown word after code-group: extra",
    ],
  ] as const
) {
  Deno.test(`rejects ${name}`, async () => {
    const error = await assertRejects(() => compile(markdown));
    assertInstanceOf(error, Error);
    assertStringIncludes(error.message, `moonwell/index.md:${message}`);
  });
}

Deno.test("block markers inside a code block are text, with either line end", async () => {
  const shown = [
    "# Syntax",
    "",
    "````text",
    "::: code-group",
    "```lua",
    "1",
    "```",
    ":::",
    "::: tip",
    "````",
    "",
    "::: note",
    "Real.",
    ":::",
    "",
  ];
  for (const end of ["\n", "\r\n"]) {
    const [page] = await compileDocumentation(
      new Map([["moonwell/index.md", shown.join(end)]]),
      nav,
      new Set(),
    );
    assertEquals(page.html.split("<aside").length - 1, 1);
    assertStringIncludes(page.html, "::: tip");
    assertStringIncludes(page.html, "::: code-group");
  }
  const error = await assertRejects(() => compile("::: note\r\nText.\r\n"));
  assertInstanceOf(error, Error);
  assertStringIncludes(
    error.message,
    "moonwell/index.md:3: block note is not closed",
  );
});
