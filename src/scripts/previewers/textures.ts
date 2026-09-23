import { baseName, type GameTextureMap, isTeamTexture, lookupGameTexture } from '../../lib/game-textures.ts';
import type { PreviewFile } from './files.ts';

/** What the viewer passes to a path solver alongside each path. */
export interface SolverParams { reforged?: boolean; hd?: boolean }

export interface TextureResolver {
  solve: (src: unknown, params?: SolverParams) => unknown;
  /** Texture paths that resolved to the stand-in texture. */
  missing: Set<string>;
}

const TEXTURE_PATH = /\.(blp|dds|tga)$/i;

/**
 * The viewer's path solver: the resource's own texture files first, then hosted game textures. An unresolved texture
 * path gets the stand-in and is recorded as missing; any other unresolved path (tables, sounds, models) resolves to
 * `undefined`, so the viewer skips loading it.
 */
export function createTextureResolver(files: PreviewFile[], gameTextures: GameTextureMap, missingTexture: () => unknown): TextureResolver {
  const own = new Map(files.filter((file) => file.role === 'texture').map((file) => [file.name.toLowerCase(), file.url]));
  const missing = new Set<string>();
  const solve = (src: unknown, params?: SolverParams): unknown => {
    // The parsed model itself is passed through untouched.
    if (typeof src !== 'string') return src;
    const ownUrl = own.get(baseName(src));
    if (ownUrl) return ownUrl;
    const gameUrl = lookupGameTexture(gameTextures, src, Boolean(params?.hd || params?.reforged));
    if (gameUrl) return gameUrl;
    if (!TEXTURE_PATH.test(src)) return undefined;
    missing.add(src);
    return missingTexture();
  };
  return { solve, missing };
}

/** Missing texture paths for display, deduplicated across separators, with team colour and glow textures collapsed into one line. */
export function summarizeMissing(paths: Iterable<string>): string[] {
  const list = [...new Set([...paths].map((path) => path.replaceAll('/', '\\')))];
  const team = list.filter(isTeamTexture).length;
  const rest = list.filter((path) => !isTeamTexture(path)).sort();
  return team ? [...rest, `Team colour textures (${team})`] : rest;
}
