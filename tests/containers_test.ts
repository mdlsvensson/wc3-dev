import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { buildSearchPayload } from "../docs/search/index.ts";
import { compileDocumentation } from "../tools/content/compile.ts";
import { checkContainers } from "../tools/content/containers.ts";
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

Deno.test("a note and a warning render as asides with a default or a written title", async () => {
  const [page] = await compile(
    "::: note Measured on 3.0.0.24268\nA *removed* unit.\n:::\n\n::: warning\nIt desyncs.\n:::\n",
  );
  assertStringIncludes(
    page.html,
    '<aside class="callout callout-note"><p class="callout-title">Measured on 3.0.0.24268</p>',
  );
  assertStringIncludes(page.html, "<em>removed</em>");
  assertStringIncludes(
    page.html,
    '<aside class="callout callout-warning"><p class="callout-title">Warning</p>',
  );
  assertStringIncludes(page.text, "It desyncs.");
});

Deno.test("a title is escaped", async () => {
  const [page] = await compile("::: note <b>x</b>\nText.\n:::\n");
  assertStringIncludes(page.html, "&lt;b&gt;x&lt;/b&gt;");
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
      "a code group holds code blocks only",
    ],
    [
      "a group with a language twice",
      "::: code-group\n```lua\n1\n```\n```lua\n2\n```\n:::\n",
      "lua is twice in one code group",
    ],
  ] as const
) {
  Deno.test(`rejects ${name}`, async () => {
    const error = await assertRejects(() => compile(markdown));
    assertInstanceOf(error, Error);
    assertStringIncludes(error.message, "moonwell/index.md:");
    assertStringIncludes(error.message, message);
  });
}

Deno.test("block markers inside a code block are text, with either line end", () => {
  const shown = [
    "# Syntax",
    "",
    "````md",
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
  for (const end of ["\n", "\r\n"]) checkContainers("a.md", shown.join(end));
  const error = assertThrows(() =>
    checkContainers("a.md", ["::: note", "Text.", ""].join("\r\n"))
  );
  assertInstanceOf(error, Error);
  assertStringIncludes(error.message, "a.md:1: block note is not closed");
});
