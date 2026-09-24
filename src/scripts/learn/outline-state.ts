/**
 * Which section is being read: the last heading whose top (relative to the scroll container)
 * is at or above `offset`, or the last heading once the container is scrolled to the bottom.
 * Returns -1 above the first heading.
 */
export function activeIndex(tops: readonly number[], offset: number, atBottom: boolean): number {
  if (tops.length === 0) return -1;
  if (atBottom) return tops.length - 1;
  let active = -1;
  tops.forEach((top, index) => {
    if (top <= offset) active = index;
  });
  return active;
}
