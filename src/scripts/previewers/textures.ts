import { baseName, type GameTextureMap, isTeamTexture, lookupGameTexture } from '../../lib/game-textures.ts';
import type { PreviewFile } from './files.ts';

/** What the viewer passes to a path solver alongside each path. */
export interface SolverParams { reforged?: boolean; hd?: boolean }

export interface TextureResolver {
  solve: (src: unknown, params?: SolverParams) => unknown;
  /** Paths that resolved to the stand-in texture. */
  missing: Set<string>;
}

/** The viewer's path solver: the resource's own files first, then hosted game textures, then a stand-in. */
export function createTextureResolver(files: PreviewFile[], gameTextures: GameTextureMap, missingTexture: () => unknown): TextureResolver {
  const own = new Map(files.map((file) => [file.name.toLowerCase(), file.url]));
  const missing = new Set<string>();
  const solve = (src: unknown, params?: SolverParams): unknown => {
    // The parsed model itself is passed through untouched.
    if (typeof src !== 'string') return src;
    const ownUrl = own.get(baseName(src));
    if (ownUrl) return ownUrl;
    const gameUrl = lookupGameTexture(gameTextures, src, Boolean(params?.hd || params?.reforged));
    if (gameUrl) return gameUrl;
    missing.add(src);
    return missingTexture();
  };
  return { solve, missing };
}

/** Missing texture paths for display, with team colour and glow textures collapsed into one line. */
export function summarizeMissing(paths: Iterable<string>): string[] {
  const list = [...paths];
  const team = list.filter(isTeamTexture).length;
  const rest = list.filter((path) => !isTeamTexture(path)).map((path) => path.replaceAll('/', '\\')).sort();
  return team ? [...rest, `Team colour textures (${team})`] : rest;
}
