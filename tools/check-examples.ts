import type { CodeBlock, CompiledPage } from "../shared/types.ts";
import { navigation } from "../docs/navigation.ts";
import { compileDocumentation } from "./content/compile.ts";
import { readSources, staticAssetPaths } from "./content/prepare.ts";

/** Compiles one block. Resolves to null when it compiled, or else to the compiler's message. */
export type RunCompiler = (
  language: "yue" | "lua",
  code: string,
) => Promise<string | null>;

export interface ExamplesReport {
  checked: number;
  skipped: number;
  failures: string[];
}

export async function checkExamples(
  pages: readonly CompiledPage[],
  run: RunCompiler,
): Promise<ExamplesReport> {
  const report: ExamplesReport = { checked: 0, skipped: 0, failures: [] };
  for (const page of pages) {
    const groups = new Map<number, CodeBlock[]>();
    for (const block of page.code) {
      if (block.group !== null) {
        groups.set(block.group, [...groups.get(block.group) ?? [], block]);
      }
      if (block.language !== "yue" && block.language !== "lua") continue;
      if (block.skip) {
        report.skipped++;
        continue;
      }
      report.checked++;
      const message = await run(block.language, block.code);
      if (message !== null) {
        report.failures.push(
          `${page.source}:${block.line}: ${block.language}: ${message.trim()}`,
        );
      }
    }
    // A fence marked skip is still shown, so it counts as present here.
    for (const blocks of groups.values()) {
      const languages = blocks.map((block) => block.language);
      for (const [has, needs] of [["yue", "lua"], ["lua", "yue"]]) {
        if (languages.includes(has) && !languages.includes(needs)) {
          report.failures.push(
            `${page.source}:${
              blocks[0].line
            }: a code group with ${has} needs ${needs} too`,
          );
        }
      }
    }
  }
  return report;
}

/**
 * Runs the YueScript compiler and Lua 5.3's luac on standard input. The two programs are named by variables, and both
 * are read here, before any block is looked at: a missing one is an error that names it.
 */
export function compilerRunner(): RunCompiler {
  const programs = {
    yue: { variable: "MOONWELL_YUE", args: ["-"] },
    lua: { variable: "MOONWELL_LUAC", args: ["-p", "-"] },
  };
  const named = {
    yue: Deno.env.get(programs.yue.variable),
    lua: Deno.env.get(programs.lua.variable),
  };
  const missing = (["yue", "lua"] as const).filter((language) =>
    !named[language]
  ).map((language) => `${programs[language].variable} is not set`);
  if (missing.length) throw new Error(missing.join("; "));
  return async (language, code) => {
    const { variable, args } = programs[language];
    const program = named[language]!;
    let child: Deno.ChildProcess;
    try {
      child = new Deno.Command(program, {
        args,
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
      }).spawn();
    } catch (error) {
      throw new Error(
        `${variable} names ${program}, which cannot be started: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
    try {
      const writer = child.stdin.getWriter();
      await writer.write(new TextEncoder().encode(code));
      await writer.close();
    } catch {
      // The program stopped reading (it refused the code): its message is read below.
    }
    const { success, stdout, stderr } = await child.output();
    if (success) return null;
    const decoder = new TextDecoder();
    return `${decoder.decode(stderr)}${decoder.decode(stdout)}`.trim() ||
      "the compiler failed without a message";
  };
}

if (import.meta.main) {
  const sources = await readSources(
    new URL("../docs/content/", import.meta.url),
  );
  const assets = await staticAssetPaths(new URL("../", import.meta.url));
  const pages = await compileDocumentation(sources, navigation, assets);
  let run: RunCompiler;
  try {
    run = compilerRunner();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
  const report = await checkExamples(pages, run);
  for (const failure of report.failures) console.error(failure);
  console.log(
    `${report.checked} examples checked, ${report.skipped} skipped, ${report.failures.length} failed`,
  );
  if (report.failures.length) Deno.exit(1);
}
