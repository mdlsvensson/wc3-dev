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

Deno.test("a compiler program that does not exist is named by its variable and path", async () => {
  const before = Deno.env.get("MOONWELL_YUE");
  Deno.env.set("MOONWELL_YUE", "C:/no/such/folder/yue.exe");
  try {
    let message = "";
    try {
      await compilerRunner()("yue", "x = 1\n");
    } catch (error) {
      message = (error as Error).message;
    }
    assertStringIncludes(message, "MOONWELL_YUE");
    assertStringIncludes(message, "C:/no/such/folder/yue.exe");
  } finally {
    if (before === undefined) Deno.env.delete("MOONWELL_YUE");
    else Deno.env.set("MOONWELL_YUE", before);
  }
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
