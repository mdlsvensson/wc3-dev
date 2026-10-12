// @deno-types="@types/markdown-it"
import type { Token } from "markdown-it";

/** The one list of block names. `render.ts` registers a plugin for each. */
export const containerNames = ["code-group", "note", "warning"] as const;

/** The first word of the text after the colons of a block marker: the plugin's `validate` and the checks read it alike. */
export function containerName(params: string): string {
  return params.trim().split(/\s+/)[0] ?? "";
}

/** The title an author wrote after the name of a note or a warning, or an empty string. */
export function containerTitle(params: string): string {
  return params.trim().replace(/^\S+\s*/, "");
}

const openType = /^container_(.+)_open$/;
const closeType = /^container_(.+)_close$/;

/**
 * Refuse what markdown-it-container would let through in silence, from the tokens markdown-it made of the page, so
 * that one parser decides what a block is. `lines` is the source split at line ends.
 *
 * The plugin sets `map` of an opening token to `[line of the opener, line of the closing marker]`; when it finds no
 * closing marker it sets the second number to the line where its parent ends, and closes the block there. A block
 * whose second line does not hold a run of colons has therefore been closed by the plugin itself.
 */
export function checkContainers(
  source: string,
  tokens: readonly Token[],
  lines: readonly string[],
): void {
  const found: { line: number; reason: string }[] = [];
  const fail = (line: number, reason: string) => found.push({ line, reason });
  const stack: string[] = [];
  for (const token of tokens) {
    if (token.type === "inline") {
      const start = token.map?.[0] ?? 0;
      token.content.split("\n").forEach((text, index) => {
        const trimmed = text.trim();
        if (!trimmed.startsWith(":::")) return;
        const line = start + index + 1;
        const rest = trimmed.replace(/^:+/, "");
        const name = containerName(rest);
        if (!name) fail(line, "block end without a block");
        else if (!(containerNames as readonly string[]).includes(name)) {
          fail(line, `unknown block name ${name}`);
        } else fail(line, `block ${name} is not at the start of a block`);
      });
      continue;
    }
    const close = closeType.exec(token.type);
    if (close) {
      stack.pop();
      continue;
    }
    const open = openType.exec(token.type);
    if (!open) continue;
    const name = open[1];
    const line = (token.map?.[0] ?? 0) + 1;
    if (stack.length) {
      fail(line, `block ${name} inside block ${stack[stack.length - 1]}`);
    }
    stack.push(name);
    const closer = lines[token.map?.[1] ?? Infinity];
    if (
      closer === undefined || !/^:{3,}\s*$/.test(closer.replace(/^[\s>]*/, ""))
    ) {
      fail(line, `block ${name} is not closed`);
    }
    const [, ...extra] = token.info.trim().split(/\s+/);
    if (name === "code-group" && extra.length) {
      fail(line, `unknown word after code-group: ${extra[0]}`);
    }
  }
  if (!found.length) return;
  const first = found.reduce((best, next) =>
    next.line < best.line ? next : best
  );
  throw new Error(`${source}:${first.line}: ${first.reason}`);
}
