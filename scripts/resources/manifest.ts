import type { GameTextureMap } from '../../src/lib/game-textures.ts';

export const DEFAULT_MANIFEST = 'src/data/game-textures.json';

/** The committed game-texture manifest; an absent file means nothing is hosted yet. */
export async function readManifest(path = DEFAULT_MANIFEST): Promise<GameTextureMap> {
  try {
    return JSON.parse(await Deno.readTextFile(path));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return {};
    throw error;
  }
}

/** Writes entries in code-point order so manifest diffs stay readable and identical on every machine. */
export async function writeManifest(path: string, map: GameTextureMap): Promise<void> {
  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  await Deno.writeTextFile(path, JSON.stringify(sorted, null, 2) + '\n');
}
