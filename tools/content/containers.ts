export const containerNames = ["code-group", "note", "warning"] as const;

/**
 * Refuse what markdown-it-container would let through in silence: an unknown name is left as a paragraph of
 * colons, and a block with no end is closed at the end of the file.
 */
export function checkContainers(source: string, content: string): void {
  let fence: string | null = null;
  let open: { name: string; line: number } | null = null;
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const text = lines[index];
    const line = index + 1;
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(text);
    if (fence) {
      if (
        marker && marker[1][0] === fence[0] &&
        marker[1].length >= fence.length && !marker[2].trim()
      ) fence = null;
      continue;
    }
    if (marker) {
      fence = marker[1];
      continue;
    }
    const block = /^ {0,3}:{3,}(.*)$/.exec(text);
    if (!block) continue;
    const name = block[1].trim().split(/\s+/)[0];
    if (!name) {
      if (!open) {
        throw new Error(`${source}:${line}: block end without a block`);
      }
      open = null;
    } else if (!(containerNames as readonly string[]).includes(name)) {
      throw new Error(`${source}:${line}: unknown block name ${name}`);
    } else if (open) {
      throw new Error(
        `${source}:${line}: block ${name} inside block ${open.name}`,
      );
    } else open = { name, line };
  }
  if (open) {
    throw new Error(
      `${source}:${open.line}: block ${open.name} is not closed`,
    );
  }
}
