import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { codeLanguage, codeLanguages } from "../shared/code-languages.ts";
import { compileDocumentation } from "../tools/content/compile.ts";
import { flatSection } from "./support/site.ts";

const nav = [flatSection("moonwell", ["moonwell/index.md"])];
const compile = (markdown: string) =>
  compileDocumentation(
    new Map([["moonwell/index.md", `# Code\n\n${markdown}`]]),
    nav,
    new Set(),
  );
const samples: Record<string, string> = {
  yue:
    'unit = Unit.create player, "hfoo", 0, 0, 270\nunit\\kill! if unit\\isAlive!\n',
  lua: 'local unit = Unit.create(player, "hfoo", 0, 0, 270)\n',
  pkl: 'amends "moonwell:Unit"\nname = "Footman"\n',
  toml: '[map]\nfolder = "map.w3x"\n',
  json: '{ "name": "sample", "level": 3 }\n',
  sh: 'curl -fsSL https://example.org/install.sh | sh\necho "done"\n',
  powershell: 'irm https://example.org/install.ps1 | iex\nWrite-Host "done"\n',
};

const tokenColours = (html: string) =>
  new Set(
    [...html.matchAll(/<span style="color:(#[0-9A-Fa-f]{6})/g)].map((m) =>
      m[1].toLowerCase()
    ),
  );

Deno.test("the table has the eight languages and resolves their aliases", () => {
  assertEquals(codeLanguages.map((language) => language.name), [
    "yue",
    "lua",
    "pkl",
    "toml",
    "json",
    "sh",
    "powershell",
    "text",
  ]);
  for (
    const [alias, name] of [
      ["yuescript", "yue"],
      ["bash", "sh"],
      ["shell", "sh"],
      ["ps1", "powershell"],
      ["lua", "lua"],
    ]
  ) assertEquals(codeLanguage(alias)?.name, name);
  assertEquals(codeLanguage("javascript"), undefined);
  assertEquals(codeLanguage(""), undefined);
});

for (const [name, sample] of Object.entries(samples)) {
  Deno.test(`a ${name} fence is highlighted and labelled`, async () => {
    const [page] = await compile("```" + name + "\n" + sample + "```\n");
    const label = codeLanguage(name)!.label;
    assertStringIncludes(
      page.html,
      `<div class="code-block" data-lang="${name}" data-label="${label}">`,
    );
    assertStringIncludes(page.html, 'class="shiki github-dark"');
    // Token spans only: Shiki's own <pre style="background-color:..;color:.."> must not count.
    const colours = tokenColours(page.html);
    assertEquals(
      colours.size >= 2,
      true,
      `${name}: ${colours.size} token colours, expected at least two`,
    );
    assertEquals(page.code, [{
      language: name,
      code: sample,
      line: 3,
      skip: false,
      group: null,
    }]);
  });
}

Deno.test("an alias is stored and drawn as its language", async () => {
  const [page] = await compile("```bash\necho hi\n```\n");
  assertStringIncludes(page.html, 'data-lang="sh" data-label="Shell"');
  assertEquals(page.code[0].language, "sh");
});

Deno.test("a text fence is escaped, labelled and not highlighted", async () => {
  const [page] = await compile("```text\n<b>1 file written</b>\n```\n");
  assertStringIncludes(
    page.html,
    '<div class="code-block" data-lang="text" data-label="Text"><pre><code>&lt;b&gt;1 file written&lt;/b&gt;',
  );
  assertEquals(page.html.includes("shiki"), false);
});

Deno.test("the word skip is recorded and no label text enters the page's text", async () => {
  const [page] = await compile(
    "```lua skip\nUnit.create(player, typeId)\n```\n",
  );
  assertEquals(page.code[0].skip, true);
  assertEquals(page.html.includes(">Lua<"), false);
  assertEquals(page.text.includes("Lua"), false);
});

for (
  const [name, markdown, message] of [
    [
      "an unknown language",
      "```javascript\n1\n```\n",
      "unknown code language javascript",
    ],
    [
      "a fence with no language",
      "```\n1\n```\n",
      "code block without a language",
    ],
    [
      "an indented code block",
      "    indented\n",
      "code block without a language",
    ],
    [
      "a word other than skip",
      "```lua run\n1\n```\n",
      "unknown word after the code language: run",
    ],
  ] as const
) {
  Deno.test(`rejects ${name} with the file and the line`, async () => {
    const error = await assertRejects(() => compile(markdown));
    assertInstanceOf(error, Error);
    assertStringIncludes(error.message, "moonwell/index.md:3");
    assertStringIncludes(error.message, message);
  });
}
