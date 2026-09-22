import { ASSET_BASE_URL } from 'astro:env/server';

/** Matches `deno task assets:serve`. */
const DEV_BASE = 'http://127.0.0.1:4322/';

/** Public URL of a store key. Fails the build when a resource file must render and no store is configured. */
export function assetUrl(key: string): string {
  const base = ASSET_BASE_URL ?? (import.meta.env.DEV ? DEV_BASE : undefined);
  if (!base) throw new Error('Set ASSET_BASE_URL to build pages that show resource files.');
  return new URL(key, base.endsWith('/') ? base : `${base}/`).href;
}
