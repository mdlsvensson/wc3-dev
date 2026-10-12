/**
 * The last heading whose top is at or above the line: the one a reader is under. At the bottom of the document it is
 * the last heading: the last sections of a page are too short to scroll their headings up to the line.
 */
export function currentHeading(
  tops: readonly { id: string; top: number }[],
  line: number,
  atBottom = false,
): string | undefined {
  if (atBottom) return tops.at(-1)?.id;
  let current: string | undefined;
  for (const heading of tops) {
    if (heading.top <= line) current = heading.id;
  }
  return current;
}
