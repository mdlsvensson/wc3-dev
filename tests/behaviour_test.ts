import { assertEquals, assertStringIncludes } from "@std/assert";
import { createHomeApp } from "../home/app.tsx";
import { createDocsApp } from "../docs/app.tsx";
import { languageCss, languageScript } from "../docs/behaviour/head.ts";
import {
  chooseLanguage,
  nextTab,
  pageLanguages,
  parseStored,
  pickLanguage,
  storageKey,
} from "../docs/behaviour/languages.ts";
import { currentHeading } from "../docs/behaviour/outline.ts";
import { codeLanguages } from "../shared/code-languages.ts";
import { loadSampleSite } from "./support/site.ts";

Deno.test("a stored list keeps known names only, whatever was stored", () => {
  assertEquals(parseStored(null), []);
  assertEquals(parseStored(""), []);
  assertEquals(parseStored("lua powershell"), ["lua", "powershell"]);
  assertEquals(parseStored("  lua   lua  "), ["lua"]);
  assertEquals(parseStored('lua "><script>alert(1)</script> cobol'), ["lua"]);
  assertEquals(parseStored("LUA"), []);
});

Deno.test("a group shows the first stored language it has, or else its first", () => {
  assertEquals(pickLanguage(["lua"], ["yue", "lua"]), "lua");
  assertEquals(pickLanguage(["powershell", "lua"], ["yue", "lua"]), "lua");
  assertEquals(pickLanguage(["powershell"], ["yue", "lua"]), "yue");
  assertEquals(pickLanguage([], ["sh", "powershell"]), "sh");
});

Deno.test("choosing puts the language first and drops the group's others", () => {
  assertEquals(chooseLanguage([], ["yue", "lua"], "lua"), ["lua"]);
  assertEquals(
    chooseLanguage(["yue", "powershell"], ["yue", "lua"], "lua"),
    ["lua", "powershell"],
  );
  assertEquals(
    chooseLanguage(["lua", "powershell"], ["sh", "powershell"], "sh"),
    ["sh", "lua"],
  );
  assertEquals(chooseLanguage(["lua"], ["yue", "lua"], "lua"), ["lua"]);
});

Deno.test("arrow keys, Home and End move between tabs and wrap", () => {
  assertEquals(nextTab(2, 0, "ArrowRight"), 1);
  assertEquals(nextTab(2, 1, "ArrowRight"), 0);
  assertEquals(nextTab(2, 0, "ArrowLeft"), 1);
  assertEquals(nextTab(3, 1, "Home"), 0);
  assertEquals(nextTab(3, 1, "End"), 2);
  assertEquals(nextTab(3, 1, "Enter"), undefined);
});

Deno.test("the heading being read is the last one at or above the line", () => {
  const tops = [{ id: "a", top: -400 }, { id: "b", top: 90 }, {
    id: "c",
    top: 700,
  }];
  assertEquals(currentHeading(tops, 112), "b");
  assertEquals(currentHeading([{ id: "a", top: 300 }], 112), undefined);
  assertEquals(currentHeading([], 112), undefined);
});

Deno.test("at the bottom of the document the heading being read is the last one", () => {
  // The last sections of a page are too short to scroll their headings up to the line.
  const tops = [{ id: "a", top: -400 }, { id: "b", top: 90 }, {
    id: "c",
    top: 700,
  }];
  assertEquals(currentHeading(tops, 112, true), "c");
  assertEquals(currentHeading([{ id: "a", top: 300 }], 112, true), "a");
  assertEquals(currentHeading([], 112, true), undefined);
  assertEquals(currentHeading(tops, 112, false), "b");
  assertEquals(currentHeading([{ id: "a", top: 300 }], 112, false), undefined);
});

Deno.test("the generated CSS has one rule pair per language and nothing else", () => {
  const css = languageCss();
  for (const { name } of codeLanguages) {
    assertStringIncludes(css, `[data-code-languages~="${name}"]`);
    assertStringIncludes(css, `.code-block[data-lang="${name}"]`);
  }
  assertEquals(css.includes("<"), false);
  assertStringIncludes(languageScript, JSON.stringify(storageKey));
});

/** Runs the head script against a stand-in document and storage; returns what it did to the root element. */
function runLanguageScript(getItem: (key: string) => string | null) {
  const classes: string[] = [];
  const attributes: Record<string, string> = {};
  const documentElement = {
    classList: { add: (name: string) => classes.push(name) },
    setAttribute: (name: string, value: string) => attributes[name] = value,
  };
  const keys: string[] = [];
  new Function("document", "localStorage", languageScript)(
    { documentElement },
    {
      getItem: (key: string) => {
        keys.push(key);
        return getItem(key);
      },
    },
  );
  return { classes, attributes, keys };
}

Deno.test("the head script marks the root and copies a clean stored list only", () => {
  const none = runLanguageScript(() => null);
  assertEquals(none.classes, ["js"]);
  assertEquals(none.attributes, {});
  assertEquals(none.keys, [storageKey]);

  const clean = runLanguageScript(() => "lua powershell");
  assertEquals(clean.classes, ["js"]);
  assertEquals(clean.attributes, { "data-code-languages": "lua powershell" });

  const hostile = runLanguageScript(() => 'lua "><script>alert(1)</script>');
  assertEquals(hostile.classes, ["js"]);
  assertEquals(hostile.attributes, {});

  const blocked = runLanguageScript(() => {
    throw new Error("storage is blocked");
  });
  assertEquals(blocked.classes, ["js"]);
  assertEquals(blocked.attributes, {});
});

Deno.test("before the page script takes over, a scripted page hides a group's later blocks", async () => {
  const css = await Deno.readTextFile(
    new URL("../shared/styles/site.css", import.meta.url),
  );
  assertStringIncludes(
    css,
    "html.js .code-group:not([data-ready]) > .code-block ~ .code-block {",
  );
  // The generated rules stop at the same mark, so the page script's data-ready ends them all.
  const rules: string[] = languageCss().split("}").filter((rule) => rule);
  assertEquals(rules.length, codeLanguages.length * 2);
  assertEquals(
    rules.every((rule) => rule.includes(".code-group:not([data-ready])")),
    true,
  );
});

Deno.test("a documentation page carries the head script and CSS; other pages do not", async () => {
  const { pages, sidebars } = await loadSampleSite();
  const docs = createDocsApp(pages, sidebars).handler();
  const page =
    await (await docs(new Request("https://docs.wc3.dev/wrappers/handles")))
      .text();
  const head = page.slice(0, page.indexOf("</head>"));
  assertStringIncludes(head, "data-code-languages");
  assertStringIncludes(head, 'classList.add("js")');
  for (
    const html of [
      await (await docs(new Request("https://docs.wc3.dev/"))).text(),
      await (await createHomeApp().handler()(new Request("https://wc3.dev/")))
        .text(),
    ]
  ) assertEquals(html.includes("data-code-languages"), false);
});

Deno.test("the list a page starts from is its own value, else the stored one", () => {
  assertEquals(pageLanguages("lua", "powershell"), ["lua"]);
  assertEquals(pageLanguages(null, "powershell lua"), ["powershell", "lua"]);
  assertEquals(pageLanguages(null, null), []);
  assertEquals(pageLanguages('lua "><script>', "powershell"), ["lua"]);
  assertEquals(pageLanguages("", "powershell"), []);
});

Deno.test("with storage blocked, a choice in one group keeps the choices in groups of other languages", () => {
  const yueLua = ["yue", "lua"];
  const shell = ["sh", "powershell"];
  const afterLua = chooseLanguage(pageLanguages(null, null), yueLua, "lua");
  assertEquals(afterLua, ["lua"]);
  const afterShell = chooseLanguage(
    pageLanguages(afterLua.join(" "), null),
    shell,
    "powershell",
  );
  assertEquals(afterShell, ["powershell", "lua"]);
  assertEquals(pickLanguage(afterShell, yueLua), "lua");
  assertEquals(pickLanguage(afterShell, shell), "powershell");
});
