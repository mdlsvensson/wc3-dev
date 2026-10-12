import { prepareDocumentation } from "./content/prepare.ts";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const excluded = new Set([
  "_fresh",
  "generated",
  ".wrangler",
  "static",
  "fixtures",
  "grammars",
]);

async function sourceFiles(directory: URL, prefix: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    if (excluded.has(entry.name)) continue;
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory) {
      files.push(
        ...await sourceFiles(new URL(`${entry.name}/`, directory), `${path}/`),
      );
    } else if (/\.(?:[cm]?[jt]sx?|jsonc?|css)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files.sort();
}

await prepareDocumentation();
const files = (await Promise.all(
  ["home", "docs", "shared", "tools", "tests"].map((name) =>
    sourceFiles(new URL(`${name}/`, root), `${name}/`)
  ),
)).flat();
const code = files.filter((file) => /\.[cm]?[jt]sx?$/.test(file));
for (
  const args of [
    ["check", "--frozen", ...code],
    ["lint", ...code],
    [
      "fmt",
      "--check",
      "deno.json",
      "wrangler.jsonc",
      "wrangler.docs.jsonc",
      ...files,
    ],
  ]
) {
  const status = await new Deno.Command(Deno.execPath(), {
    args,
    cwd: fileURLToPath(root),
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn().status;
  if (!status.success) Deno.exit(status.code);
}
