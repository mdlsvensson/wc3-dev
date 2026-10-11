export function tabBoundaryTarget<T>(
  stops: readonly T[],
  active: T | null,
  backwards: boolean,
): T | undefined {
  const index = active === null ? -1 : stops.indexOf(active);
  if (index === -1 || index === (backwards ? 0 : stops.length - 1)) {
    return stops[backwards ? stops.length - 1 : 0];
  }
  return undefined;
}
