# Previewers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Live previews in every hosted resource's `#resource-preview` area — a WebGL model viewer, a BLP/DDS/TGA image viewer, an audio player with waveform, and highlighted script source — plus hosting of the game textures models need.

**Architecture:** One client entry (`src/scripts/previewers/index.ts`) runs on `astro:page-load`, dynamically imports the previewer for the page's resource type, and disposes it on `astro:before-swap`. Each previewer is an async `mount(preview, files) → dispose` that replaces the static fallback only once it is ready. Pure logic (paths, texture resolution, orbit maths, zoom, waveform) lives in DOM-free modules tested with `deno test`. Game textures are uploaded by a Deno command into the asset store, recorded in a committed manifest, and each model page embeds only the entries it needs.

**Tech Stack:** Deno 2.9, Astro 7.3 (ClientRouter events), `mdx-m3-viewer-th` 5.13.4 (viewer core + MDX/BLP/DDS/TGA handlers and parsers), `events` 3.3.0 (browser EventEmitter for the viewer), Shiki 4 core with the JavaScript regex engine, Web Audio, vanilla TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-23-previewers-design.md` (builds on `2026-09-22-resource-system-design.md` and `2026-09-22-app-shell-design.md`)

## Global Constraints

- Every subagent in this plan runs on Opus 5.5 (owner's instruction).
- Deno tasks only; never npm/node commands or npm lockfiles. Dependencies go in `package.json`; run `deno install` and commit `deno.lock`.
- No client UI framework; Astro components and vanilla TypeScript.
- Styles go in global CSS under `src/styles/` (Starlight forces `scopedStyleStrategy: "where"`); previewer styles in `src/styles/resources.css`.
- Import only the viewer core and the MDX/BLP/DDS/TGA handler modules from `mdx-m3-viewer-th`, never `viewer/handlers/index`.
- A previewer replaces the static fallback only after it is ready; any failure leaves the fallback visible and shows "<Previewer> unavailable: <reason>" with a Retry button. Nothing throws out of the entry.
- View-only still holds: no download links or `download` attributes; store URLs appear only in `img src`, `data-files`, and `data-game-textures`. Script file names are the one permitted visible file name (in the script tab list).
- Team colours: SD models 0–15 (`.blp`), HD models 0–27 (`.dds`). A model is HD when its version is above 800 and any material names a shader.
- Every `localStorage` access is wrapped in try/catch.
- Stop a running dev server (`deno run -A npm:astro dev stop`) before `deno task check`/`build`.
- Commit messages end with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/game-textures.ts` | Pure game-path normalisation, manifest lookups, team sets, per-model needs (shared by Astro, Deno, browser) |
| `src/data/game-textures.json` | Committed manifest: `"<sd\|hd>:<path>"` → store key |
| `scripts/resources/manifest.ts` | Read/write the manifest file (Deno) |
| `scripts/resources/game-sync.ts` | `game:sync` command |
| `scripts/resources/fixture-store.ts` | Writes real sample files for the fixtures into `.asset-store/` |
| `src/scripts/previewers/index.ts` | Entry: pick, mount, dispose, retry |
| `src/scripts/previewers/files.ts` | `data-files` parsing, type → previewer kind, script languages |
| `src/scripts/previewers/cjs.ts` | CommonJS interop helpers (Vite and Deno shape modules differently) |
| `src/scripts/previewers/ui.ts` | DOM helpers: element builder, controls, messages, go-live |
| `src/scripts/previewers/decode.ts` + `image-view.ts` + `image.ts` | Image previewer |
| `src/scripts/previewers/waveform.ts` + `audio.ts` | Audio previewer |
| `src/scripts/previewers/script.ts` | Script previewer |
| `src/scripts/previewers/textures.ts` + `model-info.ts` + `orbit.ts` + `model.ts` | Model previewer |
| `scripts/previewers/*_test.ts` | Unit tests for the pure previewer modules |

---

### Task 1: Game-texture core, model metadata, and intake warnings

**Files:**
- Create: `src/lib/game-textures.ts`, `src/data/game-textures.json`, `scripts/resources/manifest.ts`, `scripts/resources/game_textures_test.ts`
- Modify: `scripts/resources/model-meta.ts`, `scripts/resources/testdata.ts`, `scripts/resources/parsers_test.ts`, `src/lib/resource-schema.ts`, `scripts/resources/add.ts`, `scripts/resources/add_test.ts`, `scripts/resources/check.ts`, `scripts/resources/check_test.ts`

**Interfaces:**
- Produces (`src/lib/game-textures.ts`): `type TextureSet = 'sd' | 'hd'`, `type GameTextureMap = Record<string, string>`, `TEAM_COLOR_COUNTS`, `normalizeGamePath(path)`, `manifestEntry(set, path)`, `baseName(path)`, `lookupGameTexture(map, path, preferHd)`, `teamTexturePaths(set)`, `isTeamTexture(path)`, `interface ModelTextureRefs { textures; replaceables; ownFiles }`, `modelGamePaths(refs)`, `manifestSubset(manifest, refs)`, `unhostedGameTextures(manifest, refs)`.
- Produces (`scripts/resources/manifest.ts`): `DEFAULT_MANIFEST`, `readManifest(path?)`, `writeManifest(path, map)`.
- Produces: `ModelMeta.replaceables: string[]`; model schema field `replaceables` (default `[]`); `CONTENT_TYPES` exported from `add.ts`; `AddOptions.manifestPath?`; `gameTextureWarnings(root, manifest)` exported from `check.ts`; `makeMdx(animations?, textures?, replaceableIds?)`.

- [ ] **Step 1: Write the failing tests**

`scripts/resources/game_textures_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import {
  isTeamTexture, lookupGameTexture, manifestEntry, manifestSubset, modelGamePaths, normalizeGamePath, teamTexturePaths, unhostedGameTextures,
} from '../../src/lib/game-textures.ts';

Deno.test('game paths normalise to lowercase with forward slashes', () => {
  assert.equal(normalizeGamePath('Textures\\Footman.BLP'), 'textures/footman.blp');
  assert.equal(normalizeGamePath('\\Units/Human\\Footman.blp'), 'units/human/footman.blp');
  assert.equal(manifestEntry('hd', 'Textures\\A.dds'), 'hd:textures/a.dds');
});

Deno.test('lookups prefer HD only when asked, then fall back to SD', () => {
  const map = { 'sd:textures/a.blp': 'sd-key', 'hd:textures/a.blp': 'hd-key', 'sd:textures/b.blp': 'b-key' };
  assert.equal(lookupGameTexture(map, 'Textures\\A.blp', true), 'hd-key');
  assert.equal(lookupGameTexture(map, 'Textures\\A.blp', false), 'sd-key');
  assert.equal(lookupGameTexture(map, 'textures/b.blp', true), 'b-key');
  assert.equal(lookupGameTexture(map, 'textures/c.blp', true), undefined);
});

Deno.test('team texture sets match what the viewer requests', () => {
  const sd = teamTexturePaths('sd');
  const hd = teamTexturePaths('hd');
  assert.equal(sd.length, 32);
  assert.equal(hd.length, 56);
  assert.equal(sd[0], 'ReplaceableTextures\\TeamColor\\TeamColor00.blp');
  assert.equal(sd[1], 'ReplaceableTextures\\TeamGlow\\TeamGlow00.blp');
  assert.equal(hd.at(-1), 'ReplaceableTextures\\TeamGlow\\TeamGlow27.dds');
  assert(isTeamTexture(sd[5]));
  assert(isTeamTexture('ReplaceableTextures\\TeamColor/TeamColor00.blp'));
  assert(!isTeamTexture('ReplaceableTextures\\Cliff\\Cliff0.blp'));
});

const refs = {
  textures: ['Textures\\Footman.blp', 'Units\\Human\\Footman\\Footman.blp', 'Textures\\gutz.blp'],
  replaceables: ['ReplaceableTextures\\Cliff\\Cliff0'],
  ownFiles: ['Footman.blp'],
};

Deno.test('a model needs its non-own textures and both extensions of its replaceables', () => {
  assert.deepEqual(modelGamePaths(refs), ['Textures\\gutz.blp', 'ReplaceableTextures\\Cliff\\Cliff0.blp', 'ReplaceableTextures\\Cliff\\Cliff0.dds']);
});

Deno.test('a page gets only the manifest entries its model can use', () => {
  const manifest = {
    'sd:textures/gutz.blp': 'k1',
    'sd:textures/other.blp': 'k2',
    'hd:replaceabletextures/cliff/cliff0.dds': 'k3',
    'sd:replaceabletextures/teamcolor/teamcolor00.blp': 'k4',
  };
  assert.deepEqual(manifestSubset(manifest, refs), {
    'sd:textures/gutz.blp': 'k1',
    'hd:replaceabletextures/cliff/cliff0.dds': 'k3',
    'sd:replaceabletextures/teamcolor/teamcolor00.blp': 'k4',
  });
});

Deno.test('unhosted game textures are reported once per texture', () => {
  assert.deepEqual(unhostedGameTextures({}, refs), ['Textures\\gutz.blp', 'ReplaceableTextures\\Cliff\\Cliff0']);
  assert.deepEqual(unhostedGameTextures({ 'sd:textures/gutz.blp': 'k', 'hd:replaceabletextures/cliff/cliff0.dds': 'k' }, refs), []);
});
```

Append to `scripts/resources/parsers_test.ts`:

```ts
Deno.test('readModelMeta lists replaceable textures other than team colour and glow', () => {
  const meta = readModelMeta(makeMdx(['Stand'], ['Textures\\A.blp'], [1, 2, 11, 31]));
  assert.deepEqual(meta.replaceables, ['ReplaceableTextures\\Cliff\\Cliff0', 'ReplaceableTextures\\LordaeronTree\\LordaeronSummerTree']);
  assert.deepEqual(meta.textures, ['Textures\\A.blp']);
});
```

Append to `scripts/resources/add_test.ts` (it already defines `workspace`, `folder`, `hosted`, and imports `addResource`, `localStore`, `makeMdx`, `join`):

```ts
Deno.test('warns about game textures a new model needs that are not hosted yet', async () => {
  const ws = await workspace();
  const dir = await folder(ws.root, 'test-gutz', { type: 'model', title: 'Gutz', summary: 'A test.', kind: 'unit', ...hosted }, {
    'Gutz.mdx': makeMdx(['Stand'], ['Textures\\gutz.blp'], [11]),
  });
  const manifestPath = join(ws.root, 'game-textures.json');
  const { resource, warnings } = await addResource({ folder: dir, contentRoot: ws.content, store: localStore(ws.store), today: '2026-09-23', manifestPath });
  assert(resource.type === 'model');
  assert.deepEqual(resource.replaceables, ['ReplaceableTextures\\Cliff\\Cliff0']);
  assert(warnings.some((warning) => /2 game textures are not hosted yet: Textures\\gutz\.blp, ReplaceableTextures\\Cliff\\Cliff0\. Run deno task game:sync\./.test(warning)), warnings.join('\n'));

  await Deno.writeTextFile(manifestPath, JSON.stringify({ 'sd:textures/gutz.blp': 'k', 'sd:replaceabletextures/cliff/cliff0.blp': 'k' }));
  const again = await addResource({ folder: dir, contentRoot: ws.content, store: localStore(ws.store), today: '2026-09-23', manifestPath, update: true });
  assert(!again.warnings.some((warning) => warning.includes('game texture')), again.warnings.join('\n'));
});
```

Append to `scripts/resources/check_test.ts` (it already has `tree` and imports `checkResources`); add `gameTextureWarnings` to the import from `./check.ts`:

```ts
Deno.test('game texture warnings name models with unhosted game textures', async () => {
  const model = {
    type: 'model', title: 'Gutz', summary: 'A test.', authors: [{ name: 'Tester' }],
    source: { site: 'hive', url: 'https://www.hiveworkshop.com/threads/gutz.1/' },
    compat: { sd: true, hd: false }, kind: 'unit',
    textures: ['Textures\\Gutz.blp', 'Textures\\Own.blp'], replaceables: [],
    files: [
      { key: 'resources/model/gutz/0123456789ab/Gutz.mdx', role: 'model', format: 'mdx', bytes: 10 },
      { key: 'resources/model/gutz/1123456789ab/Own.blp', role: 'texture', format: 'blp', bytes: 10 },
    ],
    added: '2026-09-23',
  };
  const root = await tree({ 'model/gutz.json': model });
  assert.deepEqual(await gameTextureWarnings(root, {}), ['model/gutz.json: 1 game texture not hosted (run deno task game:sync): Textures\\Gutz.blp']);
  assert.deepEqual(await gameTextureWarnings(root, { 'sd:textures/gutz.blp': 'k' }), []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `deno test -A scripts/resources/game_textures_test.ts scripts/resources/parsers_test.ts`
Expected: FAIL — `src/lib/game-textures.ts` not found; `makeMdx` has no replaceable parameter.

- [ ] **Step 3: Implement the game-texture core**

`src/lib/game-textures.ts`:

```ts
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
```

`src/data/game-textures.json`:

```json
{}
```

`scripts/resources/manifest.ts`:

```ts
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

/** Writes entries in sorted order so manifest diffs stay readable. */
export async function writeManifest(path: string, map: GameTextureMap): Promise<void> {
  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
  await Deno.writeTextFile(path, JSON.stringify(sorted, null, 2) + '\n');
}
```

- [ ] **Step 4: Record replaceable textures in model metadata**

In `scripts/resources/testdata.ts`, give `model()` a third parameter and pass it through:

```ts
function model(animations: string[], textures: string[], replaceableIds: number[] = []) {
```

and after the existing `for (const path of textures) { … }` loop add:

```ts
  for (const replaceableId of replaceableIds) {
    const texture = new Texture();
    texture.replaceableId = replaceableId;
    result.textures.push(texture);
  }
```

Change `makeMdx` to:

```ts
export const makeMdx = (animations = ['Stand', 'Walk'], textures = ['Textures\\Footman.blp'], replaceableIds: number[] = []): Uint8Array =>
  model(animations, textures, replaceableIds).saveMdx();
```

Replace `scripts/resources/model-meta.ts` with:

```ts
import ModelModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/model.js';
import ReplaceableIdsModule from 'mdx-m3-viewer-th/dist/cjs/viewer/handlers/mdx/replaceableids.js';

// This library publishes CommonJS modules with exports.default; Deno's default import is that exports object.
const Model = ModelModule.default;
/** The viewer's own replaceable-ID table, e.g. 11 → "Cliff/Cliff0". */
const REPLACEABLE_IDS = ReplaceableIdsModule.default as Record<number, string>;
// Team colour (1) and glow (2) come from the shared team colour sets.
const TEAM_IDS = new Set([1, 2]);

export interface ModelMeta { animations: string[]; textures: string[]; replaceables: string[] }

/** Reads sequence names, texture paths, and replaceable textures from MDX bytes or MDL text. Throws if the parser rejects the file. */
export function readModelMeta(source: Uint8Array | string): ModelMeta {
  const model = new Model();
  // The parser reads from offset 0 of the underlying buffer, so hand it an exact copy.
  model.load(typeof source === 'string' ? source : source.slice());
  const replaceables = model.textures
    .filter((texture) => !texture.path && !TEAM_IDS.has(texture.replaceableId) && REPLACEABLE_IDS[texture.replaceableId])
    .map((texture) => `ReplaceableTextures\\${REPLACEABLE_IDS[texture.replaceableId].replaceAll('/', '\\')}`);
  return {
    animations: model.sequences.map((sequence) => sequence.name).filter(Boolean),
    textures: [...new Set(model.textures.map((texture) => texture.path).filter(Boolean))],
    replaceables: [...new Set(replaceables)],
  };
}
```

In `src/lib/resource-schema.ts`, change the model line of `resourceSchema` to add the field:

```ts
  modelAuthored.extend({ ...generated, animations: z.array(z.string()).default([]), textures: z.array(z.string()).default([]), replaceables: z.array(z.string()).default([]) }),
```

- [ ] **Step 5: Warn at intake and in `resource:check`**

In `scripts/resources/add.ts`:
- Add imports: `import { unhostedGameTextures } from '../../src/lib/game-textures.ts';` and `import { DEFAULT_MANIFEST, readManifest } from './manifest.ts';`.
- Export the content-type table: change `const CONTENT_TYPES` to `export const CONTENT_TYPES`.
- Add to `AddOptions`:

```ts
  /** The game-texture manifest used to warn about unhosted game textures. Defaults to the repo manifest. */
  manifestPath?: string;
```

- Change the `meta` declaration to `let meta: { animations: string[]; textures: string[]; replaceables: string[] } | undefined;`.
- Directly after the line `if (!plannedPreview && type !== 'audio' && type !== 'script') warnings.push(…);` add:

```ts
  if (type === 'model' && meta) {
    const unhosted = unhostedGameTextures(await readManifest(options.manifestPath ?? DEFAULT_MANIFEST), {
      textures: meta.textures,
      replaceables: meta.replaceables,
      ownFiles: names,
    });
    if (unhosted.length) {
      const noun = unhosted.length === 1 ? 'game texture is' : 'game textures are';
      warnings.push(`${unhosted.length} ${noun} not hosted yet: ${unhosted.join(', ')}. Run deno task game:sync.`);
    }
  }
```

- Change the model fallback in the `resourceSchema.parse({ … })` call to `...(type === 'model' ? meta ?? { animations: [], textures: [], replaceables: [] } : {}),`.

In `scripts/resources/check.ts`:
- Add imports: `import { unhostedGameTextures, type GameTextureMap } from '../../src/lib/game-textures.ts';` and `import { readManifest } from './manifest.ts';`.
- Add the exported function (after `checkResources`):

```ts
/** Models whose game textures are not hosted yet. Warnings only: a model still renders, with stand-in textures. */
export async function gameTextureWarnings(root: string, manifest: GameTextureMap): Promise<string[]> {
  const warnings: string[] = [];
  for await (const path of jsonFiles(root)) {
    let data;
    try {
      data = resourceSchema.parse(JSON.parse(await Deno.readTextFile(path)));
    } catch {
      continue; // checkResources reports invalid files.
    }
    if (data.type !== 'model') continue;
    const unhosted = unhostedGameTextures(manifest, {
      textures: data.textures,
      replaceables: data.replaceables,
      ownFiles: data.files.map((file) => file.key.split('/').at(-1) ?? ''),
    });
    if (unhosted.length) {
      const file = relative(root, path).replaceAll('\\', '/');
      warnings.push(`${file}: ${unhosted.length} game ${unhosted.length === 1 ? 'texture' : 'textures'} not hosted (run deno task game:sync): ${unhosted.join(', ')}`);
    }
  }
  return warnings;
}
```

- In the CLI block, right after `for (const error of errors) console.error(error);`, add:

```ts
  // Test fixtures reference textures that are deliberately never hosted.
  const warnings = (await gameTextureWarnings('src/content/resources', await readManifest())).filter((warning) => !warning.startsWith('_fixtures/'));
  for (const warning of warnings) console.warn(`warning: ${warning}`);
```

- [ ] **Step 6: Run the tests**

Run: `deno task test:unit` then `deno task check`
Expected: all unit tests PASS (existing add tests still report no warnings because their models ship their own texture); `astro check` 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game-textures.ts src/data/game-textures.json src/lib/resource-schema.ts scripts/resources
git commit -m "Track game textures models need and warn when they are not hosted"
```

---

### Task 2: `game:sync`

**Files:**
- Create: `scripts/resources/game-sync.ts`, `scripts/resources/game_sync_test.ts`
- Modify: `deno.json`

**Interfaces:**
- Consumes: Task 1's `src/lib/game-textures.ts`, `manifest.ts`; `resourceSchema`; `sha256Hex` (keys.ts); `AssetStore`, `localStore`, `dryRunStore`, `s3StoreFromEnv` (store.ts).
- Produces: `indexGameRoot(root)`, `neededGamePaths(models, sets?)`, `planGameSync(needed, indexes)`, `gameKey(set, hashHex, path)`, `syncGameTextures(options): Promise<SyncResult>`; task `game:sync`.

- [ ] **Step 1: Write the failing tests**

`scripts/resources/game_sync_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { dirname, join } from 'jsr:@std/path@^1';
import { gameKey, indexGameRoot, neededGamePaths, planGameSync, syncGameTextures } from './game-sync.ts';
import { dryRunStore, localStore } from './store.ts';

async function write(path: string, text: string) {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, text);
}

const modelJson = (textures: string[], replaceables: string[] = []) => ({
  type: 'model', title: 'Gutz', summary: 'A test.', authors: [{ name: 'Tester' }],
  source: { site: 'hive', url: 'https://www.hiveworkshop.com/threads/gutz.1/' },
  compat: { sd: true, hd: false }, kind: 'unit', textures, replaceables,
  files: [{ key: 'resources/model/gutz/0123456789ab/Gutz.mdx', role: 'model', format: 'mdx', bytes: 10 }],
  added: '2026-09-23',
});

async function workspace() {
  const root = await Deno.makeTempDir({ prefix: 'wc3-game-' });
  const sd = join(root, 'war3.w3mod');
  const hd = join(root, 'war3.w3mod', '_hd.w3mod');
  await write(join(sd, 'Textures', 'Gutz.blp'), 'gutz-sd');
  await write(join(sd, 'ReplaceableTextures', 'TeamColor', 'TeamColor00.blp'), 'red');
  await write(join(hd, 'ReplaceableTextures', 'Cliff', 'Cliff0.dds'), 'cliff-hd');
  const content = join(root, 'content');
  await write(join(content, 'model', 'gutz.json'), JSON.stringify(modelJson(['Textures\\gutz.blp', 'Textures\\Nowhere.blp'], ['ReplaceableTextures\\Cliff\\Cliff0'])));
  return { root, sd, hd, content, store: join(root, 'store'), manifest: join(root, 'game-textures.json') };
}

Deno.test('indexGameRoot maps normalised relative paths to files', async () => {
  const ws = await workspace();
  const index = await indexGameRoot(ws.sd);
  assert.equal(index.get('textures/gutz.blp'), join(ws.sd, 'Textures', 'Gutz.blp'));
  assert.equal(index.get('replaceabletextures/teamcolor/teamcolor00.blp'), join(ws.sd, 'ReplaceableTextures', 'TeamColor', 'TeamColor00.blp'));
});

Deno.test('neededGamePaths adds the team sets only for the sets being synced', () => {
  const models = [{ textures: ['Textures\\a.blp'], replaceables: [], ownFiles: [] }];
  assert.equal(neededGamePaths(models, ['sd']).length, 1 + 32);
  assert.equal(neededGamePaths(models, ['sd', 'hd']).length, 1 + 32 + 56);
});

Deno.test('planGameSync finds files per set and reports only textures found nowhere', () => {
  const sd = new Map([['textures/a.blp', '/sd/a.blp'], ['replaceabletextures/cliff/cliff0.blp', '/sd/cliff.blp']]);
  const hd = new Map([['textures/a.blp', '/hd/a.blp']]);
  const plan = planGameSync(['Textures\\A.blp', 'ReplaceableTextures\\Cliff\\Cliff0.blp', 'ReplaceableTextures\\Cliff\\Cliff0.dds', 'Textures\\Gone.blp'], { sd, hd });
  assert.deepEqual(plan.items.map((item) => item.entry), ['sd:textures/a.blp', 'hd:textures/a.blp', 'sd:replaceabletextures/cliff/cliff0.blp']);
  assert.deepEqual(plan.missing, ['Textures\\Gone.blp']);
});

Deno.test('gameKey is content-addressed under the set', () => {
  assert.equal(gameKey('hd', 'ba7816bf8f01cfea41', 'ReplaceableTextures\\Cliff\\Cliff0.dds'), 'game/hd/ba7816bf8f01/replaceabletextures/cliff/cliff0.dds');
});

Deno.test('syncGameTextures uploads needed files, writes the manifest, and is idempotent', async () => {
  const ws = await workspace();
  const options = { contentRoot: ws.content, roots: { sd: ws.sd, hd: ws.hd }, store: localStore(ws.store), manifestPath: ws.manifest };
  const first = await syncGameTextures(options);
  assert.deepEqual(first.uploaded.sort(), ['hd:replaceabletextures/cliff/cliff0.dds', 'sd:replaceabletextures/teamcolor/teamcolor00.blp', 'sd:textures/gutz.blp']);
  assert(first.missing.includes('Textures\\Nowhere.blp'));
  const manifest = JSON.parse(await Deno.readTextFile(ws.manifest));
  assert.match(manifest['sd:textures/gutz.blp'], /^game\/sd\/[0-9a-f]{12}\/textures\/gutz\.blp$/);
  assert((await Deno.stat(join(ws.store, ...manifest['sd:textures/gutz.blp'].split('/')))).isFile);

  const second = await syncGameTextures(options);
  assert.deepEqual(second.uploaded, []);
  assert.equal(second.unchanged.length, 3);
});

Deno.test('syncGameTextures drops unused entries of synced sets and keeps other sets', async () => {
  const ws = await workspace();
  await Deno.writeTextFile(ws.manifest, JSON.stringify({
    'sd:textures/old.blp': 'game/sd/000000000000/textures/old.blp',
    'hd:textures/kept.dds': 'game/hd/000000000000/textures/kept.dds',
  }));
  const result = await syncGameTextures({ contentRoot: ws.content, roots: { sd: ws.sd }, store: localStore(ws.store), manifestPath: ws.manifest });
  assert.deepEqual(result.dropped, ['sd:textures/old.blp']);
  const manifest = JSON.parse(await Deno.readTextFile(ws.manifest));
  assert.equal(manifest['hd:textures/kept.dds'], 'game/hd/000000000000/textures/kept.dds');
  assert.equal(manifest['sd:textures/old.blp'], undefined);
});

Deno.test('a dry run writes no manifest', async () => {
  const ws = await workspace();
  const logged: string[] = [];
  await syncGameTextures({ contentRoot: ws.content, roots: { sd: ws.sd }, store: dryRunStore((line) => logged.push(line)), manifestPath: ws.manifest, write: false });
  assert(logged.length > 0);
  await assert.rejects(() => Deno.stat(ws.manifest));
});
```

Run: `deno test -A scripts/resources/game_sync_test.ts`
Expected: FAIL — `game-sync.ts` not found.

- [ ] **Step 2: Implement `game-sync.ts`**

```ts
import { join, relative } from 'jsr:@std/path@^1';
import {
  type GameTextureMap, manifestEntry, type ModelTextureRefs, modelGamePaths, normalizeGamePath, teamTexturePaths, type TextureSet,
} from '../../src/lib/game-textures.ts';
import { resourceSchema } from '../../src/lib/resource-schema.ts';
import { sha256Hex } from './keys.ts';
import { DEFAULT_MANIFEST, readManifest, writeManifest } from './manifest.ts';
import { type AssetStore, dryRunStore, localStore, s3StoreFromEnv } from './store.ts';

const GAME_CONTENT_TYPES: Record<string, string> = { blp: 'application/octet-stream', dds: 'image/vnd-ms.dds', tga: 'image/x-tga' };

/** Maps normalised relative paths to files under an extracted game folder. */
export async function indexGameRoot(root: string): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  const walk = async (dir: string): Promise<void> => {
    for await (const entry of Deno.readDir(dir)) {
      const path = join(dir, entry.name);
      if (entry.isDirectory) await walk(path);
      else if (entry.isFile) index.set(normalizeGamePath(relative(root, path)), path);
    }
  };
  await walk(root);
  return index;
}

/** Every game path the catalog's models may request, plus the team colour sets for the sets being synced. */
export function neededGamePaths(models: ModelTextureRefs[], sets: TextureSet[] = ['sd', 'hd']): string[] {
  const paths = new Set<string>(sets.flatMap(teamTexturePaths));
  for (const refs of models) for (const path of modelGamePaths(refs)) paths.add(path);
  return [...paths];
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

export interface SyncResult { manifest: GameTextureMap; uploaded: string[]; unchanged: string[]; missing: string[]; dropped: string[] }

/** Uploads the game textures the catalog needs and rewrites the manifest. Entries for sets not being synced are kept. */
export async function syncGameTextures(options: SyncOptions): Promise<SyncResult> {
  const { contentRoot, roots, store, manifestPath, write = true } = options;
  const sets = (['sd', 'hd'] as const).filter((set) => roots[set]);
  if (!sets.length) throw new Error('Pass --sd and/or --hd with folders extracted from the game.');
  const indexes: Partial<Record<TextureSet, Map<string, string>>> = {};
  for (const set of sets) indexes[set] = await indexGameRoot(roots[set]!);

  const plan = planGameSync(neededGamePaths(await readModelRefs(join(contentRoot, 'model')), sets), indexes);
  const previous = await readManifest(manifestPath);
  const synced = (entry: string) => sets.some((set) => entry.startsWith(`${set}:`));
  const manifest: GameTextureMap = Object.fromEntries(Object.entries(previous).filter(([entry]) => !synced(entry)));
  const uploaded: string[] = [];
  const unchanged: string[] = [];

  for (const item of plan.items) {
    const bytes = await Deno.readFile(item.file);
    const key = gameKey(item.set, await sha256Hex(bytes), item.path);
    manifest[item.entry] = key;
    if (previous[item.entry] === key) {
      unchanged.push(item.entry);
      continue;
    }
    const extension = item.path.split('.').pop()?.toLowerCase() ?? '';
    await store.put(key, bytes, GAME_CONTENT_TYPES[extension] ?? 'application/octet-stream');
    uploaded.push(item.entry);
  }

  const dropped = Object.keys(previous).filter((entry) => synced(entry) && !(entry in manifest));
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
    console.log(`${result.uploaded.length} uploaded, ${result.unchanged.length} unchanged${dryRun ? ' (dry run; manifest not written).' : `; wrote ${DEFAULT_MANIFEST}.`}`);
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}
```

In `deno.json` tasks add: `"game:sync": "deno run -A scripts/resources/game-sync.ts",`

- [ ] **Step 3: Run the tests**

Run: `deno test -A scripts/resources/game_sync_test.ts` then `deno task test:unit`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add scripts/resources deno.json deno.lock
git commit -m "Add the game:sync command for hosting the game textures models need"
```

---

### Task 3: Previewer framework and page markup

**Files:**
- Create: `src/scripts/previewers/files.ts`, `src/scripts/previewers/cjs.ts`, `src/scripts/previewers/ui.ts`, `src/scripts/previewers/index.ts`, `scripts/previewers/files_test.ts`
- Modify: `src/pages/resources/[type]/[slug].astro`, `src/styles/resources.css`, `scripts/site_test.ts`

**Interfaces:**
- Consumes: `manifestSubset`, `GameTextureMap` (Task 1); `assetUrl` (existing).
- Produces:
  - `files.ts`: `interface PreviewFile { role; format; url; name }`, `type PreviewKind = 'model' | 'image' | 'audio' | 'script'`, `PREVIEW_KINDS: Record<string, PreviewKind>`, `parsePreviewFiles(raw)`, `fileName(url)`, `scriptLanguage(format)`.
  - `cjs.ts`: `cjsDefault<T>(module, accept?)`, `isHandler(value)`, `cjsNamed<T>(module, name)`.
  - `ui.ts`: `reason(error)`, `h(tag, attributes?, ...children)`, `showMessage(preview, text, retry?)`, `goLive(preview, stage)`, `toolbar(...children)`, `toolButton(label, text, onClick)`, `pressedButton(label, text, onToggle, pressed?)`, `labelledSelect(label, options, value, onChange)`, `fetchBytes(url)`.
  - `index.ts`: `LOADERS` map; later tasks add one line each. Previewer module contract: `export async function mount(preview: HTMLElement, files: PreviewFile[]): Promise<() => void>`.
  - Markup: `#resource-preview` contains `.preview-fallback` and `p.preview-message[hidden]`; model pages add `data-game-textures`.

- [ ] **Step 1: Write the failing tests**

`scripts/previewers/files_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { cjsDefault, cjsNamed, isHandler } from '../../src/scripts/previewers/cjs.ts';
import { fileName, parsePreviewFiles, PREVIEW_KINDS, scriptLanguage } from '../../src/scripts/previewers/files.ts';

Deno.test('parsePreviewFiles reads data-files and derives file names from URLs', () => {
  const raw = JSON.stringify([
    { role: 'model', format: 'mdx', url: 'https://assets.example.test/resources/model/a/0123456789ab/Foot%20man.mdx' },
    { role: 'texture', format: 'blp', url: 'https://assets.example.test/resources/model/a/1123456789ab/Footman.blp' },
    { role: 'broken' },
  ]);
  assert.deepEqual(parsePreviewFiles(raw).map((file) => [file.role, file.name]), [['model', 'Foot man.mdx'], ['texture', 'Footman.blp']]);
  assert.deepEqual(parsePreviewFiles(undefined), []);
  assert.deepEqual(parsePreviewFiles('{not json'), []);
  assert.deepEqual(parsePreviewFiles('{"role":"model"}'), []);
  assert.equal(fileName('https://x.test/a/b/c.lua?v=1'), 'c.lua');
});

Deno.test('resource types map to previewer kinds, and script formats to Shiki languages', () => {
  assert.equal(PREVIEW_KINDS.model, 'model');
  assert.equal(PREVIEW_KINDS.icon, 'image');
  assert.equal(PREVIEW_KINDS.texture, 'image');
  assert.equal(PREVIEW_KINDS.audio, 'audio');
  assert.equal(PREVIEW_KINDS.script, 'script');
  assert.equal(PREVIEW_KINDS.link, undefined);
  assert.equal(scriptLanguage('jass'), 'jass');
  assert.equal(scriptLanguage('lua'), 'lua');
  assert.equal(scriptLanguage('ts'), 'typescript');
});

Deno.test('CommonJS helpers unwrap default and named exports in either module shape', () => {
  class Viewer {}
  const handler = { isValidSource: () => true };
  assert.equal(cjsDefault(Viewer), Viewer);
  assert.equal(cjsDefault({ default: Viewer }), Viewer);
  assert.equal(cjsDefault({ default: { default: Viewer } }), Viewer);
  assert.equal(cjsDefault({ default: handler }, isHandler), handler);
  assert.equal(cjsDefault(handler, isHandler), handler);
  assert.throws(() => cjsDefault({ default: 1 }));
  assert.equal(cjsNamed({ BlpImage: Viewer }, 'BlpImage'), Viewer);
  assert.equal(cjsNamed({ default: { BlpImage: Viewer } }, 'BlpImage'), Viewer);
  assert.throws(() => cjsNamed({}, 'BlpImage'));
});
```

Append to `scripts/site_test.ts`:

```ts
Deno.test('resource previews keep a static fallback and model pages carry their game textures', async () => {
  for (const route of ['models/fixture-footman', 'icons/fixture-sword-icon', 'textures/fixture-grass-tile', 'audio/fixture-horn', 'scripts/fixture-damage-lib']) {
    const html = await Deno.readTextFile(new URL(`resources/${route}/index.html`, root));
    assert.match(html, /class="preview-fallback"/, `Missing static fallback on ${route}`);
    assert.match(html, /<p class="preview-message" role="status" hidden/, `Missing message slot on ${route}`);
    assert.equal(/data-game-textures=/.test(html), route.startsWith('models/'), `data-game-textures only on model pages (${route})`);
  }
});
```

In `deno.json`, extend `test:unit` so the previewer tests run with the rest:

```json
    "test:unit": "deno test -A scripts/shell_test.ts scripts/resources/ scripts/previewers/",
```

Run: `deno test -A scripts/previewers/files_test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 2: Implement the pure modules**

`src/scripts/previewers/files.ts`:

```ts
/** One stored file a previewer may load, from the page's `data-files`. */
export interface PreviewFile { role: string; format: string; url: string; name: string }

export type PreviewKind = 'model' | 'image' | 'audio' | 'script';

/** Which previewer handles each resource type; links have none. */
export const PREVIEW_KINDS: Record<string, PreviewKind> = { model: 'model', icon: 'image', texture: 'image', audio: 'audio', script: 'script' };

/** The decoded last path segment of a URL, e.g. the stored file's original name. */
export function fileName(url: string): string {
  try {
    return decodeURIComponent(new URL(url, 'https://wc3.dev/').pathname.split('/').pop() ?? '');
  } catch {
    return '';
  }
}

export function parsePreviewFiles(raw: string | undefined): PreviewFile[] {
  try {
    const value = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    return value
      .filter((file) => typeof file?.role === 'string' && typeof file?.format === 'string' && typeof file?.url === 'string')
      .map((file) => ({ role: file.role, format: file.format, url: file.url, name: fileName(file.url) }));
  } catch {
    return [];
  }
}

const SCRIPT_LANGUAGES: Record<string, string> = { jass: 'jass', lua: 'lua', ts: 'typescript' };
export const scriptLanguage = (format: string): string => SCRIPT_LANGUAGES[format] ?? 'lua';
```

`src/scripts/previewers/cjs.ts`:

```ts
// mdx-m3-viewer ships CommonJS; Vite and Deno expose its exports with different nesting.

/** Unwraps `default` until `accept` matches (a class by default). */
export function cjsDefault<T>(module: unknown, accept: (value: unknown) => boolean = (value) => typeof value === 'function'): T {
  let current: unknown = module;
  for (let depth = 0; depth < 3 && current != null; depth++) {
    if (accept(current)) return current as T;
    current = (current as { default?: unknown }).default;
  }
  throw new Error('Unexpected module shape.');
}

export const isHandler = (value: unknown): boolean => typeof (value as { isValidSource?: unknown } | null)?.isValidSource === 'function';

/** A named CommonJS export, looked up on the module and its `default` wrappers. */
export function cjsNamed<T>(module: unknown, name: string): T {
  let current: unknown = module;
  for (let depth = 0; depth < 3 && current != null; depth++) {
    const value = (current as Record<string, unknown>)[name];
    if (value !== undefined) return value as T;
    current = (current as { default?: unknown }).default;
  }
  throw new Error(`The module does not export ${name}.`);
}
```

Run: `deno test -A scripts/previewers/files_test.ts`
Expected: PASS.

- [ ] **Step 3: Add the DOM helpers and the entry**

`src/scripts/previewers/ui.ts`:

```ts
export const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Small element builder: h('button', { type: 'button' }, 'Play'). `true` sets a boolean attribute; false/undefined skip it. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | boolean | undefined> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === true) element.setAttribute(name, '');
    else if (typeof value === 'string') element.setAttribute(name, value);
  }
  element.append(...children);
  return element;
}

/** Shows a one-line status in the preview area, with an optional Retry button. */
export function showMessage(preview: HTMLElement, text: string, retry?: () => void): void {
  const message = preview.querySelector<HTMLElement>('.preview-message');
  if (!message) return;
  message.replaceChildren(text);
  if (retry) {
    const button = h('button', { type: 'button', class: 'preview-button preview-retry' }, 'Retry');
    button.addEventListener('click', () => {
      message.hidden = true;
      retry();
    });
    message.append(' ', button);
  }
  message.hidden = false;
}

/** Swaps the static fallback for a ready previewer. */
export function goLive(preview: HTMLElement, stage: HTMLElement): void {
  preview.querySelector('.preview-stage')?.remove();
  const message = preview.querySelector<HTMLElement>('.preview-message');
  if (message) message.hidden = true;
  preview.append(stage);
  preview.classList.add('is-live');
}

export const toolbar = (...children: (Node | string)[]): HTMLDivElement => h('div', { class: 'preview-toolbar' }, ...children);

export function toolButton(label: string, text: string, onClick: () => void): HTMLButtonElement {
  const button = h('button', { type: 'button', class: 'preview-button', title: label, 'aria-label': label }, text);
  button.addEventListener('click', onClick);
  return button;
}

/** A toggle button whose state is exposed through aria-pressed. */
export function pressedButton(label: string, text: string, onToggle: (pressed: boolean) => void, pressed = false): HTMLButtonElement {
  const button = h('button', { type: 'button', class: 'preview-button', title: label, 'aria-label': label, 'aria-pressed': String(pressed) }, text);
  button.addEventListener('click', () => {
    const next = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(next));
    onToggle(next);
  });
  return button;
}

export function labelledSelect(
  label: string,
  options: { value: string; text: string }[],
  value: string,
  onChange: (value: string) => void,
): HTMLLabelElement {
  const select = h('select', { class: 'preview-select' });
  for (const option of options) select.append(h('option', { value: option.value, selected: option.value === value }, option.text));
  select.addEventListener('change', () => onChange(select.value));
  return h('label', { class: 'preview-field' }, h('span', {}, label), select);
}

export async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`the file returned HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
```

`src/scripts/previewers/index.ts`:

```ts
import { parsePreviewFiles, type PreviewFile, PREVIEW_KINDS, type PreviewKind } from './files.ts';
import { reason, showMessage } from './ui.ts';

type Mount = (preview: HTMLElement, files: PreviewFile[]) => Promise<() => void>;

/** Previewers load on demand so each page downloads only the code its resource type needs. */
const LOADERS: Partial<Record<PreviewKind, () => Promise<{ mount: Mount }>>> = {
};

const LABELS: Record<PreviewKind, string> = { model: '3D preview', image: 'Image preview', audio: 'Audio preview', script: 'Source view' };

let dispose: (() => void) | undefined;
// Bumped on every navigation, so a previewer that finishes loading after the user left is disposed at once.
let generation = 0;

async function mountPreview(): Promise<void> {
  const preview = document.getElementById('resource-preview');
  const kind = preview ? PREVIEW_KINDS[preview.dataset.type ?? ''] : undefined;
  const load = kind ? LOADERS[kind] : undefined;
  if (!preview || !kind || !load) return;
  const current = ++generation;
  try {
    const { mount } = await load();
    const cleanup = await mount(preview, parsePreviewFiles(preview.dataset.files));
    if (current === generation) dispose = cleanup;
    else cleanup();
  } catch (error) {
    if (current === generation) showMessage(preview, `${LABELS[kind]} unavailable: ${reason(error)}`, () => void mountPreview());
  }
}

document.addEventListener('astro:page-load', () => void mountPreview());
document.addEventListener('astro:before-swap', () => {
  generation++;
  dispose?.();
  dispose = undefined;
});
```

- [ ] **Step 4: Update the detail page**

In `src/pages/resources/[type]/[slug].astro`:
- Add imports:

```ts
import gameTextureManifest from '../../../data/game-textures.json';
import { type GameTextureMap, manifestSubset } from '../../../lib/game-textures';
```

- After the `previewFiles` line add:

```ts
// Model pages embed only the hosted game textures their model can request, as URLs.
const gameTextures = data.type === 'model'
  ? Object.fromEntries(
    Object.entries(manifestSubset(gameTextureManifest as GameTextureMap, {
      textures: data.textures,
      replaceables: data.replaceables,
      ownFiles: data.files.map((file) => file.key.split('/').at(-1) ?? ''),
    })).map(([entry, key]) => [entry, assetUrl(key)]),
  )
  : undefined;
```

- Replace the `<section id="resource-preview" …>…</section>` element with:

```astro
    <section
      id="resource-preview"
      class="resource-preview"
      aria-label="Preview"
      data-type={data.type}
      data-files={JSON.stringify(previewFiles)}
      data-game-textures={gameTextures && JSON.stringify(gameTextures)}
    >
      <div class="preview-fallback">
        {data.preview
          ? <img src={assetUrl(data.preview.key)} width={data.preview.width} height={data.preview.height} alt={`Preview of ${data.title}`} />
          : <TypeIcon type={data.type} size={64} />}
      </div>
      <p class="preview-message" role="status" hidden></p>
    </section>
```

- Just before `</Shell>` add:

```astro
  <script>import '../../../scripts/previewers/index.ts';</script>
```

- [ ] **Step 5: Add the shared previewer styles**

In `src/styles/resources.css`, replace the two lines beginning `.resource-preview {` and `.resource-preview img {` with:

```css
.resource-preview { position: relative; aspect-ratio: 16 / 9; max-height: 60vh; overflow: hidden; border: 1px solid var(--line); border-radius: 3px; background: radial-gradient(circle at 50% 40%, #1f2e37, #0c151a); color: var(--muted); }
.preview-fallback { display: grid; place-items: center; width: 100%; height: 100%; }
.preview-fallback img { max-width: 100%; max-height: 100%; object-fit: contain; }
.preview-message { position: absolute; right: 10px; bottom: 10px; left: 10px; z-index: 2; margin: 0; padding: 8px 10px; border: 1px solid var(--line); border-radius: 3px; background: #101a20ee; color: var(--ink); font-size: .82rem; }
.preview-message .preview-retry { margin-left: 6px; }
.resource-preview.is-live { aspect-ratio: auto; max-height: none; overflow: visible; }
.resource-preview.is-live .preview-fallback { display: none; }
.preview-stage { display: grid; min-width: 0; }
.preview-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 8px 10px; border-top: 1px solid var(--line); background: #101a20; color: var(--muted); font-size: .8rem; }
.preview-button { min-height: 28px; padding: 0 10px; border: 1px solid var(--line); border-radius: 3px; background: #16232b; color: var(--ink); font: inherit; cursor: pointer; }
.preview-button:hover { border-color: #8c742c; }
.preview-button[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); }
.preview-button:focus-visible, .preview-select:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.preview-field { display: inline-flex; align-items: center; gap: 6px; }
.preview-select { min-height: 28px; padding: 0 6px; border: 1px solid var(--line); border-radius: 3px; background: #16232b; color: var(--ink); font: inherit; }
.preview-info { margin-left: auto; }
```

- [ ] **Step 6: Check, build, and test**

Run: `deno task check; deno task test; deno task build`
Expected: 0 errors; all tests PASS (no previewer is registered yet, so pages still show the fallback); production build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src scripts deno.json
git commit -m "Add the previewer entry, shared helpers, and preview markup"
```

---

### Task 4: Image previewer

**Files:**
- Create: `src/scripts/previewers/decode.ts`, `src/scripts/previewers/image-view.ts`, `src/scripts/previewers/image.ts`, `scripts/previewers/image_test.ts`
- Modify: `src/scripts/previewers/index.ts`, `src/styles/resources.css`

**Interfaces:**
- Consumes: `cjsDefault`, `cjsNamed` (Task 3); `PreviewFile`; `ui.ts` helpers.
- Produces: `decode.ts`: `type ImageFormat = 'blp' | 'dds' | 'tga'`, `interface DecodedImage { width; height; data: Uint8ClampedArray; mipmaps; label }`, `decodeImage(format, bytes, level?)`, `infoLine(image)`; `image-view.ts`: `ZOOMS`, `type Zoom`, `displaySize(image, viewport, zoom)`, `alphaOnly(data)`; `image.ts`: `mount`.

- [ ] **Step 1: Write the failing tests**

`scripts/previewers/image_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { decodeImage, infoLine } from '../../src/scripts/previewers/decode.ts';
import { alphaOnly, displaySize } from '../../src/scripts/previewers/image-view.ts';
import { makeBlp, makeDxt1Dds } from '../resources/testdata.ts';

/** A 2×1 uncompressed 32-bit TGA: a red pixel then a half-transparent green one. */
function makeTga(): Uint8Array {
  const bytes = new Uint8Array(18 + 8);
  bytes[2] = 2; // uncompressed true-colour
  bytes[12] = 2; // width
  bytes[14] = 1; // height
  bytes[16] = 32; // bits per pixel
  bytes[17] = 0x28; // top-left origin, 8 alpha bits
  bytes.set([0, 0, 255, 255, 0, 255, 0, 128], 18); // BGRA
  return bytes;
}

Deno.test('decodeImage decodes BLP1 with its format label', () => {
  const image = decodeImage('blp', makeBlp());
  assert.deepEqual([image.width, image.height, image.mipmaps], [2, 2, 1]);
  assert.deepEqual([...image.data.subarray(4, 8)], [0, 0, 255, 255]);
  assert.equal(infoLine(image), 'BLP1, 2×2, 1 mipmap');
});

Deno.test('decodeImage decodes DXT1 DDS', () => {
  const image = decodeImage('dds', makeDxt1Dds());
  assert.deepEqual([image.width, image.height], [4, 4]);
  assert(image.data[0] > 200 && image.data[1] === 0 && image.data[3] === 255);
  assert.equal(infoLine(image), 'DDS, 4×4, 1 mipmap');
});

Deno.test('decodeImage decodes TGA', () => {
  const image = decodeImage('tga', makeTga());
  assert.deepEqual([image.width, image.height], [2, 1]);
  assert.deepEqual([...image.data], [255, 0, 0, 255, 0, 255, 0, 128]);
});

Deno.test('decodeImage rejects data it cannot read', () => {
  assert.throws(() => decodeImage('dds', new Uint8Array(200)));
});

Deno.test('displaySize fits or scales, pixelating at 2× and above', () => {
  assert.deepEqual(displaySize({ width: 64, height: 64 }, { width: 640, height: 360 }, 'fit'), { width: 360, height: 360, pixelated: true });
  assert.deepEqual(displaySize({ width: 1024, height: 512 }, { width: 512, height: 512 }, 'fit'), { width: 512, height: 256, pixelated: false });
  assert.deepEqual(displaySize({ width: 64, height: 32 }, { width: 10, height: 10 }, '4'), { width: 256, height: 128, pixelated: true });
  assert.deepEqual(displaySize({ width: 64, height: 32 }, { width: 0, height: 0 }, 'fit'), { width: 1, height: 1, pixelated: false });
});

Deno.test('alphaOnly shows the alpha channel as opaque greyscale', () => {
  assert.deepEqual([...alphaOnly(new Uint8ClampedArray([10, 20, 30, 128, 1, 2, 3, 0]))], [128, 128, 128, 255, 0, 0, 0, 255]);
});
```

Run: `deno test -A scripts/previewers/image_test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 2: Implement decoding and view maths**

`src/scripts/previewers/decode.ts`:

```ts
import * as blpModule from 'mdx-m3-viewer-th/dist/cjs/parsers/blp/image.js';
import * as ddsModule from 'mdx-m3-viewer-th/dist/cjs/parsers/dds/image.js';
import * as tgaModule from 'mdx-m3-viewer-th/dist/cjs/parsers/tga/image.js';
import { cjsDefault, cjsNamed } from './cjs.ts';

type BlpImageClass = typeof import('mdx-m3-viewer-th/dist/cjs/parsers/blp/image.js').BlpImage;
type DdsImageClass = typeof import('mdx-m3-viewer-th/dist/cjs/parsers/dds/image.js').DdsImage;
type TgaImageClass = typeof import('mdx-m3-viewer-th/dist/cjs/parsers/tga/image.js').default;

export type ImageFormat = 'blp' | 'dds' | 'tga';

export interface DecodedImage {
  /** Size of the decoded mipmap level. */
  width: number;
  height: number;
  data: Uint8ClampedArray;
  mipmaps: number;
  /** Format and full-size dimensions, e.g. "BLP1, 256×256". */
  label: string;
}

export const infoLine = (image: DecodedImage): string => `${image.label}, ${image.mipmaps} ${image.mipmaps === 1 ? 'mipmap' : 'mipmaps'}`;

/** Decodes one mipmap level of a BLP1, DDS, or TGA file to RGBA. Throws for data it cannot preview. */
export function decodeImage(format: ImageFormat, bytes: Uint8Array, level = 0): DecodedImage {
  // The parsers read from offset 0 of the underlying buffer, so hand them an exact copy.
  const copy = bytes.slice();
  if (format === 'blp') {
    const BlpImage = cjsNamed<BlpImageClass>(blpModule, 'BlpImage');
    const image = new BlpImage();
    image.load(copy);
    const mipmaps = Math.max(image.mipmaps(), 1);
    const mipmap = image.getMipmap(Math.min(level, mipmaps - 1));
    return { width: mipmap.width, height: mipmap.height, data: mipmap.data, mipmaps, label: `BLP1, ${image.width}×${image.height}` };
  }
  if (format === 'dds') {
    const DdsImage = cjsNamed<DdsImageClass>(ddsModule, 'DdsImage');
    const image = new DdsImage();
    image.load(copy);
    const mipmaps = Math.max(image.mipmaps(), 1);
    const mipmap = image.getMipmap(Math.min(level, mipmaps - 1));
    // RGTC (normal maps) decodes to two channels, which cannot be shown as colour.
    if (mipmap.data.length !== mipmap.width * mipmap.height * 4) throw new Error('this DDS encoding cannot be previewed');
    const data = new Uint8ClampedArray(mipmap.data.buffer, mipmap.data.byteOffset, mipmap.data.length);
    return { width: mipmap.width, height: mipmap.height, data, mipmaps, label: `DDS, ${image.width}×${image.height}` };
  }
  const TgaImage = cjsDefault<TgaImageClass>(tgaModule);
  const image = new TgaImage();
  image.load(copy);
  if (!image.data) throw new Error('this TGA file could not be decoded');
  return { width: image.width, height: image.height, data: image.data.data, mipmaps: 1, label: `TGA, ${image.width}×${image.height}` };
}
```

If `astro check` or `deno check` cannot resolve the `typeof import(...)` class types, replace each with a minimal local interface describing the members used (e.g. `{ new (): { load(bytes: Uint8Array): void; width: number; height: number; mipmaps(): number; getMipmap(level: number): ImageData } }`) — keep the runtime code unchanged.

`src/scripts/previewers/image-view.ts`:

```ts
export const ZOOMS = ['fit', '1', '2', '4', '8'] as const;
export type Zoom = typeof ZOOMS[number];
export interface Size { width: number; height: number }

/** On-screen size of the image; pixel-sharp rendering from 2× up. */
export function displaySize(image: Size, viewport: Size, zoom: Zoom): Size & { pixelated: boolean } {
  const scale = zoom === 'fit' ? Math.min(viewport.width / image.width, viewport.height / image.height) : Number(zoom);
  return {
    width: Math.max(1, Math.round(image.width * scale)),
    height: Math.max(1, Math.round(image.height * scale)),
    pixelated: scale >= 2,
  };
}

/** The alpha channel as opaque greyscale. */
export function alphaOnly(data: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    out[index] = alpha;
    out[index + 1] = alpha;
    out[index + 2] = alpha;
    out[index + 3] = 255;
  }
  return out;
}
```

Run: `deno test -A scripts/previewers/image_test.ts`
Expected: PASS.

- [ ] **Step 3: Implement the previewer**

`src/scripts/previewers/image.ts`:

```ts
import { decodeImage, type DecodedImage, type ImageFormat, infoLine } from './decode.ts';
import type { PreviewFile } from './files.ts';
import { alphaOnly, displaySize, type Zoom, ZOOMS } from './image-view.ts';
import { fetchBytes, goLive, h, labelledSelect, pressedButton, toolbar } from './ui.ts';

const FORMATS: ImageFormat[] = ['blp', 'dds', 'tga'];

export async function mount(preview: HTMLElement, files: PreviewFile[]): Promise<() => void> {
  const file = files.find((candidate) => FORMATS.includes(candidate.format as ImageFormat));
  if (!file) throw new Error('this resource has no BLP, DDS, or TGA file');
  const format = file.format as ImageFormat;
  const bytes = await fetchBytes(file.url);
  let image: DecodedImage = decodeImage(format, bytes);
  const fullSize = { width: image.width, height: image.height };
  let zoom: Zoom = 'fit';
  let alpha = false;

  const canvas = h('canvas', { class: 'image-canvas' });
  const viewport = h('div', { class: 'image-viewport checkered', tabindex: '0', role: 'img', 'aria-label': `${file.name} at full size` }, canvas);
  const info = h('span', { class: 'preview-info' }, infoLine(image));

  const layout = () => {
    const size = displaySize(image, { width: viewport.clientWidth, height: viewport.clientHeight }, zoom);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    canvas.classList.toggle('pixelated', size.pixelated);
  };
  const draw = () => {
    canvas.width = image.width;
    canvas.height = image.height;
    const pixels = new Uint8ClampedArray(alpha ? alphaOnly(image.data) : image.data);
    canvas.getContext('2d')?.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
    layout();
  };

  const controls = toolbar(
    labelledSelect('Zoom', ZOOMS.map((value) => ({ value, text: value === 'fit' ? 'Fit' : `${value}×` })), zoom, (value) => {
      zoom = value as Zoom;
      layout();
    }),
    pressedButton('Dark background instead of the transparency grid', 'Dark background', (on) => viewport.classList.toggle('checkered', !on)),
    pressedButton('Show only the alpha channel', 'Alpha only', (on) => {
      alpha = on;
      draw();
    }),
  );
  if (image.mipmaps > 1) {
    const levels = Array.from({ length: image.mipmaps }, (_, level) => ({
      value: String(level),
      text: `${level} (${Math.max(1, fullSize.width >> level)}×${Math.max(1, fullSize.height >> level)})`,
    }));
    controls.append(labelledSelect('Mipmap', levels, '0', (value) => {
      image = decodeImage(format, bytes, Number(value));
      draw();
    }));
  }
  controls.append(info);

  goLive(preview, h('div', { class: 'preview-stage preview-image' }, viewport, controls));
  draw();
  const observer = new ResizeObserver(layout);
  observer.observe(viewport);
  return () => observer.disconnect();
}
```

In `src/scripts/previewers/index.ts`, add inside `LOADERS`:

```ts
  image: () => import('./image.ts'),
```

Append to `src/styles/resources.css` (before the `@container` block):

```css
.preview-image .image-viewport { display: grid; place-items: safe center; aspect-ratio: 16 / 9; max-height: 60vh; overflow: auto; background: #0c151a; }
.preview-image .image-viewport.checkered { background: repeating-conic-gradient(#2a3740 0 25%, #1c2830 0 50%) 0 0 / 16px 16px; }
.preview-image .image-viewport:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.image-canvas.pixelated { image-rendering: pixelated; }
```

- [ ] **Step 4: Check, build, and test**

Run: `deno task check; deno task test; deno task build`
Expected: 0 errors; all tests PASS. (The previewer is verified in a real browser in Task 9.)

- [ ] **Step 5: Commit**

```bash
git add src scripts
git commit -m "Add the image previewer for BLP, DDS, and TGA textures"
```

---

### Task 5: Audio previewer

**Files:**
- Create: `src/scripts/previewers/waveform.ts`, `src/scripts/previewers/audio.ts`, `scripts/previewers/audio_test.ts`
- Modify: `src/scripts/previewers/index.ts`, `src/styles/resources.css`

**Interfaces:**
- Produces: `waveform.ts`: `interface Peaks { min: Float32Array; max: Float32Array }`, `downsample(samples, buckets)`, `mixDown(channels)`, `formatTime(seconds)`, `seekFraction(x, width)`; `audio.ts`: `mount`.

- [ ] **Step 1: Write the failing tests**

`scripts/previewers/audio_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { downsample, formatTime, mixDown, seekFraction } from '../../src/scripts/previewers/waveform.ts';

Deno.test('downsample keeps each bucket’s extremes, including zero for silence', () => {
  const peaks = downsample(new Float32Array([0.5, -0.25, 0, 0, 1, -1, 0.1, 0.2]), 4);
  assert.deepEqual([...peaks.min], [-0.25, 0, -1, 0]);
  assert.deepEqual([...peaks.max].map((value) => Math.round(value * 10) / 10), [0.5, 0, 1, 0.2]);
});

Deno.test('downsample copes with more buckets than samples', () => {
  const peaks = downsample(new Float32Array([0.5, -0.5]), 4);
  assert.equal(peaks.min.length, 4);
  assert.equal(peaks.max[0], 0.5);
});

Deno.test('mixDown averages channels', () => {
  assert.deepEqual([...mixDown([new Float32Array([1, 0]), new Float32Array([0, -1])])], [0.5, -0.5]);
  assert.deepEqual([...mixDown([new Float32Array([0.25])])], [0.25]);
});

Deno.test('formatTime and seekFraction', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65.7), '1:05');
  assert.equal(formatTime(Number.NaN), '0:00');
  assert.equal(seekFraction(50, 200), 0.25);
  assert.equal(seekFraction(-5, 200), 0);
  assert.equal(seekFraction(500, 200), 1);
  assert.equal(seekFraction(10, 0), 0);
});
```

Run: `deno test -A scripts/previewers/audio_test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2: Implement `waveform.ts`**

```ts
export interface Peaks { min: Float32Array; max: Float32Array }

/** One min/max pair per bucket, for drawing a waveform `buckets` pixels wide. */
export function downsample(samples: Float32Array, buckets: number): Peaks {
  const count = Math.max(1, Math.floor(buckets));
  const min = new Float32Array(count);
  const max = new Float32Array(count);
  const size = samples.length / count;
  for (let bucket = 0; bucket < count; bucket++) {
    const start = Math.floor(bucket * size);
    const end = Math.max(start + 1, Math.floor((bucket + 1) * size));
    // Start at zero so silent stretches draw a flat line.
    let low = 0;
    let high = 0;
    for (let index = start; index < end && index < samples.length; index++) {
      const value = samples[index];
      if (value < low) low = value;
      if (value > high) high = value;
    }
    min[bucket] = low;
    max[bucket] = high;
  }
  return { min, max };
}

export function mixDown(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const mixed = new Float32Array(channels[0]?.length ?? 0);
  for (const channel of channels) for (let index = 0; index < mixed.length; index++) mixed[index] += channel[index] / channels.length;
  return mixed;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export const seekFraction = (x: number, width: number): number => (width > 0 ? Math.min(1, Math.max(0, x / width)) : 0);
```

Run: `deno test -A scripts/previewers/audio_test.ts`
Expected: PASS.

- [ ] **Step 3: Implement the previewer**

`src/scripts/previewers/audio.ts`:

```ts
import type { PreviewFile } from './files.ts';
import { fetchBytes, goLive, h, toolbar } from './ui.ts';
import { downsample, formatTime, mixDown, seekFraction } from './waveform.ts';

const TYPES: Record<string, string> = { wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg', flac: 'audio/flac' };

export async function mount(preview: HTMLElement, files: PreviewFile[]): Promise<() => void> {
  const file = files.find((candidate) => candidate.role === 'audio');
  if (!file) throw new Error('this resource has no audio file');
  const bytes = await fetchBytes(file.url);
  // Play from the downloaded bytes so the file is fetched once, for both playback and the waveform.
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: TYPES[file.format] ?? 'audio/wav' }));
  const audio = new Audio(objectUrl);
  audio.preload = 'auto';

  let samples: Float32Array | undefined;
  let frame = 0;

  const canvas = h('canvas', { class: 'waveform', 'aria-hidden': 'true' });
  const play = h('button', { type: 'button', class: 'preview-button audio-play', 'aria-label': 'Play' }, 'Play');
  const time = h('span', { class: 'audio-time' }, '0:00 / 0:00');
  const seek = h('input', { type: 'range', class: 'audio-seek', min: '0', max: '1000', value: '0', 'aria-label': 'Seek' });
  const volume = h('input', { type: 'range', class: 'audio-volume', min: '0', max: '100', value: '100', 'aria-label': 'Volume' });
  const stage = h('div', { class: 'preview-stage preview-audio', tabindex: '0' }, canvas, toolbar(play, time, seek, h('label', { class: 'preview-field' }, h('span', {}, 'Volume'), volume)));

  const progress = () => (audio.duration > 0 ? audio.currentTime / audio.duration : 0);
  const draw = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const middle = height / 2;
    const played = progress() * width;
    if (samples) {
      const peaks = downsample(samples, width);
      for (let x = 0; x < width; x++) {
        context.fillStyle = x < played ? '#f5d518' : '#53636c';
        const top = middle - peaks.max[x] * middle;
        context.fillRect(x, top, 1, Math.max(1, (peaks.max[x] - peaks.min[x]) * middle));
      }
    } else {
      context.fillStyle = '#35434b';
      context.fillRect(0, middle, width, 1);
    }
    context.fillStyle = '#f6f5eb';
    context.fillRect(Math.round(played), 0, Math.max(1, ratio), height);
  };
  const update = () => {
    time.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    seek.value = String(Math.round(progress() * 1000));
    draw();
  };
  const loop = () => {
    update();
    frame = audio.paused ? 0 : requestAnimationFrame(loop);
  };
  const toggle = () => {
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  audio.addEventListener('play', () => {
    play.textContent = 'Pause';
    play.setAttribute('aria-label', 'Pause');
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(loop);
  });
  audio.addEventListener('pause', () => {
    play.textContent = 'Play';
    play.setAttribute('aria-label', 'Play');
    update();
  });
  audio.addEventListener('loadedmetadata', update);
  play.addEventListener('click', toggle);
  seek.addEventListener('input', () => {
    if (audio.duration > 0) audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
    update();
  });
  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value) / 100;
  });
  const seekTo = (event: PointerEvent) => {
    if (audio.duration > 0) audio.currentTime = seekFraction(event.offsetX, canvas.clientWidth) * audio.duration;
    update();
  };
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    seekTo(event);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (canvas.hasPointerCapture(event.pointerId)) seekTo(event);
  });
  stage.addEventListener('keydown', (event) => {
    if (event.key !== ' ' || event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    toggle();
  });

  goLive(preview, stage);
  update();
  const observer = new ResizeObserver(draw);
  observer.observe(canvas);

  // The waveform is a bonus: playback works even when the browser cannot decode the file.
  const context = new AudioContext();
  context.decodeAudioData(bytes.slice().buffer)
    .then((buffer) => {
      samples = mixDown(Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel)));
      draw();
    })
    .catch(() => {})
    .finally(() => void context.close());

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    URL.revokeObjectURL(objectUrl);
  };
}
```

In `src/scripts/previewers/index.ts`, add inside `LOADERS`:

```ts
  audio: () => import('./audio.ts'),
```

Append to `src/styles/resources.css` (before the `@container` block):

```css
.preview-audio { outline: none; }
.preview-audio:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.preview-audio .waveform { width: 100%; height: 140px; cursor: pointer; touch-action: none; }
.audio-time { min-width: 7.5em; font-variant-numeric: tabular-nums; }
.audio-seek { flex: 1 1 160px; accent-color: var(--accent); }
.audio-volume { width: 90px; accent-color: var(--accent); }
```

- [ ] **Step 4: Check, build, and test**

Run: `deno task check; deno task test; deno task build`
Expected: 0 errors; all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src scripts
git commit -m "Add the audio previewer with a seekable waveform"
```

---

### Task 6: Script previewer

**Files:**
- Create: `src/scripts/previewers/script.ts`
- Modify: `src/scripts/previewers/index.ts`, `src/styles/resources.css`

**Interfaces:**
- Consumes: `scriptLanguage`, `PreviewFile` (Task 3); `jass` grammar (`src/syntax/jass.ts`); `ui.ts`.
- Produces: `script.ts` `mount`.

- [ ] **Step 1: Implement the previewer**

`src/scripts/previewers/script.ts`:

```ts
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import lua from 'shiki/langs/lua.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';
import { jass } from '../../syntax/jass.ts';
import { type PreviewFile, scriptLanguage } from './files.ts';
import { fetchBytes, goLive, h, toolbar } from './ui.ts';

let highlighter: Promise<HighlighterCore> | undefined;
// Only three grammars and the JavaScript regex engine (no WebAssembly), to keep this chunk small.
const getHighlighter = () =>
  highlighter ??= createHighlighterCore({
    themes: [githubDark],
    langs: [lua, typescript, jass],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });

export async function mount(preview: HTMLElement, files: PreviewFile[]): Promise<() => void> {
  const scripts = files.filter((file) => file.role === 'script');
  if (!scripts.length) throw new Error('this resource has no script files');
  const [shiki, sources] = await Promise.all([
    getHighlighter(),
    Promise.all(scripts.map(async (file) => new TextDecoder().decode(await fetchBytes(file.url)))),
  ]);

  const code = h('div', { class: 'script-code', tabindex: '0', role: 'tabpanel' });
  const info = h('span', { class: 'preview-info' });
  const tabs = scripts.map((file, index) =>
    h('button', { type: 'button', role: 'tab', class: 'script-tab', id: `script-tab-${index}`, 'aria-selected': 'false', tabindex: '-1' }, file.name)
  );

  const show = (index: number) => {
    // Shiki escapes the source text; the HTML it returns is generated here, never fetched.
    code.innerHTML = shiki.codeToHtml(sources[index], { lang: scriptLanguage(scripts[index].format), theme: 'github-dark' });
    code.setAttribute('aria-labelledby', `script-tab-${index}`);
    const lines = sources[index].replace(/\n$/, '').split('\n').length;
    info.textContent = `${scripts[index].name} · ${lines} ${lines === 1 ? 'line' : 'lines'}`;
    tabs.forEach((tab, tabIndex) => {
      tab.setAttribute('aria-selected', String(tabIndex === index));
      tab.tabIndex = tabIndex === index ? 0 : -1;
    });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => show(index));
    tab.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const next = (index + step + tabs.length) % tabs.length;
      show(next);
      tabs[next].focus();
    });
  });

  const tabList = tabs.length > 1 ? [h('div', { class: 'script-tabs', role: 'tablist', 'aria-label': 'Script files' }, ...tabs)] : [];
  goLive(preview, h('div', { class: 'preview-stage preview-script' }, ...tabList, code, toolbar(info)));
  show(0);
  return () => {};
}
```

In `src/scripts/previewers/index.ts`, add inside `LOADERS`:

```ts
  script: () => import('./script.ts'),
```

Append to `src/styles/resources.css` (before the `@container` block):

```css
.preview-script .script-tabs { display: flex; overflow-x: auto; border-bottom: 1px solid var(--line); background: #0f191f; }
.script-tab { padding: 8px 14px; border: 0; background: none; color: var(--muted); font: inherit; font-size: .82rem; white-space: nowrap; cursor: pointer; }
.script-tab[aria-selected="true"] { color: var(--ink); box-shadow: inset 0 -2px 0 var(--accent); }
.script-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.script-code { max-height: 70vh; overflow: auto; font-family: var(--font-code); font-size: .82rem; line-height: 1.7; }
.script-code:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.script-code pre { margin: 0; padding: 14px 16px 14px 0; background: #1b2934 !important; counter-reset: line; }
.script-code .line { counter-increment: line; }
.script-code .line::before { content: counter(line); display: inline-block; width: 3.5em; margin-right: 1em; color: #53636c; text-align: right; user-select: none; }
```

- [ ] **Step 2: Check, build, and test**

Run: `deno task check; deno task test; deno task build`
Expected: 0 errors; all tests PASS. If `astro check` cannot find types for `shiki/langs/lua.mjs` or `shiki/themes/github-dark.mjs`, import them as `import lua from '@shikijs/langs/lua'` / `import githubDark from '@shikijs/themes/github-dark'` only if those packages resolve; otherwise report NEEDS_CONTEXT.

- [ ] **Step 3: Commit**

```bash
git add src
git commit -m "Add the script previewer with Shiki highlighting"
```

---

### Task 7: Model viewer building blocks

**Files:**
- Create: `src/scripts/previewers/textures.ts`, `src/scripts/previewers/model-info.ts`, `src/scripts/previewers/orbit.ts`, `scripts/previewers/model_test.ts`

**Interfaces:**
- Consumes: `baseName`, `isTeamTexture`, `lookupGameTexture`, `GameTextureMap` (Task 1); `PreviewFile` (Task 3).
- Produces:
  - `textures.ts`: `interface SolverParams { reforged?: boolean; hd?: boolean }`, `createTextureResolver(files, gameTextures, missingTexture) → { solve, missing: Set<string> }`, `summarizeMissing(paths): string[]`.
  - `model-info.ts`: `isHdModel(version, shaders)`, `defaultSequence(names)`, `teamColorOptions(hd)`, `SPEEDS`.
  - `orbit.ts`: `type Vec3`, `interface Orbit { target; distance; yaw; pitch; minDistance; maxDistance }`, `orbitFromExtent(min, max)`, `cameraPosition(orbit)`, `rotateOrbit(orbit, dx, dy)`, `zoomOrbit(orbit, factor)`, `panOrbit(orbit, dx, dy)`.

- [ ] **Step 1: Write the failing tests**

`scripts/previewers/model_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { defaultSequence, isHdModel, teamColorOptions } from '../../src/scripts/previewers/model-info.ts';
import { cameraPosition, orbitFromExtent, panOrbit, rotateOrbit, zoomOrbit } from '../../src/scripts/previewers/orbit.ts';
import { createTextureResolver, summarizeMissing } from '../../src/scripts/previewers/textures.ts';

const files = [
  { role: 'model', format: 'mdx', url: 'https://a.test/k/Footman.mdx', name: 'Footman.mdx' },
  { role: 'texture', format: 'blp', url: 'https://a.test/k/Footman.blp', name: 'Footman.blp' },
];
const game = {
  'sd:replaceabletextures/teamcolor/teamcolor00.blp': 'https://a.test/game/sd/red.blp',
  'hd:replaceabletextures/teamcolor/teamcolor00.dds': 'https://a.test/game/hd/red.dds',
  'sd:textures/gutz.blp': 'https://a.test/game/sd/gutz.blp',
};
const MISSING = { missing: true };

Deno.test('the resolver prefers the resource’s own files, then game textures, then a stand-in', () => {
  const resolver = createTextureResolver(files, game, () => MISSING);
  const parsed = { parsed: true };
  assert.equal(resolver.solve(parsed), parsed);
  assert.equal(resolver.solve('Textures\\FOOTMAN.blp'), 'https://a.test/k/Footman.blp');
  assert.equal(resolver.solve('Textures\\gutz.blp'), 'https://a.test/game/sd/gutz.blp');
  assert.equal(resolver.solve('ReplaceableTextures\\TeamColor\\TeamColor00.dds', { reforged: true }), 'https://a.test/game/hd/red.dds');
  assert.equal(resolver.solve('ReplaceableTextures\\TeamColor\\TeamColor00.blp'), 'https://a.test/game/sd/red.blp');
  assert.equal(resolver.solve('Textures\\Nowhere.blp'), MISSING);
  assert.deepEqual([...resolver.missing], ['Textures\\Nowhere.blp']);
});

Deno.test('missing team textures collapse into one line', () => {
  assert.deepEqual(summarizeMissing([
    'ReplaceableTextures\\TeamColor/TeamColor00.blp', 'ReplaceableTextures\\TeamGlow\\TeamGlow00.blp', 'Textures/Zed.blp', 'Textures\\Abe.blp',
  ]), ['Textures\\Abe.blp', 'Textures\\Zed.blp', 'Team colour textures (2)']);
  assert.deepEqual(summarizeMissing([]), []);
});

Deno.test('model facts: HD rule, default animation, team colours', () => {
  assert(isHdModel(1000, ['', 'Shader_HD_DefaultUnit']));
  assert(!isHdModel(1000, ['', '']));
  assert(!isHdModel(800, ['Shader_HD_DefaultUnit']));
  assert.equal(defaultSequence(['Walk', 'Stand - 2', 'Stand']), 1);
  assert.equal(defaultSequence(['Walk', 'Attack']), 0);
  assert.equal(defaultSequence([]), -1);
  assert.equal(teamColorOptions(false).length, 16);
  assert.equal(teamColorOptions(true).length, 28);
  assert.deepEqual(teamColorOptions(false)[0], { value: '0', text: 'Red' });
  assert.equal(teamColorOptions(true)[27].text, 'Neutral 4');
});

const close = (a: number[], b: number[]) => a.every((value, index) => Math.abs(value - b[index]) < 1e-6);

Deno.test('orbit framing, rotation limits, zoom limits, and panning', () => {
  const orbit = orbitFromExtent([-50, -50, 0], [50, 50, 100]);
  assert.deepEqual(orbit.target, [0, 0, 50]);
  assert(close(cameraPosition({ ...orbit, yaw: 0, pitch: 0, distance: 10 }), [10, 0, 50]));
  assert(close(cameraPosition({ ...orbit, yaw: Math.PI / 2, pitch: 0, distance: 10 }), [0, 10, 50]));
  assert.equal(rotateOrbit(orbit, 0, 10_000).pitch, 1.45);
  assert.equal(rotateOrbit(orbit, 0, -10_000).pitch, -1.45);
  assert.equal(zoomOrbit(orbit, 1e-6).distance, orbit.minDistance);
  assert.equal(zoomOrbit(orbit, 1e6).distance, orbit.maxDistance);
  const panned = panOrbit({ ...orbit, yaw: 0, pitch: 0 }, 100, 0);
  assert(panned.target[1] < 0 && Math.abs(panned.target[0]) < 1e-9 && panned.target[2] === 50);
  const empty = orbitFromExtent([0, 0, 0], [0, 0, 0]);
  assert.deepEqual(empty.target, [0, 0, 50]);
  assert(empty.distance > 0);
});
```

Run: `deno test -A scripts/previewers/model_test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 2: Implement the modules**

`src/scripts/previewers/textures.ts`:

```ts
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
```

`src/scripts/previewers/model-info.ts`:

```ts
/** The viewer's own rule: Reforged-format models whose materials name shaders render with HD shaders. */
export const isHdModel = (version: number, shaders: string[]): boolean => version > 800 && shaders.some((shader) => shader !== '');

/** The first "Stand" sequence, else the first sequence; -1 when there are none. */
export function defaultSequence(names: string[]): number {
  const stand = names.findIndex((name) => /^stand\b/i.test(name.trim()));
  return stand >= 0 ? stand : names.length ? 0 : -1;
}

const TEAM_COLOR_NAMES = [
  'Red', 'Blue', 'Teal', 'Purple', 'Yellow', 'Orange', 'Green', 'Pink', 'Gray', 'Light Blue', 'Dark Green', 'Brown',
  'Maroon', 'Navy', 'Turquoise', 'Violet', 'Wheat', 'Peach', 'Mint', 'Lavender', 'Coal', 'Snow', 'Emerald', 'Peanut',
];

/** Team colours the viewer has loaded: 16 for SD models, 28 for HD. */
export function teamColorOptions(hd: boolean): { value: string; text: string }[] {
  return Array.from({ length: hd ? 28 : 16 }, (_, index) => ({ value: String(index), text: TEAM_COLOR_NAMES[index] ?? `Neutral ${index - 23}` }));
}

export const SPEEDS = ['0.25', '0.5', '1', '2'] as const;
```

`src/scripts/previewers/orbit.ts`:

```ts
export type Vec3 = [number, number, number];

/** A Z-up orbit camera around a target; yaw 0 looks at the model's front from +X. */
export interface Orbit { target: Vec3; distance: number; yaw: number; pitch: number; minDistance: number; maxDistance: number }

const PITCH_LIMIT = 1.45;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Frames a model from its extent; an empty extent gets a sensible default. */
export function orbitFromExtent(min: ArrayLike<number>, max: ArrayLike<number>): Orbit {
  const size = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const radius = size > 0 ? size / 2 : 100;
  const target: Vec3 = size > 0 ? [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2] : [0, 0, 50];
  return { target, distance: radius * 2.6, yaw: 0, pitch: 0.35, minDistance: radius * 0.3, maxDistance: radius * 12 };
}

export function cameraPosition(orbit: Orbit): Vec3 {
  const { target: [x, y, z], distance, yaw, pitch } = orbit;
  return [x + distance * Math.cos(pitch) * Math.cos(yaw), y + distance * Math.cos(pitch) * Math.sin(yaw), z + distance * Math.sin(pitch)];
}

export const rotateOrbit = (orbit: Orbit, dx: number, dy: number): Orbit =>
  ({ ...orbit, yaw: orbit.yaw - dx * 0.01, pitch: clamp(orbit.pitch + dy * 0.01, -PITCH_LIMIT, PITCH_LIMIT) });

export const zoomOrbit = (orbit: Orbit, factor: number): Orbit =>
  ({ ...orbit, distance: clamp(orbit.distance * factor, orbit.minDistance, orbit.maxDistance) });

/** Moves the target with the drag, in the camera's screen plane. */
export function panOrbit(orbit: Orbit, dx: number, dy: number): Orbit {
  const scale = orbit.distance * 0.0015;
  const right: Vec3 = [-Math.sin(orbit.yaw), Math.cos(orbit.yaw), 0];
  const up: Vec3 = [-Math.sin(orbit.pitch) * Math.cos(orbit.yaw), -Math.sin(orbit.pitch) * Math.sin(orbit.yaw), Math.cos(orbit.pitch)];
  const target = orbit.target.map((value, axis) => value - right[axis] * dx * scale + up[axis] * dy * scale) as Vec3;
  return { ...orbit, target };
}
```

- [ ] **Step 3: Run the tests**

Run: `deno test -A scripts/previewers/model_test.ts` then `deno task test:unit`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/previewers scripts/previewers
git commit -m "Add texture resolution, model facts, and orbit maths for the model viewer"
```

---

### Task 8: Model viewer

**Files:**
- Create: `src/scripts/previewers/model.ts`
- Modify: `package.json`, `deno.lock`, `src/scripts/previewers/index.ts`, `src/styles/resources.css`, `scripts/site_test.ts`

**Interfaces:**
- Consumes: Task 7 modules; `cjsDefault`, `isHandler`; `ui.ts`; `data-game-textures`.
- Produces: `model.ts` `mount`.

- [ ] **Step 1: Add the browser `events` package**

In `package.json` `dependencies`, add `"events": "3.3.0"` and run `deno install`. (The viewer's `viewer.js` does `require("events")`; without the package, Vite stubs it out and the viewer fails at runtime — verified during planning.)

- [ ] **Step 2: Write the failing build test**

Append to `scripts/site_test.ts`:

```ts
Deno.test('the WebGL model viewer is a separate chunk that no page loads up front', async () => {
  const assets = new URL('_astro/', root);
  const viewerChunks: string[] = [];
  for await (const entry of Deno.readDir(assets)) {
    if (entry.name.endsWith('.js') && (await Deno.readTextFile(new URL(entry.name, assets))).includes('WEBGL_lose_context')) viewerChunks.push(entry.name);
  }
  assert(viewerChunks.length > 0, 'The model viewer chunk must be built');
  for (const file of await htmlFiles(root)) {
    const html = await Deno.readTextFile(file);
    assert(!html.includes('WEBGL_lose_context'), `Viewer code inlined into ${file.pathname}`);
    for (const [, src] of html.matchAll(/(?:src|href)="\/_astro\/([^"]+\.js)"/g)) {
      assert(!viewerChunks.includes(src), `${file.pathname} loads the viewer eagerly`);
    }
  }
});
```

Run: `deno task test`
Expected: the new test FAILS (no chunk contains the viewer yet).

- [ ] **Step 3: Implement the viewer**

`src/scripts/previewers/model.ts`:

```ts
import MdlxModelModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/model.js';
import BlpHandlerModule from 'mdx-m3-viewer-th/dist/cjs/viewer/handlers/blp/handler.js';
import DdsHandlerModule from 'mdx-m3-viewer-th/dist/cjs/viewer/handlers/dds/handler.js';
import MdxHandlerModule from 'mdx-m3-viewer-th/dist/cjs/viewer/handlers/mdx/handler.js';
import TgaHandlerModule from 'mdx-m3-viewer-th/dist/cjs/viewer/handlers/tga/handler.js';
import ModelViewerModule from 'mdx-m3-viewer-th/dist/cjs/viewer/viewer.js';
import type { GameTextureMap } from '../../lib/game-textures.ts';
import { cjsDefault, isHandler } from './cjs.ts';
import type { PreviewFile } from './files.ts';
import { defaultSequence, isHdModel, SPEEDS, teamColorOptions } from './model-info.ts';
import { cameraPosition, type Orbit, orbitFromExtent, panOrbit, rotateOrbit, zoomOrbit } from './orbit.ts';
import { createTextureResolver, summarizeMissing } from './textures.ts';
import { fetchBytes, goLive, h, labelledSelect, showMessage, toolButton, toolbar } from './ui.ts';

type ModelViewer = import('mdx-m3-viewer-th/dist/cjs/viewer/viewer.js').default;
type Handler = import('mdx-m3-viewer-th/dist/cjs/viewer/viewer.js').Handler;
type Scene = import('mdx-m3-viewer-th/dist/cjs/viewer/scene.js').default;
type MdxModel = import('mdx-m3-viewer-th/dist/cjs/viewer/handlers/mdx/model.js').default;
type MdxModelInstance = import('mdx-m3-viewer-th/dist/cjs/viewer/handlers/mdx/modelinstance.js').default;
type MdlxModel = import('mdx-m3-viewer-th/dist/cjs/parsers/mdlx/model.js').default;

const ModelViewerClass = cjsDefault<new (canvas: HTMLCanvasElement) => ModelViewer>(ModelViewerModule);
const MdlxModelClass = cjsDefault<new () => MdlxModel>(MdlxModelModule);
const handler = (module: unknown) => cjsDefault<Handler>(module, isHandler);

/** Loading continues in the background after this; the model is shown with whatever has arrived. */
const LOAD_TIMEOUT_MS = 20_000;
const LOOP_ALWAYS = 2;

/** A 2×2 grey checker used for textures that are not available; the viewer accepts canvases as textures. */
function checkerTexture(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#4b555c';
    context.fillRect(0, 0, 2, 2);
    context.fillStyle = '#8a949a';
    context.fillRect(0, 0, 1, 1);
    context.fillRect(1, 1, 1, 1);
  }
  return canvas;
}

export async function mount(preview: HTMLElement, files: PreviewFile[]): Promise<() => void> {
  const modelFile = files.find((file) => file.role === 'model');
  if (!modelFile) throw new Error('this resource has no model file');
  showMessage(preview, 'Loading 3D preview…');

  const bytes = await fetchBytes(modelFile.url);
  const parser = new MdlxModelClass();
  parser.load(modelFile.format === 'mdl' ? new TextDecoder().decode(bytes) : bytes.slice());
  const hd = isHdModel(parser.version, parser.materials.map((material) => material.shader));
  // Event objects (footprints, sounds) need the game's SLK tables, which are not hosted.
  parser.eventObjects = [];

  let gameTextures: GameTextureMap = {};
  try {
    gameTextures = JSON.parse(preview.dataset.gameTextures ?? '{}');
  } catch { /* A malformed attribute only means game textures show as stand-ins. */ }
  const resolver = createTextureResolver(files, gameTextures, checkerTexture);

  const title = document.querySelector('h1')?.textContent?.trim() || 'the model';
  const canvas = h('canvas', { class: 'model-canvas', role: 'img', tabindex: '0', 'aria-label': `3D view of ${title}` });
  const viewer = new ModelViewerClass(canvas); // Throws when WebGL is unavailable.
  const release = () => {
    viewer.clear();
    viewer.gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
  try {
    // Without a listener the viewer's event emitter throws on the first failed request.
    viewer.on('error', () => {});
    viewer.addHandler(handler(MdxHandlerModule), resolver.solve, hd);
    viewer.addHandler(handler(BlpHandlerModule));
    viewer.addHandler(handler(DdsHandlerModule));
    viewer.addHandler(handler(TgaHandlerModule));
    const scene = viewer.addScene();
    scene.color.set([0.05, 0.08, 0.1]);
    const model = await viewer.load(parser, resolver.solve) as MdxModel | undefined;
    if (!model) throw new Error('the viewer could not read this model');
    const instance = model.addInstance();
    instance.setScene(scene);
    instance.setSequenceLoopMode(LOOP_ALWAYS);
    await Promise.race([viewer.whenAllLoaded(), new Promise((resolve) => setTimeout(resolve, LOAD_TIMEOUT_MS))]);
    return startViewer({ preview, canvas, viewer, scene, instance, parser, hd, missing: resolver.missing, release });
  } catch (error) {
    release();
    throw error;
  }
}

interface ViewerContext {
  preview: HTMLElement;
  canvas: HTMLCanvasElement;
  viewer: ModelViewer;
  scene: Scene;
  instance: MdxModelInstance;
  parser: MdlxModel;
  hd: boolean;
  missing: Set<string>;
  release: () => void;
}

function startViewer({ preview, canvas, viewer, scene, instance, parser, hd, missing, release }: ViewerContext): () => void {
  const initial: Orbit = orbitFromExtent(parser.extent.min, parser.extent.max);
  let orbit = initial;
  let playing = true;
  let speed = 1;
  let onScreen = true;
  let frame = 0;
  let last = performance.now();

  const applyCamera = () => scene.camera.moveToAndFace(cameraPosition(orbit), orbit.target, [0, 0, 1]);
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    scene.viewport[2] = width;
    scene.viewport[3] = height;
    scene.camera.perspective(Math.PI / 4, width / height, 1, orbit.maxDistance * 8);
    applyCamera();
    viewer.updateAndRender(0);
  };
  const tick = (now: number) => {
    const dt = Math.min(now - last, 100);
    last = now;
    viewer.updateAndRender(playing ? dt * speed : 0);
    frame = requestAnimationFrame(tick);
  };
  // Render only while the viewer is on screen and the tab is visible.
  const run = () => {
    const shouldRun = onScreen && document.visibilityState === 'visible';
    if (shouldRun && !frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    } else if (!shouldRun && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
  const moveCamera = (next: Orbit) => {
    orbit = next;
    applyCamera();
  };

  const sequences = parser.sequences.map((sequence) => sequence.name);
  const first = defaultSequence(sequences);
  if (first >= 0) instance.setSequence(first);

  const playButton = toolButton('Pause animation', 'Pause', () => togglePlay());
  const togglePlay = () => {
    playing = !playing;
    playButton.textContent = playing ? 'Pause' : 'Play';
    playButton.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
    playButton.title = playButton.getAttribute('aria-label') ?? '';
  };
  const stage = h('div', { class: 'preview-stage preview-model' });
  const controls = toolbar(
    ...(sequences.length
      ? [labelledSelect('Animation', sequences.map((name, index) => ({ value: String(index), text: name || `Sequence ${index + 1}` })), String(first), (value) => instance.setSequence(Number(value)))]
      : []),
    playButton,
    labelledSelect('Speed', SPEEDS.map((value) => ({ value, text: `${value}×` })), '1', (value) => {
      speed = Number(value);
    }),
    labelledSelect('Player colour', teamColorOptions(hd), '0', (value) => instance.setTeamColor(Number(value))),
    toolButton('Reset view', 'Reset view', () => moveCamera(initial)),
    toolButton('Fullscreen', 'Fullscreen', () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void stage.requestFullscreen?.();
    }),
    h('span', { class: 'preview-info' }, h('span', { class: 'catalog-badge' }, hd ? 'HD' : 'SD')),
  );
  const unavailable = summarizeMissing(missing);
  stage.append(canvas, controls);
  if (unavailable.length) {
    stage.append(h(
      'details',
      { class: 'model-missing' },
      h('summary', {}, `${unavailable.length} ${unavailable.length === 1 ? 'texture' : 'textures'} not available`),
      h('ul', {}, ...unavailable.map((path) => h('li', {}, path))),
    ));
  }

  // Pointer controls: drag to orbit, right-drag or Shift-drag to pan, wheel or pinch to zoom.
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pinch = 0;
  });
  canvas.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      let next = orbit;
      if (pinch) next = zoomOrbit(next, pinch / distance);
      pinch = distance;
      moveCamera(panOrbit(next, dx / 2, dy / 2));
    } else if (event.buttons & 2 || event.shiftKey) {
      moveCamera(panOrbit(orbit, dx, dy));
    } else {
      moveCamera(rotateOrbit(orbit, dx, dy));
    }
  });
  const endPointer = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    pinch = 0;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    moveCamera(zoomOrbit(orbit, event.deltaY > 0 ? 1.1 : 1 / 1.1));
  }, { passive: false });
  canvas.addEventListener('keydown', (event) => {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => moveCamera(rotateOrbit(orbit, -20, 0)),
      ArrowRight: () => moveCamera(rotateOrbit(orbit, 20, 0)),
      ArrowUp: () => moveCamera(rotateOrbit(orbit, 0, -20)),
      ArrowDown: () => moveCamera(rotateOrbit(orbit, 0, 20)),
      '+': () => moveCamera(zoomOrbit(orbit, 1 / 1.15)),
      '=': () => moveCamera(zoomOrbit(orbit, 1 / 1.15)),
      '-': () => moveCamera(zoomOrbit(orbit, 1.15)),
      '0': () => moveCamera(initial),
      ' ': togglePlay,
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  });

  goLive(preview, stage);
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    run();
  });
  visibility.observe(canvas);
  document.addEventListener('visibilitychange', run);
  run();

  return () => {
    cancelAnimationFrame(frame);
    frame = 0;
    resizeObserver.disconnect();
    visibility.disconnect();
    document.removeEventListener('visibilitychange', run);
    if (document.fullscreenElement === stage) void document.exitFullscreen();
    release();
  };
}
```

If `astro check` reports that `viewer.on` is not typed (the viewer extends Node's `EventEmitter` from `events`, which may have no type declarations here), call it through a narrow cast: `(viewer as unknown as { on(event: string, listener: () => void): void }).on('error', () => {});` — do not add `@types/node`.

In `src/scripts/previewers/index.ts`, add inside `LOADERS`:

```ts
  model: () => import('./model.ts'),
```

Append to `src/styles/resources.css` (before the `@container` block):

```css
.preview-model .model-canvas { display: block; width: 100%; aspect-ratio: 16 / 9; max-height: 70vh; background: #0c151a; cursor: grab; touch-action: none; }
.preview-model .model-canvas:active { cursor: grabbing; }
.preview-model .model-canvas:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.preview-model:fullscreen { grid-template-rows: minmax(0, 1fr) auto auto; background: #0c151a; }
.preview-model:fullscreen .model-canvas { height: 100%; max-height: none; aspect-ratio: auto; }
.model-missing { padding: 8px 10px; border-top: 1px solid var(--line); background: #101a20; color: var(--muted); font-size: .8rem; }
.model-missing summary { cursor: pointer; }
.model-missing ul { margin: 6px 0 0; padding-left: 1.2rem; font-family: var(--font-code); }
```

- [ ] **Step 4: Check, build, and test**

Run: `deno task check; deno task test; deno task build`
Expected: 0 errors; all tests PASS, including the viewer-chunk test; no "externalized for browser compatibility" warning for `events` in the build output (check with `deno task build 2>&1 | grep -i externalized`, which must print nothing).

- [ ] **Step 5: Commit**

```bash
git add package.json deno.lock src scripts
git commit -m "Add the WebGL model viewer"
```

---

### Task 9: Fixture store and browser verification

**Files:**
- Create: `scripts/resources/fixture-store.ts`
- Modify: `scripts/resources/testdata.ts`, `src/content/resources/_fixtures/model/fixture-footman.json`, `deno.json`, `.gitignore` (only if `.asset-store/` is somehow missing)

**Interfaces:**
- Consumes: fixture JSON; `localStore`; test-data builders; `encodePng`.
- Produces: `makeTexturedMdx(options)`; tasks `fixtures:store`, `build:fixtures`.

- [ ] **Step 1: Add a renderable test model**

Append to `scripts/resources/testdata.ts` (add the extra parser imports at the top next to the existing ones):

```ts
import BoneModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/bone.js';
import GeosetModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/geoset.js';
import LayerModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/layer.js';
import MaterialModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/material.js';

const Bone = BoneModule.default;
const Geoset = GeosetModule.default;
const Layer = LayerModule.default;
const Material = MaterialModule.default;

/**
 * A single upright 100×100 quad textured with the model's first texture, framed by its extent.
 * Renders in the viewer (verified in a browser during planning); used for the fixture store and manual checks.
 */
export function makeTexturedMdx(options: { sequences?: string[]; textures?: string[]; replaceableIds?: number[] } = {}): Uint8Array {
  const result = model(options.sequences ?? ['Stand'], options.textures ?? ['Textures\\Footman.blp'], options.replaceableIds ?? []);
  const material = new Material();
  const layer = new Layer();
  layer.textureId = 0;
  material.layers.push(layer);
  result.materials.push(material);

  const geoset = new Geoset();
  geoset.vertices = new Float32Array([-50, 0, 0, 50, 0, 0, 50, 0, 100, -50, 0, 100]);
  geoset.normals = new Float32Array([0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0]);
  geoset.faceTypeGroups = new Uint32Array([4]);
  geoset.faceGroups = new Uint32Array([6]);
  geoset.faces = new Uint16Array([0, 1, 2, 0, 2, 3]);
  geoset.vertexGroups = new Uint8Array([0, 0, 0, 0]);
  geoset.matrixGroups = new Uint32Array([1]);
  geoset.matrixIndices = new Uint32Array([0]);
  geoset.uvSets = [new Float32Array([0, 1, 1, 1, 1, 0, 0, 0])];
  geoset.materialId = 0;
  geoset.extent.min.set([-50, 0, 0]);
  geoset.extent.max.set([50, 0, 100]);
  geoset.extent.boundsRadius = 80;
  result.geosets.push(geoset);

  const bone = new Bone();
  bone.name = 'Root';
  bone.objectId = 0;
  bone.parentId = -1;
  bone.geosetId = 0;
  result.bones.push(bone);
  result.pivotPoints.push(new Float32Array([0, 0, 0]));
  result.extent.min.set([-50, 0, 0]);
  result.extent.max.set([50, 0, 100]);
  result.extent.boundsRadius = 80;
  return result.saveMdx();
}
```

Add to `scripts/resources/parsers_test.ts`:

```ts
Deno.test('makeTexturedMdx builds a parseable model with geometry', () => {
  const meta = readModelMeta(makeTexturedMdx({ sequences: ['Stand', 'Walk'], textures: ['Textures\\Footman.blp', 'Textures\\Missing.blp'], replaceableIds: [1] }));
  assert.deepEqual(meta.animations, ['Stand', 'Walk']);
  assert.deepEqual(meta.textures, ['Textures\\Footman.blp', 'Textures\\Missing.blp']);
  assert.deepEqual(meta.replaceables, []);
});
```

(Import `makeTexturedMdx` alongside the existing test-data imports.)

In `src/content/resources/_fixtures/model/fixture-footman.json`, change `"textures"` to `["Textures\\Footman.blp", "Textures\\Missing.blp"]` and add `"replaceables": []` after it. The detail page still lists the Stand/Walk/Attack animations; confirm the existing site tests still pass.

- [ ] **Step 2: Add the fixture store**

`scripts/resources/fixture-store.ts`:

```ts
// Writes real sample files into .asset-store/ at the keys the test fixtures reference,
// so every previewer can be tried locally: deno task fixtures:store && deno task build:fixtures.
import { join } from 'jsr:@std/path@^1';
import { type Resource, resourceSchema } from '../../src/lib/resource-schema.ts';
import { encodePng } from './png.ts';
import { localStore } from './store.ts';
import { makeBlp, makeDxt1Dds, makeTexturedMdx, makeWav } from './testdata.ts';

const FIXTURES = 'src/content/resources/_fixtures';

const SAMPLE_LUA = `-- Fixture damage library
local Damage = {}

---@param source unit
---@param target unit
---@param amount real
function Damage.apply(source, target, amount)
  UnitDamageTarget(source, target, amount, true, false, ATTACK_TYPE_NORMAL, DAMAGE_TYPE_NORMAL, nil)
end

return Damage
`;

async function gradientPng(size: number): Promise<Uint8Array> {
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) pixels.set([Math.round((x / size) * 255), 90, Math.round((y / size) * 255), 255], (y * size + x) * 4);
  }
  return encodePng(size, size, pixels);
}

async function sample(format: string, resource: Resource): Promise<Uint8Array> {
  switch (format) {
    case 'mdx':
      return resource.type === 'model'
        ? makeTexturedMdx({ sequences: resource.animations, textures: resource.textures, replaceableIds: [1] })
        : makeTexturedMdx();
    case 'blp':
      return makeBlp();
    case 'dds':
      return makeDxt1Dds();
    case 'wav':
      return makeWav(resource.type === 'audio' ? resource.durationSec : 1);
    case 'lua':
    case 'jass':
    case 'ts':
      return new TextEncoder().encode(SAMPLE_LUA);
    case 'png':
      return gradientPng(64);
    default:
      throw new Error(`No sample for ${format}`);
  }
}

async function* fixtureFiles(dir: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(dir)) {
    const path = join(dir, entry.name);
    if (entry.isDirectory) yield* fixtureFiles(path);
    else if (entry.name.endsWith('.json')) yield path;
  }
}

if (import.meta.main) {
  const store = localStore('.asset-store');
  let count = 0;
  for await (const path of fixtureFiles(FIXTURES)) {
    const resource = resourceSchema.parse(JSON.parse(await Deno.readTextFile(path)));
    if (resource.type === 'link') continue;
    for (const file of resource.files) {
      await store.put(file.key, await sample(file.format, resource), 'application/octet-stream');
      count++;
    }
    if (resource.preview) {
      await store.put(resource.preview.key, await gradientPng(resource.preview.width), 'image/png');
      count++;
    }
  }
  console.log(`Wrote ${count} sample files to .asset-store/.`);
}
```

In `deno.json` tasks add:

```json
    "fixtures:store": "deno run -A scripts/resources/fixture-store.ts",
    "build:fixtures": "RESOURCE_FIXTURES=1 ASSET_BASE_URL=http://127.0.0.1:4322/ deno task build",
```

Run: `deno task test:unit; deno task fixtures:store`
Expected: tests PASS; "Wrote 8 sample files to .asset-store/." (six resource files and two preview images).

- [ ] **Step 3: Commit**

```bash
git add scripts/resources deno.json src/content/resources/_fixtures
git commit -m "Add a renderable fixture model and a local fixture store for previewer checks"
```

- [ ] **Step 4: Verify every previewer in the browser**

1. `deno task build:fixtures`, then start `deno task assets:serve` in the background (Bash `run_in_background`) and the `wc3-dev-preview` browser-pane server (`mcp__Claude_Browser__preview_start`). Resize the pane to 1280×800.
2. **Model** — open `/resources/models/fixture-footman/`:
   - The fallback image is replaced by a canvas; no `.preview-message` is visible; the console shows no errors.
   - The Animation select lists Stand, Walk, Attack with Stand selected; switching animation, speed (0.25×–2×) and Player colour (16 options, SD badge) throws no console errors.
   - The missing-texture list reads "2 textures not available" and lists `Textures\Missing.blp` plus a "Team colour textures (…)" line (no team textures are hosted locally).
   - Drag rotates, wheel zooms, Reset view restores; arrow keys and `0` work with the canvas focused.
   - Take a screenshot or zoom of the canvas and confirm the textured quad is visible (blue/black checker from the BLP) against the dark background. If screenshots time out while the pane is hidden, bring the pane to the front and retry.
3. **Leak check** — using client-side navigation, go back and forth between the model page and `/resources/` 20 times (click links; do not reload). Confirm the console has no "Too many active WebGL contexts" warning and the model still renders at the end.
4. **Image** — `/resources/icons/fixture-sword-icon/` (BLP) and `/resources/textures/fixture-grass-tile/` (DDS): a canvas shows the decoded image; Zoom 8× turns pixel-sharp and scrolls if needed; Dark background and Alpha only toggle; the info line reads "BLP1, 2×2, 1 mipmap" / "DDS, 4×4, 1 mipmap".
5. **Audio** — `/resources/audio/fixture-horn/`: a flat waveform line (the sample is silence), Play advances the time to 0:02 and returns to Play at the end; clicking the waveform seeks; Space toggles with the player focused.
6. **Script** — `/resources/scripts/fixture-damage-lib/`: highlighted Lua with line numbers and "DamageLib.lua · 11 lines".
7. **Fallback** — on `/resources/` run in the JavaScript tool: `const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /webgl/.test(type) ? null : original.call(this, type, ...rest); };` then click through to the model page: the static preview stays and the message reads "3D preview unavailable: …" with a Retry button. Reload afterwards to restore.
8. **Mobile** — preset `mobile`, reload the model page: toolbar wraps, no horizontal page scroll, touch-drag rotates (use the pointer tools). Reset to preset `desktop`.
9. Stop the preview server and the asset server. Delete `.asset-store/` and rebuild with `deno task build` so `dist/` holds a production build again.

Record every check (pass / fixed / fail / not verified) in the task report. Fix failures with the smallest change consistent with the spec, re-run `deno task check; deno task test; deno task build`, and commit fixes as "Fix <what> found in previewer browser checks".

---

### Task 10: Documentation

**Files:**
- Modify: `README.md`, `docs/hive-integration.md`

- [ ] **Step 1: Update the README**

In the README's Resources section, after the `assets:serve` bullet, add:

```markdown
- **Previews.** Resource pages show live previews: a 3D viewer for models, a
  zoomable image view for icons and textures, an audio player with waveform,
  and highlighted source for scripts. Try them all locally with
  `deno task fixtures:store`, `deno task build:fixtures`, `deno task assets:serve`
  and `deno task preview`.
- **Game textures.** Models often use textures from the base game (team
  colours, cliffs, trees, standard unit textures). Extract the game's files
  with a tool such as CascView, then run:

  ```sh
  deno task game:sync --sd path/to/war3.w3mod --hd path/to/war3.w3mod/_hd.w3mod --dry-run
  deno task game:sync --sd path/to/war3.w3mod --hd path/to/war3.w3mod/_hd.w3mod
  ```

  It uploads only the game textures catalog models use (plus the team colour
  sets) and rewrites `src/data/game-textures.json`; commit that file.
  `resource:add` and `resource:check` warn when a model needs game textures
  that are not hosted yet.
```

- [ ] **Step 2: Update the Hive principles**

In `docs/hive-integration.md`, add a section before "## Automated access":

```markdown
## Game textures

To render models as they appear in game, wc3.dev hosts the base-game
textures that catalog models reference, and nothing more: no game models,
sounds, or other files. These are Blizzard Entertainment's assets. Blizzard
or its representatives can ask for them to be removed, and removal happens
promptly; models then render with stand-in textures.
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/hive-integration.md
git commit -m "Document previewers, the fixture store, and game-texture hosting"
```
