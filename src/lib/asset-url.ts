/** Public URL of a store `key` under `base`, tolerant of a missing trailing slash. */
export function assetUrlFrom(base: string, key: string): string {
  return new URL(key, base.endsWith('/') ? base : `${base}/`).href;
}
