/** The last heading whose top is at or above the line: the one a reader is under. */
export function currentHeading(
  tops: readonly { id: string; top: number }[],
  line: number,
): string | undefined {
  let current: string | undefined;
  for (const heading of tops) {
    if (heading.top <= line) current = heading.id;
  }
  return current;
}
