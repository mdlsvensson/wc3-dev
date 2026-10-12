import { assertEquals, assertStringIncludes } from "@std/assert";
import { checkExamples, compilerRunner } from "../tools/check-examples.ts";
import { compileDocumentation } from "../tools/content/compile.ts";
import { flatSection } from "./support/site.ts";

const nav = [flatSection("moonwell", ["moonwell/index.md"])];
const compile = (markdown: string) =>
  compileDocumentation(
    new Map([["moonwell/index.md", `# Examples\n\n${markdown}`]]),
    nav,
    new Set(),
  );
const fence = (info: string, code: string) =>
  "```" + info + "\n" + code + "\n```\n";
const group = (...fences: string[]) =>
  `::: code-group\n${fences.join("")}:::\n`;

Deno.test("yue and lua blocks are compiled, skipped ones counted, other languages left alone", async () => {
  const pages = await compile(
    group(fence("yue", "x = 1"), fence("lua", "local x = 1")) +
      fence("lua skip", "Unit.create(player, typeId)") + fence("sh", "ls"),
  );
  const seen: string[] = [];
  const report = await checkExamples(pages, (language, code) => {
    seen.push(`${language}:${code.trim()}`);
    return Promise.resolve(null);
  });
  assertEquals(seen, ["yue:x = 1", "lua:local x = 1"]);
  assertEquals(report, { checked: 2, skipped: 1, failures: [] });
});

Deno.test("a failure names the file, the block's line, the language and the compiler's message", async () => {
  const pages = await compile(fence("lua", "local x = = 1"));
  const report = await checkExamples(
    pages,
    () => Promise.resolve("stdin:1: unexpected symbol near '='"),
  );
  assertEquals(report.checked, 1);
  assertEquals(report.failures, [
    "moonwell/index.md:3: lua: stdin:1: unexpected symbol near '='",
  ]);
});

Deno.test("a group with one of yue and lua and not the other fails; a group with neither does not", async () => {
  const ok = () => Promise.resolve(null);
  const lone = await checkExamples(
    await compile(group(fence("yue", "x = 1"), fence("text", "1"))),
    ok,
  );
  assertEquals(lone.failures, [
    "moonwell/index.md:4: a code group with yue needs lua too",
  ]);
  const other = await checkExamples(
    await compile(group(fence("lua", "x = 1"), fence("sh", "ls"))),
    ok,
  );
  assertEquals(other.failures, [
    "moonwell/index.md:4: a code group with lua needs yue too",
  ]);
  const neither = await checkExamples(
    await compile(group(fence("sh", "ls"), fence("powershell", "ls"))),
    ok,
  );
  assertEquals(neither, { checked: 0, skipped: 0, failures: [] });
});

Deno.test("a skipped fence still counts as present for the pairing of a code group", async () => {
  const ok = () => Promise.resolve(null);
  const report = await checkExamples(
    await compile(group(fence("yue", "x = 1"), fence("lua skip", "x = 1"))),
    ok,
  );
  assertEquals(report, { checked: 1, skipped: 1, failures: [] });
});

/** Runs `body` with the two compiler variables set as given (undefined: unset), then restores the exact old values. */
async function withCompilers(
  yue: string | undefined,
  luac: string | undefined,
  body: () => Promise<void> | void,
): Promise<void> {
  const names = { MOONWELL_YUE: yue, MOONWELL_LUAC: luac };
  const before = Object.keys(names).map((name) =>
    [name, Deno.env.get(name)] as const
  );
  try {
    for (const [name, value] of Object.entries(names)) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
    await body();
  } finally {
    for (const [name, value] of before) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

Deno.test("a compiler program that does not exist is named by its variable and path", async () => {
  await withCompilers("C:/no/such/folder/yue.exe", "luac", async () => {
    let message = "";
    try {
      await compilerRunner()("yue", "x = 1\n");
    } catch (error) {
      message = (error as Error).message;
    }
    assertStringIncludes(message, "MOONWELL_YUE");
    assertStringIncludes(message, "C:/no/such/folder/yue.exe");
  });
});

Deno.test("a missing compiler variable is named when the runner is made, before any block is run", async () => {
  const messageOf = () => {
    try {
      compilerRunner();
    } catch (error) {
      return (error as Error).message;
    }
    return "";
  };
  await withCompilers(undefined, undefined, () => {
    assertEquals(
      messageOf(),
      "MOONWELL_YUE is not set; MOONWELL_LUAC is not set",
    );
  });
  await withCompilers("yue", undefined, () => {
    assertEquals(messageOf(), "MOONWELL_LUAC is not set");
  });
  await withCompilers(undefined, "luac", () => {
    assertEquals(messageOf(), "MOONWELL_YUE is not set");
  });
  await withCompilers("yue", "luac", () => {
    assertEquals(messageOf(), "");
  });
});

Deno.test({
  name: "the real compilers accept good code and refuse bad code",
  ignore: !Deno.env.get("MOONWELL_YUE") || !Deno.env.get("MOONWELL_LUAC"),
  async fn() {
    const run = compilerRunner();
    assertEquals(await run("yue", "x = 1\nprint x\n"), null);
    assertEquals(await run("lua", "local x = 1\n"), null);
    assertStringIncludes(await run("yue", "x = = 1\n") ?? "", "expected");
    assertStringIncludes(
      await run("lua", "local x = = 1\n") ?? "",
      "unexpected",
    );
  },
});
