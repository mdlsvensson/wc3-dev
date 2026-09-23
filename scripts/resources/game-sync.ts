import { join, relative } from 'jsr:@std/path@^1';
import {
  type GameTextureMap, manifestEntry, type ModelTextureRefs, modelGamePaths, normalizeGamePath, teamTexturePaths, type TextureSet,
} from '../../src/lib/game-textures.ts';
import { resourceSchema } from '../../src/lib/resource-schema.ts';
import { sha256Hex } from './keys.ts';
import { DEFAULT_MANIFEST, readManifest, writeManifest } from './manifest.ts';
import { type AssetStore, dryRunStore, localStore, s3StoreFromEnv } from './store.ts';

const GAME_CONTENT_TYPES: Record<string, string> = { blp: 'application/octet-stream', dds: 'image/vnd-ms.dds', tga: 'image/x-tga' };

/**
 * Maps normalised relative paths to files under an extracted game folder. A nested `_hd.w3mod` folder is skipped, so
 * indexing the SD root does not also walk the HD tree; index the HD folder as its own root.
 */
export async function indexGameRoot(root: string): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  const walk = async (dir: string): Promise<void> => {
    for await (const entry of Deno.readDir(dir)) {
      const path = join(dir, entry.name);
      if (entry.isDirectory && entry.name.toLowerCase() === '_hd.w3mod') continue;
      if (entry.isDirectory) await walk(path);
      else if (entry.isFile) index.set(normalizeGamePath(relative(root, path)), path);
    }
  };
  await walk(root);
  return index;
}

/**
 * Every game path the catalog's models may request, plus the team colour sets for the sets being synced. Paths that
 * differ only in casing or separators count once, keeping the first spelling.
 */
export function neededGamePaths(models: ModelTextureRefs[], sets: TextureSet[] = ['sd', 'hd']): string[] {
  const paths = new Map<string, string>();
  const add = (path: string) => {
    const normalized = normalizeGamePath(path);
    if (!paths.has(normalized)) paths.set(normalized, path);
  };
  for (const path of sets.flatMap(teamTexturePaths)) add(path);
  for (const refs of models) for (const path of modelGamePaths(refs)) add(path);
  return [...paths.values()];
}

const swapExtension = (path: string) => path.replace(/\.(blp|dds)$/i, (_match, ext: string) => (ext.toLowerCase() === 'blp' ? '.dds' : '.blp'));

export interface SyncItem { entry: string; set: TextureSet; path: string; file: string }
export interface SyncPlan { items: SyncItem[]; missing: string[] }

/** Where each needed path exists. A path is missing only when neither it nor its .blp/.dds counterpart was found. */
export function planGameSync(needed: string[], indexes: Partial<Record<TextureSet, Map<string, string>>>): SyncPlan {
  const items: SyncItem[] = [];
  const found = new Set<string>();
  for (const path of needed) {
    for (const set of ['sd', 'hd'] as const) {
      const file = indexes[set]?.get(normalizeGamePath(path));
      if (!file) continue;
      items.push({ entry: manifestEntry(set, path), set, path, file });
      found.add(normalizeGamePath(path));
    }
  }
  const missing = needed.filter((path) => !found.has(normalizeGamePath(path)) && !found.has(normalizeGamePath(swapExtension(path))));
  return { items, missing };
}

export const gameKey = (set: TextureSet, hashHex: string, path: string): string =>
  `game/${set}/${hashHex.slice(0, 12)}/${normalizeGamePath(path)}`;

async function readModelRefs(dir: string): Promise<ModelTextureRefs[]> {
  const refs: ModelTextureRefs[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (!entry.isFile || !entry.name.endsWith('.json')) continue;
      const data = resourceSchema.parse(JSON.parse(await Deno.readTextFile(join(dir, entry.name))));
      if (data.type !== 'model') continue;
      refs.push({ textures: data.textures, replaceables: data.replaceables, ownFiles: data.files.map((file) => file.key.split('/').at(-1) ?? '') });
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  return refs;
}

export interface SyncOptions {
  /** `src/content/resources`; only its `model/` folder is read, so test fixtures never drive uploads. */
  contentRoot: string;
  roots: Partial<Record<TextureSet, string>>;
  store: AssetStore;
  manifestPath: string;
  /** Write the manifest; false for dry runs. Defaults to true. */
  write?: boolean;
}

export interface SyncResult {
  manifest: GameTextureMap;
  /** Entries whose key is new or changed since the previous manifest. */
  uploaded: string[];
  /** Entries whose key matches the previous manifest. They are uploaded too; this list is for reporting only. */
  unchanged: string[];
  missing: string[];
  dropped: string[];
}

/**
 * Uploads the game textures the catalog needs and rewrites the manifest. Entries for sets not being synced are kept, and
 * so are entries for paths still needed whose files were not found this run; only entries no model uses are dropped.
 * Every planned file is uploaded on every run: the manifest may have been written by a `--local` run, so a matching key
 * does not prove the object is in this store, and content-addressed keys make re-uploads harmless.
 */
export async function syncGameTextures(options: SyncOptions): Promise<SyncResult> {
  const { contentRoot, roots, store, manifestPath, write = true } = options;
  const sets = (['sd', 'hd'] as const).filter((set) => roots[set]);
  if (!sets.length) throw new Error('Pass --sd and/or --hd with folders extracted from the game.');
  const indexes: Partial<Record<TextureSet, Map<string, string>>> = {};
  for (const set of sets) indexes[set] = await indexGameRoot(roots[set]!);

  const needed = neededGamePaths(await readModelRefs(join(contentRoot, 'model')), sets);
  const plan = planGameSync(needed, indexes);
  const previous = await readManifest(manifestPath);
  const synced = (entry: string) => sets.some((set) => entry.startsWith(`${set}:`));
  const stillNeeded = new Set(needed.map(normalizeGamePath));
  const neededEntry = (entry: string) => stillNeeded.has(entry.slice(entry.indexOf(':') + 1));
  // Entries of synced sets start from the previous manifest when their path is still needed, so a file missing from a
  // partial extraction keeps its hosted texture; files found this run overwrite them below.
  const manifest: GameTextureMap = Object.fromEntries(Object.entries(previous).filter(([entry]) => !synced(entry) || neededEntry(entry)));
  const uploaded: string[] = [];
  const unchanged: string[] = [];

  for (const item of plan.items) {
    const bytes = await Deno.readFile(item.file);
    const key = gameKey(item.set, await sha256Hex(bytes), item.path);
    manifest[item.entry] = key;
    const extension = item.path.split('.').pop()?.toLowerCase() ?? '';
    await store.put(key, bytes, GAME_CONTENT_TYPES[extension] ?? 'application/octet-stream');
    (previous[item.entry] === key ? unchanged : uploaded).push(item.entry);
  }

  const dropped = Object.keys(previous).filter((entry) => synced(entry) && !neededEntry(entry));
  if (write) await writeManifest(manifestPath, manifest);
  return { manifest, uploaded, unchanged, missing: plan.missing, dropped };
}

if (import.meta.main) {
  const usage = () => {
    console.error('Usage: deno task game:sync --sd <extracted war3.w3mod> [--hd <extracted _hd.w3mod>] [--dry-run] [--local]');
    Deno.exit(2);
  };
  const roots: Partial<Record<TextureSet, string>> = {};
  const flags = new Set<string>();
  for (let index = 0; index < Deno.args.length; index++) {
    const arg = Deno.args[index];
    if (arg === '--sd' || arg === '--hd') {
      const dir = Deno.args[++index];
      if (!dir || dir.startsWith('--')) usage();
      roots[arg.slice(2) as TextureSet] = dir;
    } else if (arg === '--dry-run' || arg === '--local') flags.add(arg);
    else usage();
  }
  if (!roots.sd && !roots.hd) usage();
  const dryRun = flags.has('--dry-run');
  try {
    const store = dryRun ? dryRunStore() : flags.has('--local') ? localStore('.asset-store') : s3StoreFromEnv();
    const result = await syncGameTextures({ contentRoot: 'src/content/resources', roots, store, manifestPath: DEFAULT_MANIFEST, write: !dryRun });
    for (const path of result.missing) console.warn(`warning: not found in the game folders: ${path}`);
    for (const entry of result.dropped) console.log(`no longer needed (left in the store): ${entry}`);
    const summary = `${result.uploaded.length} new or changed, ${result.unchanged.length} unchanged`;
    console.log(dryRun ? `${summary} (dry run; nothing uploaded, manifest not written).` : `${summary} (all uploaded); wrote ${DEFAULT_MANIFEST}.`);
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}
