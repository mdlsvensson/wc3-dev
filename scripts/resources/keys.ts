const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UNSAFE_NAME = /[/\\?#%\x00-\x1f]/;

export const isSlug = (value: string): boolean => SLUG.test(value);

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Content-addressed key: a changed file gets a new key, so the store can cache forever. */
export function storeKey(type: string, slug: string, hashHex: string, fileName: string): string {
  if (!isSlug(slug)) throw new Error(`Invalid slug "${slug}": use lowercase kebab-case.`);
  if (!fileName || UNSAFE_NAME.test(fileName)) throw new Error(`Unsafe file name "${fileName}".`);
  return `resources/${type}/${slug}/${hashHex.slice(0, 12)}/${fileName}`;
}
