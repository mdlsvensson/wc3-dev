/** Game textures (team colours, replaceables, standard textures) hosted for the model previewer. */
export type TextureSet = 'sd' | 'hd';
/** `"<set>:<normalised path>"` → a store key (in the repo manifest) or a URL (on a page). */
export type GameTextureMap = Record<string, string>;

/** How many team colour and glow textures the viewer loads per set. */
export const TEAM_COLOR_COUNTS: Record<TextureSet, number> = { sd: 16, hd: 28 };
const EXTENSIONS: Record<TextureSet, string> = { sd: 'blp', hd: 'dds' };

/** Lowercase with forward slashes, so lookups ignore the game's inconsistent casing and separators. */
export function normalizeGamePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\/+/, '').toLowerCase();
}

export const manifestEntry = (set: TextureSet, path: string): string => `${set}:${normalizeGamePath(path)}`;

export const baseName = (path: string): string => (path.split(/[\\/]/).pop() ?? '').toLowerCase();

/** The HD entry first when HD textures are wanted, then SD. */
export function lookupGameTexture(map: GameTextureMap, path: string, preferHd: boolean): string | undefined {
  return (preferHd ? map[manifestEntry('hd', path)] : undefined) ?? map[manifestEntry('sd', path)];
}

/** Team colour and glow textures the viewer loads for a set, in the viewer's order. */
export function teamTexturePaths(set: TextureSet): string[] {
  const paths: string[] = [];
  for (let index = 0; index < TEAM_COLOR_COUNTS[set]; index++) {
    const id = String(index).padStart(2, '0');
    paths.push(
      `ReplaceableTextures\\TeamColor\\TeamColor${id}.${EXTENSIONS[set]}`,
      `ReplaceableTextures\\TeamGlow\\TeamGlow${id}.${EXTENSIONS[set]}`,
    );
  }
  return paths;
}

export const isTeamTexture = (path: string): boolean => /^replaceabletextures\/team(color|glow)\//.test(normalizeGamePath(path));

export interface ModelTextureRefs {
  /** Texture paths written in the model. */
  textures: string[];
  /** Replaceable texture paths without extension, e.g. `ReplaceableTextures\Cliff\Cliff0`. */
  replaceables: string[];
  /** File names the resource ships itself; these never come from the game. */
  ownFiles: string[];
}

/** Game paths one model may request, not counting the shared team colour sets. */
export function modelGamePaths(refs: ModelTextureRefs): string[] {
  const own = new Set(refs.ownFiles.map(baseName));
  const paths = refs.textures.filter((path) => !own.has(baseName(path)));
  for (const stem of refs.replaceables) paths.push(`${stem}.${EXTENSIONS.sd}`, `${stem}.${EXTENSIONS.hd}`);
  return [...new Set(paths)];
}

/** The manifest entries a model's page needs: its own game paths plus both team colour sets. */
export function manifestSubset(manifest: GameTextureMap, refs: ModelTextureRefs): GameTextureMap {
  const subset: GameTextureMap = {};
  for (const path of [...modelGamePaths(refs), ...teamTexturePaths('sd'), ...teamTexturePaths('hd')]) {
    for (const set of ['sd', 'hd'] as const) {
      const entry = manifestEntry(set, path);
      if (manifest[entry]) subset[entry] = manifest[entry];
    }
  }
  return subset;
}

/** Game textures a model needs that neither set hosts; replaceables are reported without an extension. */
export function unhostedGameTextures(manifest: GameTextureMap, refs: ModelTextureRefs): string[] {
  const own = new Set(refs.ownFiles.map(baseName));
  const unhosted = refs.textures.filter((path) => !own.has(baseName(path)) && !lookupGameTexture(manifest, path, true));
  for (const stem of refs.replaceables) {
    const hosted = lookupGameTexture(manifest, `${stem}.${EXTENSIONS.sd}`, true) ?? lookupGameTexture(manifest, `${stem}.${EXTENSIONS.hd}`, true);
    if (!hosted) unhosted.push(stem);
  }
  return [...new Set(unhosted)];
}
