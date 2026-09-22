# Resource System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A view-only, maintainer-curated catalog of Warcraft III resources (models, icons, textures, audio, scripts, links) with browse/filter/detail views in the app shell, plus the Deno tooling that validates, previews, uploads, and records resources.

**Architecture:** Resource metadata is JSON in the `resources` content collection, validated by one shared Zod schema (`src/lib/resource-schema.ts`) that both Astro and the Deno scripts import. Binary files live in an S3-compatible asset store addressed by content-hashed keys; pages reference them through `assetUrl()` built on an `astro:env` variable. Pure logic (schema, sniffing, keys, WAV/PNG, filter state) is unit-tested; test fixtures render only in `deno task build:test`.

**Tech Stack:** Deno 2.9, Astro 7.3 (`astro:content` glob loader, `astro:env`), Zod 4 via `astro/zod`, `mdx-m3-viewer-th` 5.13.4 (MDX/MDL/BLP/DDS parsers), `aws4fetch` 1.0.20 (S3 signing), `jsr:@std/http` file server, lucide-astro.

**Spec:** `docs/superpowers/specs/2026-09-22-resource-system-design.md` (app shell context: `docs/superpowers/specs/2026-09-22-app-shell-design.md`)

## Global Constraints

- View-only: no download links, `download` attributes, file names, sizes, or hashes in any rendered UI. Store URLs appear only in preview `img src` and the `data-files` attribute of `#resource-preview`.
- `source.url` is required on every resource and is the primary action on its detail page.
- Resource types: `model | icon | texture | audio | script | link`; URL segments `models | icons | textures | audio | scripts`.
- Store key format: `resources/<type>/<slug>/<first 12 hex of sha256>/<file name>`; uploaded with `Cache-Control: public, max-age=31536000, immutable`.
- Slugs are lowercase kebab-case, equal to the JSON file name, unique across all types.
- Only the owner adds resources; there is no submission form.
- Deno tasks only; never npm/node commands or npm lockfiles. Dependencies go in `package.json` and `deno.lock` (run `deno install` to update the lock).
- Starlight forces Astro's `scopedStyleStrategy: "where"`: put styles in global CSS files under `src/styles/`, not scoped `<style>` blocks.
- Every `localStorage` access is wrapped in try/catch.
- Stop a running dev server (`deno run -A npm:astro dev stop`) before `deno task check`/`build`.
- Commit messages end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/resource-schema.ts` | Zod schemas (authored + full), type constants and labels — shared by Astro and Deno |
| `src/lib/resources.ts` | Astro-side collection queries, entry type guards, view helpers |
| `src/lib/assets.ts` | `assetUrl(key)` from `ASSET_BASE_URL` |
| `src/content.config.ts` | Collection loader (fixtures gated by `RESOURCE_FIXTURES`) |
| `src/content/resources/link/*.json` | Migrated curated links |
| `src/content/resources/_fixtures/<type>/fixture-*.json` | Build-test fixtures |
| `src/components/ResourceDirectory.astro` | Link rows (home and resources page) |
| `src/components/resources/{TypeIcon,TypeNav,ResourceCard,CatalogFilters,ResourceCatalog}.astro` | Catalog and detail building blocks |
| `src/pages/resources/index.astro`, `[type]/index.astro`, `[type]/[slug].astro` | Browser, type pages, detail |
| `src/scripts/resources/filter-state.ts` | Pure filter state ⇄ query string, card matching |
| `src/scripts/resources/catalog.ts` | Client filtering and grid/list toggle |
| `src/styles/resources.css` | Catalog and detail styles |
| `scripts/resources/{sniff,keys,wav,png,images,model-meta,store,add,check,testdata}.ts` | Intake tooling |
| `scripts/resources/*_test.ts` | Unit and integration tests |
| `docs/hive-integration.md` | Hive Workshop principles |

---

### Task 1: Resource schema, link migration, and test fixtures

**Files:**
- Create: `src/lib/resource-schema.ts`, `src/lib/resources.ts`, `scripts/resources/schema_test.ts`, `src/content/resources/link/{hive-workshop,jassbot,lua-reference,w3ts,wcsharp}.json`, `src/content/resources/_fixtures/{model/fixture-footman,icon/fixture-sword-icon,texture/fixture-grass-tile,audio/fixture-horn,script/fixture-damage-lib}.json`
- Modify: `src/content.config.ts`, `src/components/ResourceDirectory.astro`, `src/pages/index.astro`, `src/pages/resources/index.astro`, `deno.json`, `.github/workflows/check.yml`, `scripts/site_test.ts`
- Delete: `src/content/resources/{hive,jassbot,lua,w3ts,wcsharp}.json`

**Interfaces:**
- Produces (`src/lib/resource-schema.ts`): `HOSTED_TYPES`, `type HostedType`, `TYPE_SEGMENTS`, `TYPE_NAMES`, `TYPE_PLURALS`, `ICON_VARIANTS`, `STORE_KEY` (RegExp), `authoredSchema`, `resourceSchema`, `type Resource`, `type AuthoredResource`.
- Produces (`src/lib/resources.ts`): `type ResourceEntry`, `type HostedData`, `type HostedEntry`, `type LinkEntry`, `isHosted(entry)`, `isLink(entry)`, `getResources(): Promise<ResourceEntry[]>` (newest first), `getLinks(): Promise<LinkEntry[]>` (by `order`).
- Produces tasks: `build:test` (fixtures + placeholder `ASSET_BASE_URL=https://assets.example.test/`), `test` (runs `build:test` then all tests), `test:unit`.

- [ ] **Step 1: Write the failing schema tests**

`scripts/resources/schema_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { authoredSchema, resourceSchema } from '../../src/lib/resource-schema.ts';

const model = {
  type: 'model',
  title: 'Footman',
  summary: 'A footman.',
  authors: [{ name: 'Blizzard Entertainment' }],
  source: { site: 'hive', url: 'https://www.hiveworkshop.com/threads/footman.1/' },
  compat: { sd: true, hd: true },
  kind: 'unit',
  files: [{ key: 'resources/model/footman/0123456789ab/Footman.mdx', role: 'model', format: 'mdx', bytes: 10 }],
  added: '2026-09-22',
};

const link = {
  type: 'link',
  title: 'Hive Workshop',
  summary: 'The main community hub.',
  source: { site: 'hive', url: 'https://www.hiveworkshop.com/' },
  category: 'Community',
  order: 1,
  added: '2026-09-22',
};

Deno.test('a complete model parses with defaults applied', () => {
  const resource = resourceSchema.parse(model);
  assert.equal(resource.type, 'model');
  assert.deepEqual(resource.tags, []);
  assert.deepEqual(resource.related, []);
  assert.equal(resource.derivative, false);
  assert(resource.type === 'model');
  assert.deepEqual(resource.animations, []);
});

Deno.test('every resource needs a source url', () => {
  assert.throws(() => resourceSchema.parse({ ...model, source: undefined }));
  assert.throws(() => resourceSchema.parse({ ...model, source: { site: 'hive' } }));
  assert.throws(() => resourceSchema.parse({ ...link, source: { site: 'other', url: 'not a url' } }));
});

Deno.test('hosted resources need an author and a file', () => {
  assert.throws(() => resourceSchema.parse({ ...model, authors: [] }));
  assert.throws(() => resourceSchema.parse({ ...model, files: [] }));
});

Deno.test('store keys must follow the resource layout', () => {
  const file = (key: string) => ({ ...model, files: [{ ...model.files[0], key }] });
  assert.throws(() => resourceSchema.parse(file('Footman.mdx')));
  assert.throws(() => resourceSchema.parse(file('resources/model/Footman/0123456789ab/Footman.mdx')));
  assert.throws(() => resourceSchema.parse(file('resources/model/footman/0123/Footman.mdx')));
  assert.doesNotThrow(() => resourceSchema.parse(file('resources/model/footman/0123456789ab/Foot man.mdx')));
});

Deno.test('links need no files, compat, or authors', () => {
  const resource = resourceSchema.parse(link);
  assert.equal(resource.type, 'link');
  assert.deepEqual(resource.authors, []);
});

Deno.test('authored input leaves out generated fields', () => {
  const { files: _files, added: _added, ...authored } = model;
  assert.equal(authoredSchema.parse(authored).type, 'model');
  assert.throws(() => resourceSchema.parse(authored));
});

Deno.test('audio needs a duration once complete', () => {
  const audio = { ...model, type: 'audio', usage: 'sfx', kind: undefined, files: [{ key: 'resources/audio/horn/0123456789ab/horn.wav', role: 'audio', format: 'wav', bytes: 10 }] };
  assert.throws(() => resourceSchema.parse(audio));
  assert.equal(resourceSchema.parse({ ...audio, durationSec: 2.5 }).type, 'audio');
});

Deno.test('tags, dates, and variants are validated', () => {
  assert.throws(() => resourceSchema.parse({ ...model, tags: ['Night Elf'] }));
  assert.throws(() => resourceSchema.parse({ ...model, added: '22/09/2026' }));
  assert.throws(() => resourceSchema.parse({ ...model, type: 'icon', variants: ['HUGE'] }));
});
```

In `deno.json`, replace the `test` and `test:unit` tasks and add `build:test`:

```json
    "build:test": "RESOURCE_FIXTURES=1 ASSET_BASE_URL=https://assets.example.test/ deno task build",
    "test": "deno task build:test && deno test -A scripts/",
    "test:unit": "deno test -A scripts/shell_test.ts scripts/resources/",
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `deno task test:unit`
Expected: FAIL — cannot resolve `src/lib/resource-schema.ts`.

- [ ] **Step 3: Implement the schema**

`src/lib/resource-schema.ts`:

```ts
import { z } from 'astro/zod';

export const HOSTED_TYPES = ['model', 'icon', 'texture', 'audio', 'script'] as const;
export type HostedType = typeof HOSTED_TYPES[number];

export const TYPE_SEGMENTS: Record<HostedType, string> = { model: 'models', icon: 'icons', texture: 'textures', audio: 'audio', script: 'scripts' };
export const TYPE_NAMES: Record<HostedType, string> = { model: 'Model', icon: 'Icon', texture: 'Texture', audio: 'Audio', script: 'Script' };
export const TYPE_PLURALS: Record<HostedType, string> = { model: 'Models', icon: 'Icons', texture: 'Textures', audio: 'Audio', script: 'Scripts' };
export const ICON_VARIANTS = ['BTN', 'DISBTN', 'PAS', 'DISPAS', 'ATC', 'DISATC', 'ATT', 'UPG'] as const;

/** `resources/<type>/<slug>/<12 hex of sha256>/<file name>` */
export const STORE_KEY = /^resources\/(model|icon|texture|audio|script)\/[a-z0-9]+(-[a-z0-9]+)*\/[0-9a-f]{12}\/[^/\\?#%]+$/;

const tag = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Tags are lowercase kebab-case');
const isoDate = z.iso.date();
const author = z.object({ name: z.string().min(1), url: z.url().optional() });
const source = z.object({
  site: z.enum(['hive', 'github', 'other']),
  url: z.url(),
  label: z.string().min(1).optional(),
});
const compat = z.object({
  sd: z.boolean(),
  hd: z.boolean(),
  minPatch: z.string().regex(/^\d+\.\d+(\.\d+)?$/).optional(),
});
const storedFile = z.object({
  key: z.string().regex(STORE_KEY),
  role: z.string().min(1),
  format: z.string().min(1),
  bytes: z.number().int().positive(),
});
const preview = z.object({
  key: z.string().regex(STORE_KEY),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const common = {
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(280),
  tags: z.array(tag).default([]),
  source,
  permission: z.string().min(1).optional(),
  derivative: z.boolean().default(false),
  related: z.array(z.string()).default([]),
};
const hosted = { ...common, authors: z.array(author).min(1), compat };

const modelAuthored = z.object({
  type: z.literal('model'),
  ...hosted,
  kind: z.enum(['unit', 'building', 'doodad', 'effect', 'missile', 'item', 'portrait', 'other']),
});
const iconAuthored = z.object({ type: z.literal('icon'), ...hosted, variants: z.array(z.enum(ICON_VARIANTS)).min(1) });
const textureAuthored = z.object({
  type: z.literal('texture'),
  ...hosted,
  usage: z.enum(['skin', 'tileset', 'sky', 'loading-screen', 'ui', 'other']),
});
const audioAuthored = z.object({
  type: z.literal('audio'),
  ...hosted,
  usage: z.enum(['music', 'sfx', 'voice', 'ambient']),
  // Read from WAV headers by resource:add; author it for other formats.
  durationSec: z.number().positive().optional(),
});
const scriptAuthored = z.object({
  type: z.literal('script'),
  ...hosted,
  language: z.enum(['jass', 'vjass', 'lua', 'typescript']),
  requires: z.array(z.string().min(1)).default([]),
});
const linkAuthored = z.object({
  type: z.literal('link'),
  ...common,
  authors: z.array(author).default([]),
  category: z.enum(['Community', 'Tooling', 'Scripting']),
  order: z.number().int().nonnegative(),
});

/** What the owner writes in `resource.json`; resource:add generates the rest. */
export const authoredSchema = z.discriminatedUnion('type', [
  modelAuthored, iconAuthored, textureAuthored, audioAuthored, scriptAuthored, linkAuthored,
]);

const generated = { files: z.array(storedFile).min(1), preview: preview.optional(), added: isoDate, updated: isoDate.optional() };

/** A complete resource as stored in `src/content/resources/<type>/<slug>.json`. */
export const resourceSchema = z.discriminatedUnion('type', [
  modelAuthored.extend({ ...generated, animations: z.array(z.string()).default([]), textures: z.array(z.string()).default([]) }),
  iconAuthored.extend(generated),
  textureAuthored.extend(generated),
  audioAuthored.extend({ ...generated, durationSec: z.number().positive() }),
  scriptAuthored.extend(generated),
  linkAuthored.extend({ added: isoDate, updated: isoDate.optional() }),
]);

export type Resource = z.infer<typeof resourceSchema>;
export type AuthoredResource = z.infer<typeof authoredSchema>;
```

- [ ] **Step 4: Run the schema tests**

Run: `deno task test:unit`
Expected: all schema tests PASS (plus the 12 shell tests).

- [ ] **Step 5: Wire the collection, migrate links, add fixtures**

Replace `src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { resourceSchema } from './lib/resource-schema';

// Read through globalThis so this file type-checks without Node or Deno typings.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

const docs = defineCollection({ loader: docsLoader(), schema: docsSchema() });
const i18n = defineCollection({ loader: i18nLoader(), schema: i18nSchema() });
const resources = defineCollection({
  loader: glob({
    // Test fixtures render only in `deno task build:test`, never in production builds.
    pattern: env.RESOURCE_FIXTURES ? '**/*.json' : ['**/*.json', '!_fixtures/**'],
    base: './src/content/resources',
    // The slug is the file name, whatever folder the file sits in.
    generateId: ({ entry }) => entry.split('/').at(-1)!.replace(/\.json$/, ''),
  }),
  schema: resourceSchema,
});
export const collections = { docs, i18n, resources };
```

Delete the five old files and create their replacements in `src/content/resources/link/` (summary = old `description`, `source.url` = old `url`, old `label` dropped):

`hive-workshop.json`:
```json
{
  "type": "link",
  "title": "Hive Workshop",
  "summary": "Find custom maps, models, spells, and tutorials. The main hub of the Warcraft III modding community.",
  "source": { "site": "hive", "url": "https://www.hiveworkshop.com/" },
  "category": "Community",
  "order": 1,
  "added": "2026-09-22"
}
```

`lua-reference.json`:
```json
{
  "type": "link",
  "title": "Lua Reference",
  "summary": "The official Lua 5.3 reference manual. Look up language syntax, tables, functions, and metatables.",
  "source": { "site": "other", "url": "https://www.lua.org/manual/5.3/" },
  "category": "Scripting",
  "order": 2,
  "added": "2026-09-22"
}
```

`w3ts.json`:
```json
{
  "type": "link",
  "title": "w3ts",
  "summary": "Object-oriented TypeScript wrappers for Warcraft III natives.",
  "source": { "site": "github", "url": "https://github.com/cipherxof/w3ts" },
  "category": "Scripting",
  "order": 4,
  "added": "2026-09-22"
}
```

`wcsharp.json`:
```json
{
  "type": "link",
  "title": "WCSharp",
  "summary": "Simplify the process of programming maps for WarCraft 3 in C#.",
  "source": { "site": "github", "url": "https://github.com/Orden4/WCSharp" },
  "category": "Scripting",
  "order": 5,
  "added": "2026-09-22"
}
```

`jassbot.json`:
```json
{
  "type": "link",
  "title": "Jassbot",
  "summary": "JASS2 API search engine.",
  "source": { "site": "other", "url": "https://lep.nrw/jassbot/" },
  "category": "Scripting",
  "order": 6,
  "added": "2026-09-22"
}
```

Create the fixtures under `src/content/resources/_fixtures/`:

`model/fixture-footman.json`:
```json
{
  "type": "model",
  "title": "Fixture Footman",
  "summary": "Test fixture: a human footman model.",
  "tags": ["human", "unit"],
  "authors": [{ "name": "Fixture Author", "url": "https://example.com/fixture-author" }],
  "source": { "site": "hive", "url": "https://www.hiveworkshop.com/threads/fixture-footman.1/" },
  "permission": "Test fixture; not a real resource.",
  "compat": { "sd": true, "hd": false, "minPatch": "1.31" },
  "kind": "unit",
  "animations": ["Stand", "Walk", "Attack"],
  "textures": ["Textures\\Footman.blp"],
  "files": [
    { "key": "resources/model/fixture-footman/0123456789ab/Footman.mdx", "role": "model", "format": "mdx", "bytes": 2048 },
    { "key": "resources/model/fixture-footman/1123456789ab/Footman.blp", "role": "texture", "format": "blp", "bytes": 4096 }
  ],
  "preview": { "key": "resources/model/fixture-footman/2123456789ab/preview.png", "width": 256, "height": 256 },
  "added": "2026-09-01",
  "related": ["fixture-sword-icon"]
}
```

`icon/fixture-sword-icon.json`:
```json
{
  "type": "icon",
  "title": "Fixture Sword Icon",
  "summary": "Test fixture: a sword command button.",
  "tags": ["weapon", "human"],
  "authors": [{ "name": "Fixture Author" }],
  "source": { "site": "hive", "url": "https://www.hiveworkshop.com/threads/fixture-sword.2/" },
  "compat": { "sd": true, "hd": true },
  "variants": ["BTN", "DISBTN"],
  "files": [{ "key": "resources/icon/fixture-sword-icon/3123456789ab/BTNSword.blp", "role": "icon", "format": "blp", "bytes": 1024 }],
  "preview": { "key": "resources/icon/fixture-sword-icon/4123456789ab/preview.png", "width": 64, "height": 64 },
  "added": "2026-09-02",
  "updated": "2026-09-10"
}
```

`texture/fixture-grass-tile.json` (no preview, to exercise the icon fallback):
```json
{
  "type": "texture",
  "title": "Fixture Grass Tile",
  "summary": "Test fixture: a grass tileset texture without a preview image.",
  "tags": ["terrain"],
  "authors": [{ "name": "Second Fixture Author" }],
  "source": { "site": "other", "url": "https://example.com/fixture-grass" },
  "derivative": true,
  "compat": { "sd": false, "hd": true },
  "usage": "tileset",
  "files": [{ "key": "resources/texture/fixture-grass-tile/5123456789ab/Grass.dds", "role": "texture", "format": "dds", "bytes": 8192 }],
  "added": "2026-09-03"
}
```

`audio/fixture-horn.json`:
```json
{
  "type": "audio",
  "title": "Fixture Horn",
  "summary": "Test fixture: a war horn sound effect.",
  "tags": ["orc"],
  "authors": [{ "name": "Fixture Author" }],
  "source": { "site": "hive", "url": "https://www.hiveworkshop.com/threads/fixture-horn.3/" },
  "compat": { "sd": true, "hd": true },
  "usage": "sfx",
  "durationSec": 2.5,
  "files": [{ "key": "resources/audio/fixture-horn/6123456789ab/Horn.wav", "role": "audio", "format": "wav", "bytes": 40044 }],
  "added": "2026-09-04"
}
```

`script/fixture-damage-lib.json`:
```json
{
  "type": "script",
  "title": "Fixture Damage Library",
  "summary": "Test fixture: a Lua damage detection library.",
  "tags": ["system"],
  "authors": [{ "name": "Fixture Author" }],
  "source": { "site": "github", "url": "https://github.com/example/fixture-damage-lib" },
  "compat": { "sd": true, "hd": true, "minPatch": "1.31" },
  "language": "lua",
  "requires": ["Global Initialization"],
  "files": [{ "key": "resources/script/fixture-damage-lib/7123456789ab/DamageLib.lua", "role": "script", "format": "lua", "bytes": 512 }],
  "added": "2026-09-05"
}
```

- [ ] **Step 6: Add collection helpers and update the link views**

`src/lib/resources.ts`:

```ts
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Resource } from './resource-schema';

export type ResourceEntry = CollectionEntry<'resources'>;
export type HostedData = Exclude<Resource, { type: 'link' }>;
export type HostedEntry = ResourceEntry & { data: HostedData };
export type LinkEntry = ResourceEntry & { data: Extract<Resource, { type: 'link' }> };

export const isHosted = (entry: ResourceEntry): entry is HostedEntry => entry.data.type !== 'link';
export const isLink = (entry: ResourceEntry): entry is LinkEntry => entry.data.type === 'link';

const lastChange = (entry: ResourceEntry) => entry.data.updated ?? entry.data.added;

/** All resources, most recently added or updated first. */
export async function getResources(): Promise<ResourceEntry[]> {
  return (await getCollection('resources'))
    .sort((a, b) => lastChange(b).localeCompare(lastChange(a)) || a.data.title.localeCompare(b.data.title));
}

/** Curated external links in their display order. */
export async function getLinks(): Promise<LinkEntry[]> {
  return (await getCollection('resources')).filter(isLink).sort((a, b) => a.data.order - b.data.order);
}
```

`src/components/ResourceDirectory.astro` — change the props type and field names:

```astro
---
import { ArrowUpRight, CodeXml, Terminal, Users } from 'lucide-astro';
import type { LinkEntry } from '../lib/resources';
interface Props { resources: LinkEntry[]; title: string; id: string }
const { resources, title, id } = Astro.props;
const icons = { Community: Users, Tooling: Terminal, Scripting: CodeXml };
---
<section class="resource-directory" id={id} aria-labelledby={`${id}-title`}>
  <header class="workspace-panel-heading"><h2 id={`${id}-title`}>{title}</h2><span>{resources.length} {resources.length === 1 ? 'resource' : 'resources'}</span></header>
  <div class="directory-columns" aria-hidden="true"><span>Resource</span><span>Category</span><span></span></div>
  <ul class="directory-list">
    {resources.map(({ data }) => { const Icon = icons[data.category]; return (
      <li><a class="directory-row" href={data.source.url}>
        <div class="directory-resource"><Icon size={20} strokeWidth={1.6} /><div><h3>{data.title}</h3><p>{data.summary}</p></div></div>
        <span class="resource-category">{data.category}</span><ArrowUpRight class="resource-external" size={17} />
      </a></li>
    ); })}
  </ul>
</section>
```

In `src/pages/index.astro`, replace the `getCollection` import and the `resources` line with:

```ts
import { getLinks } from '../lib/resources';
const resources = await getLinks();
```

In `src/pages/resources/index.astro` (temporary until Task 7), replace the `getCollection` import and the `resources` line the same way.

- [ ] **Step 7: Update the build test and CI**

In `scripts/site_test.ts`, after `assert.match(homepage, /w3ts framework/);` add:

```ts
  for (const title of ['Lua Reference', 'w3ts', 'WCSharp', 'Jassbot']) assert(homepage.includes(title), `Missing link ${title}`);
```

Replace the steps after `deno install --frozen` in `.github/workflows/check.yml`:

```yaml
      - run: deno install --frozen
      - run: deno task check
      - run: deno task test
      - run: deno task build
```

(`test` builds with fixtures; the final `build` proves the production build works without them.)

- [ ] **Step 8: Check, build, and test**

Run: `deno task check; deno task test; deno task build`
Expected: 0 errors; all tests PASS; production build succeeds. Confirm fixtures are excluded from production: `grep -rl "Fixture Footman" dist` prints nothing.

- [ ] **Step 9: Commit**

```bash
git add -A src/lib src/content src/content.config.ts src/components/ResourceDirectory.astro src/pages scripts deno.json .github
git commit -m "Add the resource schema, migrate curated links, and add test fixtures"
```

---

### Task 2: File sniffing, store keys, WAV duration, PNG encoding

**Files:**
- Create: `scripts/resources/sniff.ts`, `scripts/resources/keys.ts`, `scripts/resources/wav.ts`, `scripts/resources/png.ts`, `scripts/resources/tooling_test.ts`

**Interfaces:**
- Produces:
  - `sniff.ts`: `type FileFormat = 'mdx' | 'mdl' | 'blp' | 'dds' | 'tga' | 'png' | 'wav' | 'mp3' | 'ogg' | 'flac' | 'jass' | 'lua' | 'ts'`, `sniff(fileName: string, bytes: Uint8Array): FileFormat | null`
  - `keys.ts`: `isSlug(value: string): boolean`, `sha256Hex(bytes: Uint8Array): Promise<string>`, `storeKey(type: string, slug: string, hashHex: string, fileName: string): string`
  - `wav.ts`: `wavDurationSec(bytes: Uint8Array): number | null`
  - `png.ts`: `encodePng(width: number, height: number, rgba: Uint8Array): Promise<Uint8Array>`, `pngSize(bytes: Uint8Array): { width: number; height: number }`

- [ ] **Step 1: Write the failing tests**

`scripts/resources/tooling_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { sniff } from './sniff.ts';
import { isSlug, sha256Hex, storeKey } from './keys.ts';
import { wavDurationSec } from './wav.ts';
import { encodePng, pngSize } from './png.ts';

const bytes = (text: string, extra: number[] = []) => new Uint8Array([...new TextEncoder().encode(text), ...extra]);

/** 16-bit mono PCM WAV of silence. */
function wav(seconds: number, sampleRate = 8000): Uint8Array {
  const dataSize = seconds * sampleRate * 2;
  const buffer = new Uint8Array(44 + dataSize);
  const view = new DataView(buffer.buffer);
  buffer.set(new TextEncoder().encode('RIFF'), 0);
  view.setUint32(4, 36 + dataSize, true);
  buffer.set(new TextEncoder().encode('WAVEfmt '), 8);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  buffer.set(new TextEncoder().encode('data'), 36);
  view.setUint32(40, dataSize, true);
  return buffer;
}

Deno.test('sniff accepts files whose contents match their extension', () => {
  assert.equal(sniff('Footman.mdx', bytes('MDLX', [0, 0])), 'mdx');
  assert.equal(sniff('Footman.mdl', bytes('// comment\nVersion {\n\tFormatVersion 800,\n}\n')), 'mdl');
  assert.equal(sniff('BTNSword.BLP', bytes('BLP1', [0, 0])), 'blp');
  assert.equal(sniff('Grass.dds', bytes('DDS ', [0])), 'dds');
  assert.equal(sniff('preview.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'png');
  assert.equal(sniff('Horn.wav', wav(1)), 'wav');
  assert.equal(sniff('Theme.mp3', bytes('ID3', [3, 0])), 'mp3');
  assert.equal(sniff('Theme.mp3', new Uint8Array([0xff, 0xfb, 0x90, 0x00])), 'mp3');
  assert.equal(sniff('Theme.ogg', bytes('OggS', [0])), 'ogg');
  assert.equal(sniff('Theme.flac', bytes('fLaC', [0])), 'flac');
  assert.equal(sniff('Lib.j', bytes('function Foo takes nothing returns nothing\nendfunction\n')), 'jass');
  assert.equal(sniff('Lib.lua', bytes('local x = 1\n')), 'lua');
  assert.equal(sniff('lib.ts', bytes('export const x = 1;\n')), 'ts');
  const tga = new Uint8Array(18);
  tga[2] = 2;
  tga[16] = 32;
  assert.equal(sniff('Skin.tga', tga), 'tga');
});

Deno.test('sniff rejects mismatches, BLP2, binary scripts, and unknown extensions', () => {
  assert.equal(sniff('Footman.mdx', bytes('BLP1')), null);
  assert.equal(sniff('Sword.blp', bytes('BLP2')), null);
  assert.equal(sniff('Lib.lua', new Uint8Array([0x6c, 0x00, 0x61])), null);
  assert.equal(sniff('Lib.lua', new Uint8Array()), null);
  assert.equal(sniff('Lib.lua', new Uint8Array([0xc3, 0x28])), null);
  assert.equal(sniff('Footman.mdl', bytes('Model "x" {}')), null);
  assert.equal(sniff('readme.txt', bytes('hello')), null);
  assert.equal(sniff('Horn.wav', bytes('RIFF')), null);
});

Deno.test('store keys follow the resource layout and refuse unsafe names', async () => {
  const hash = await sha256Hex(bytes('abc'));
  assert.equal(hash, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(storeKey('model', 'footman', hash, 'Footman.mdx'), 'resources/model/footman/ba7816bf8f01/Footman.mdx');
  assert.throws(() => storeKey('model', 'Footman', hash, 'Footman.mdx'));
  assert.throws(() => storeKey('model', 'footman', hash, '../Footman.mdx'));
  assert.throws(() => storeKey('model', 'footman', hash, 'a\\b.mdx'));
  assert.throws(() => storeKey('model', 'footman', hash, ''));
  assert(isSlug('night-elf-archer'));
  assert(!isSlug('night--elf'));
  assert(!isSlug('-archer'));
});

Deno.test('wavDurationSec reads PCM headers', () => {
  assert.equal(wavDurationSec(wav(3)), 3);
  assert.equal(wavDurationSec(bytes('RIFF....WAVE')), null);
});

Deno.test('encodePng writes a valid PNG that round-trips the pixels', async () => {
  const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 0]);
  const png = await encodePng(2, 2, rgba);
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.deepEqual(pngSize(png), { width: 2, height: 2 });
  assert.equal(new TextDecoder().decode(png.subarray(12, 16)), 'IHDR');
  assert.equal(png[24], 8);
  assert.equal(png[25], 6);
  const idatLength = new DataView(png.buffer).getUint32(33);
  assert.equal(new TextDecoder().decode(png.subarray(37, 41)), 'IDAT');
  const stream = new Blob([png.subarray(41, 41 + idatLength)]).stream().pipeThrough(new DecompressionStream('deflate'));
  const raw = new Uint8Array(await new Response(stream).arrayBuffer());
  assert.deepEqual([...raw], [0, ...rgba.subarray(0, 8), 0, ...rgba.subarray(8)]);
  assert.equal(new TextDecoder().decode(png.subarray(-8, -4)), 'IEND');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `deno test -A scripts/resources/tooling_test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the modules**

`scripts/resources/sniff.ts`:

```ts
export type FileFormat = 'mdx' | 'mdl' | 'blp' | 'dds' | 'tga' | 'png' | 'wav' | 'mp3' | 'ogg' | 'flac' | 'jass' | 'lua' | 'ts';

const EXTENSIONS: Record<string, FileFormat> = {
  mdx: 'mdx', mdl: 'mdl', blp: 'blp', dds: 'dds', tga: 'tga', png: 'png',
  wav: 'wav', mp3: 'mp3', ogg: 'ogg', flac: 'flac', j: 'jass', lua: 'lua', ts: 'ts',
};

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

/** UTF-8 text without NUL bytes, or null for binary data. */
function text(bytes: Uint8Array): string | null {
  if (bytes.length === 0 || bytes.includes(0)) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

const CHECKS: Record<FileFormat, (bytes: Uint8Array) => boolean> = {
  mdx: (b) => ascii(b, 0, 4) === 'MDLX',
  mdl: (b) => /\bVersion\s*\{[^}]*FormatVersion/.test(text(b) ?? ''),
  // Warcraft III only uses BLP1; BLP2 is World of Warcraft's format.
  blp: (b) => ascii(b, 0, 4) === 'BLP1',
  dds: (b) => ascii(b, 0, 4) === 'DDS ',
  tga: (b) => b.length >= 18 && b[1] <= 1 && [1, 2, 3, 9, 10, 11].includes(b[2]) && [8, 15, 16, 24, 32].includes(b[16]),
  png: (b) => b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 3) === 'PNG',
  wav: (b) => b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WAVE',
  mp3: (b) => ascii(b, 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0),
  ogg: (b) => ascii(b, 0, 4) === 'OggS',
  flac: (b) => ascii(b, 0, 4) === 'fLaC',
  jass: (b) => text(b) !== null,
  lua: (b) => text(b) !== null,
  ts: (b) => text(b) !== null,
};

/** The format a file claims by its extension, if its contents agree; otherwise null. */
export function sniff(fileName: string, bytes: Uint8Array): FileFormat | null {
  const format = EXTENSIONS[fileName.split('.').pop()?.toLowerCase() ?? ''];
  return format && CHECKS[format](bytes) ? format : null;
}
```

`scripts/resources/keys.ts`:

```ts
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UNSAFE_NAME = /[/\\?#% -]/;

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
```

`scripts/resources/wav.ts`:

```ts
/** Duration of a WAV file in seconds (two decimals), or null when its header cannot be read. */
export function wavDurationSec(bytes: Uint8Array): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let byteRate = 0;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const id = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === 'fmt ' && size >= 16) byteRate = view.getUint32(offset + 16, true);
    if (id === 'data') return byteRate ? Math.round((size / byteRate) * 100) / 100 : null;
    offset += 8 + size + (size % 2);
  }
  return null;
}
```

`scripts/resources/png.ts`:

```ts
// Deno has no 2D canvas, so previews are encoded directly: RGBA, 8 bits per channel, no filtering.
const SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  // "deflate" is the zlib format PNG requires.
  const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodePng(width: number, height: number, rgba: Uint8Array): Promise<Uint8Array> {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header.set([8, 6, 0, 0, 0], 8);
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  const parts = [SIGNATURE, chunk('IHDR', header), chunk('IDAT', await deflate(raw)), chunk('IEND', new Uint8Array())];
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
```

- [ ] **Step 4: Run the tests**

Run: `deno test -A scripts/resources/tooling_test.ts`
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/resources
git commit -m "Add file sniffing, store keys, WAV duration, and PNG encoding for resources"
```

---

### Task 3: Texture decoding and model metadata

**Files:**
- Create: `scripts/resources/images.ts`, `scripts/resources/model-meta.ts`, `scripts/resources/testdata.ts`, `scripts/resources/parsers_test.ts`
- Modify: `package.json`, `deno.lock`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `images.ts`: `interface Rgba { width: number; height: number; data: Uint8Array }`, `PREVIEW_MAX = 512`, `pickMipmap(width, height, levels, max?): number`, `decodeTexture(format: 'blp' | 'dds', bytes: Uint8Array): Rgba` (throws on unsupported encodings)
  - `model-meta.ts`: `interface ModelMeta { animations: string[]; textures: string[] }`, `readModelMeta(source: Uint8Array | string): ModelMeta` (throws when the parser rejects the file)
  - `testdata.ts` (tests only): `makeMdx(animations?, textures?): Uint8Array`, `makeMdl(): string`, `makeBlp(): Uint8Array`, `makeDxt1Dds(): Uint8Array`, `makeWav(seconds, sampleRate?): Uint8Array`

- [ ] **Step 1: Add the parser dependency**

In `package.json` `dependencies`, add `"mdx-m3-viewer-th": "5.13.4"` (the same fork and version the w3ts-framework uses). Run `deno install` to update `deno.lock`.

- [ ] **Step 2: Write the fixture builders and failing tests**

`scripts/resources/testdata.ts`:

```ts
// Tiny, valid Warcraft III files built in memory so tests need no binary fixtures.
import ModelModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/model.js';
import SequenceModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/sequence.js';
import TextureModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/texture.js';

// This library publishes CommonJS modules with exports.default; Deno's default import is that exports object.
const Model = ModelModule.default;
const Sequence = SequenceModule.default;
const Texture = TextureModule.default;

function model(animations: string[], textures: string[]) {
  const result = new Model();
  result.version = 800;
  animations.forEach((name, index) => {
    const sequence = new Sequence();
    sequence.name = name;
    sequence.interval[0] = index * 1000;
    sequence.interval[1] = index * 1000 + 999;
    result.sequences.push(sequence);
  });
  for (const path of textures) {
    const texture = new Texture();
    texture.path = path;
    result.textures.push(texture);
  }
  return result;
}

export const makeMdx = (animations = ['Stand', 'Walk'], textures = ['Textures\\Footman.blp']): Uint8Array =>
  model(animations, textures).saveMdx();

export const makeMdl = (animations = ['Stand'], textures = ['Textures\\Footman.blp']): string =>
  model(animations, textures).saveMdl();

/** A 2×2 palettised BLP1 without alpha: palette 0 is black, palette 1 is blue; pixels are 0,1,1,0. */
export function makeBlp(): Uint8Array {
  const width = 2, height = 2, headerSize = 156, paletteSize = 1024;
  const bytes = new Uint8Array(headerSize + paletteSize + width * height);
  const view = new DataView(bytes.buffer);
  // magic 'BLP1', content 1 (direct), alphaBits 0, width, height, type 5, hasMipmaps 0
  [0x31504c42, 1, 0, width, height, 5, 0].forEach((value, index) => view.setInt32(index * 4, value, true));
  view.setInt32(7 * 4, headerSize + paletteSize, true);
  view.setInt32(23 * 4, width * height, true);
  bytes[headerSize + 4] = 255; // palette[1] is stored BGRA: blue = 255
  bytes.set([0, 1, 1, 0], headerSize + paletteSize);
  return bytes;
}

/** A 4×4 DXT1 DDS whose single block is solid red. */
export function makeDxt1Dds(): Uint8Array {
  const bytes = new Uint8Array(128 + 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x20534444, true); // 'DDS '
  view.setUint32(4, 124, true); // header size
  view.setUint32(8, 0x1007, true); // caps | height | width | pixel format
  view.setUint32(12, 4, true); // height
  view.setUint32(16, 4, true); // width
  view.setUint32(76, 32, true); // pixel format size
  view.setUint32(80, 0x4, true); // DDPF_FOURCC
  view.setUint32(84, 0x31545844, true); // 'DXT1'
  view.setUint16(128, 0xf800, true); // color0: pure red in RGB565
  view.setUint16(130, 0x0000, true); // color1: black
  view.setUint32(132, 0, true); // every texel uses color0
  return bytes;
}

/** 16-bit mono PCM WAV of silence. */
export function makeWav(seconds: number, sampleRate = 8000): Uint8Array {
  const dataSize = seconds * sampleRate * 2;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => bytes.set(new TextEncoder().encode(text), offset);
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  ascii(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, dataSize, true);
  return bytes;
}
```

`scripts/resources/parsers_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { decodeTexture, pickMipmap } from './images.ts';
import { readModelMeta } from './model-meta.ts';
import { makeBlp, makeDxt1Dds, makeMdl, makeMdx } from './testdata.ts';

Deno.test('readModelMeta lists sequences and unique texture paths from MDX', () => {
  const meta = readModelMeta(makeMdx(['Stand', 'Walk', 'Attack'], ['Textures\\Footman.blp', 'Textures\\Footman.blp']));
  assert.deepEqual(meta, { animations: ['Stand', 'Walk', 'Attack'], textures: ['Textures\\Footman.blp'] });
});

Deno.test('readModelMeta reads MDL text', () => {
  assert.deepEqual(readModelMeta(makeMdl(['Stand'])).animations, ['Stand']);
});

Deno.test('readModelMeta throws on garbage', () => {
  assert.throws(() => readModelMeta(new TextEncoder().encode('MDLX-not-really')));
});

Deno.test('decodeTexture decodes palettised BLP1 to RGBA', () => {
  const image = decodeTexture('blp', makeBlp());
  assert.equal(image.width, 2);
  assert.equal(image.height, 2);
  assert.deepEqual([...image.data.subarray(0, 8)], [0, 0, 0, 255, 0, 0, 255, 255]);
});

Deno.test('decodeTexture decodes DXT1 DDS to RGBA', () => {
  const image = decodeTexture('dds', makeDxt1Dds());
  assert.equal(image.data.length, 4 * 4 * 4);
  const [r, g, b, a] = image.data;
  assert(r > 200 && g === 0 && b === 0 && a === 255, `unexpected pixel ${[r, g, b, a]}`);
});

Deno.test('decodeTexture rejects non-image data', () => {
  assert.throws(() => decodeTexture('dds', new Uint8Array(200)));
});

Deno.test('pickMipmap chooses the first level at or under the preview size', () => {
  assert.equal(pickMipmap(64, 64, 1), 0);
  assert.equal(pickMipmap(2048, 1024, 12), 2);
  assert.equal(pickMipmap(2048, 2048, 1), 0);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `deno test -A scripts/resources/parsers_test.ts`
Expected: FAIL — `images.ts` / `model-meta.ts` not found.

- [ ] **Step 4: Implement the modules**

`scripts/resources/model-meta.ts`:

```ts
import ModelModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/model.js';

// This library publishes CommonJS modules with exports.default; Deno's default import is that exports object.
const Model = ModelModule.default;

export interface ModelMeta { animations: string[]; textures: string[] }

/** Reads sequence names and texture paths from MDX bytes or MDL text. Throws if the parser rejects the file. */
export function readModelMeta(source: Uint8Array | string): ModelMeta {
  const model = new Model();
  // The parser reads from offset 0 of the underlying buffer, so hand it an exact copy.
  model.load(typeof source === 'string' ? source : source.slice());
  return {
    animations: model.sequences.map((sequence) => sequence.name).filter(Boolean),
    textures: [...new Set(model.textures.map((texture) => texture.path).filter(Boolean))],
  };
}
```

`scripts/resources/images.ts`:

```ts
import { BlpImage } from 'mdx-m3-viewer-th/dist/cjs/parsers/blp/image.js';
import { DdsImage } from 'mdx-m3-viewer-th/dist/cjs/parsers/dds/image.js';

export interface Rgba { width: number; height: number; data: Uint8Array }

export const PREVIEW_MAX = 512;

/** The first mipmap level whose larger side is at most `max`, or the smallest level available. */
export function pickMipmap(width: number, height: number, levels: number, max = PREVIEW_MAX): number {
  let level = 0;
  while (level < levels - 1 && Math.max(width >> level, height >> level) > max) level++;
  return level;
}

/** Decodes a BLP1 or DDS texture to RGBA at preview size. Throws for encodings it cannot preview. */
export function decodeTexture(format: 'blp' | 'dds', bytes: Uint8Array): Rgba {
  // The parsers read from offset 0 of the underlying buffer, so hand them an exact copy.
  const copy = bytes.slice();
  if (format === 'blp') {
    const image = new BlpImage();
    image.load(copy);
    const mipmap = image.getMipmap(pickMipmap(image.width, image.height, Math.max(image.mipmaps(), 1)));
    return { width: mipmap.width, height: mipmap.height, data: new Uint8Array(mipmap.data) };
  }
  const image = new DdsImage();
  image.load(copy);
  const mipmap = image.getMipmap(pickMipmap(image.width, image.height, image.mipmaps()));
  // RGTC (normal maps) decodes to two channels, which cannot be shown as a preview.
  if (mipmap.data.length !== mipmap.width * mipmap.height * 4) throw new Error('Unsupported DDS encoding for previews.');
  return mipmap;
}
```

- [ ] **Step 5: Run the tests**

Run: `deno test -A scripts/resources/parsers_test.ts`
Expected: all 7 tests PASS. If the DDS garbage case logs from inside the library, that is acceptable; any other console noise is a failure to investigate.

- [ ] **Step 6: Commit**

```bash
git add package.json deno.lock scripts/resources
git commit -m "Decode BLP and DDS previews and read model metadata for resources"
```

---

### Task 4: Asset stores and `resource:add`

**Files:**
- Create: `scripts/resources/store.ts`, `scripts/resources/add.ts`, `scripts/resources/add_test.ts`
- Modify: `package.json`, `deno.lock`, `deno.json`, `.gitignore`

**Interfaces:**
- Consumes: `authoredSchema`, `resourceSchema`, `type Resource`, `type HostedType` (Task 1); `sniff`, `FileFormat`, `isSlug`, `sha256Hex`, `storeKey`, `wavDurationSec`, `encodePng`, `pngSize` (Task 2); `decodeTexture`, `readModelMeta`, test builders (Task 3).
- Produces:
  - `store.ts`: `interface AssetStore { readonly label: string; put(key: string, bytes: Uint8Array, contentType: string): Promise<void> }`, `CACHE_CONTROL`, `localStore(root: string): AssetStore`, `dryRunStore(log?): AssetStore`, `s3StoreFromEnv(env?): AssetStore`
  - `add.ts`: `ALLOWED_FORMATS`, `roleFor(type, format, fileName): string`, `interface AddOptions { folder; contentRoot; store; today; update?; write? }`, `interface AddResult { path: string; resource: Resource; warnings: string[] }`, `addResource(options): Promise<AddResult>`; CLI entry when run directly.
  - Tasks `resource:add`, `assets:serve`.

- [ ] **Step 1: Add the signing dependency and ignore the local store**

In `package.json` `dependencies`, add `"aws4fetch": "1.0.20"` and run `deno install`. Append `.asset-store/` to `.gitignore`.

- [ ] **Step 2: Write the failing integration tests**

`scripts/resources/add_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { join } from 'jsr:@std/path@^1';
import { addResource } from './add.ts';
import { dryRunStore, localStore } from './store.ts';
import { encodePng } from './png.ts';
import { makeBlp, makeMdx, makeWav } from './testdata.ts';

async function workspace() {
  const root = await Deno.makeTempDir({ prefix: 'wc3-resource-' });
  return { root, content: join(root, 'content'), store: join(root, 'store') };
}

async function folder(root: string, slug: string, authored: object, files: Record<string, Uint8Array>) {
  const dir = join(root, 'input', slug);
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(join(dir, 'resource.json'), JSON.stringify(authored));
  for (const [name, bytes] of Object.entries(files)) await Deno.writeFile(join(dir, name), bytes);
  return dir;
}

const hosted = {
  authors: [{ name: 'Tester' }],
  source: { site: 'hive', url: 'https://www.hiveworkshop.com/threads/test.1/' },
  compat: { sd: true, hd: false },
};

Deno.test('adds a model: uploads files, reads animations, uses the authored preview', async () => {
  const ws = await workspace();
  const dir = await folder(ws.root, 'test-footman', { type: 'model', title: 'Test Footman', summary: 'A test.', kind: 'unit', ...hosted }, {
    'Footman.mdx': makeMdx(['Stand', 'Walk']),
    'Footman.blp': makeBlp(),
    'preview.png': await encodePng(1, 1, new Uint8Array([1, 2, 3, 255])),
  });
  const result = await addResource({ folder: dir, contentRoot: ws.content, store: localStore(ws.store), today: '2026-09-22' });
  assert.equal(result.path, join(ws.content, 'model', 'test-footman.json'));
  const written = JSON.parse(await Deno.readTextFile(result.path));
  assert.equal(written.type, 'model');
  assert.deepEqual(written.animations, ['Stand', 'Walk']);
  assert.deepEqual(written.textures, ['Textures\\Footman.blp']);
  assert.equal(written.added, '2026-09-22');
  assert.deepEqual(written.files.map((file: { role: string; format: string }) => [file.role, file.format]).sort(), [['model', 'mdx'], ['texture', 'blp']]);
  assert.deepEqual([written.preview.width, written.preview.height], [1, 1]);
  for (const key of [...written.files.map((file: { key: string }) => file.key), written.preview.key]) {
    assert.match(key, /^resources\/model\/test-footman\/[0-9a-f]{12}\/[^/]+$/);
    assert((await Deno.stat(join(ws.store, ...key.split('/')))).isFile, `missing ${key}`);
  }
  assert.deepEqual(result.warnings, []);
});

Deno.test('adds an icon with a generated PNG preview', async () => {
  const ws = await workspace();
  const dir = await folder(ws.root, 'test-sword', { type: 'icon', title: 'Test Sword', summary: 'A test.', variants: ['BTN'], ...hosted }, { 'BTNSword.blp': makeBlp() });
  const { resource } = await addResource({ folder: dir, contentRoot: ws.content, store: localStore(ws.store), today: '2026-09-22' });
  assert(resource.type === 'icon' && resource.preview);
  assert.deepEqual([resource.preview.width, resource.preview.height], [2, 2]);
  assert.match(resource.preview.key, /\/preview\.png$/);
});

Deno.test('adds audio with its duration read from the WAV header', async () => {
  const ws = await workspace();
  const dir = await folder(ws.root, 'test-horn', { type: 'audio', title: 'Test Horn', summary: 'A test.', usage: 'sfx', ...hosted }, { 'Horn.wav': makeWav(2) });
  const { resource } = await addResource({ folder: dir, contentRoot: ws.content, store: localStore(ws.store), today: '2026-09-22' });
  assert(resource.type === 'audio');
  assert.equal(resource.durationSec, 2);
});

Deno.test('rejects files that are not what they claim, or wrong for the type', async () => {
  const ws = await workspace();
  const fake = await folder(ws.root, 'fake-model', { type: 'model', title: 'Fake', summary: 'A test.', kind: 'unit', ...hosted }, { 'Fake.mdx': new TextEncoder().encode('not a model') });
  await assert.rejects(() => addResource({ folder: fake, contentRoot: ws.content, store: dryRunStore(() => {}), today: '2026-09-22' }), /Fake\.mdx/);
  const wrong = await folder(ws.root, 'wrong-type', { type: 'icon', title: 'Wrong', summary: 'A test.', variants: ['BTN'], ...hosted }, { 'Horn.wav': makeWav(1) });
  await assert.rejects(() => addResource({ folder: wrong, contentRoot: ws.content, store: dryRunStore(() => {}), today: '2026-09-22' }), /Horn\.wav/);
});

Deno.test('refuses to overwrite without update, and keeps the added date on update', async () => {
  const ws = await workspace();
  const dir = await folder(ws.root, 'test-horn', { type: 'audio', title: 'Test Horn', summary: 'A test.', usage: 'sfx', ...hosted }, { 'Horn.wav': makeWav(1) });
  const store = localStore(ws.store);
  await addResource({ folder: dir, contentRoot: ws.content, store, today: '2026-09-01' });
  await assert.rejects(() => addResource({ folder: dir, contentRoot: ws.content, store, today: '2026-09-22' }), /--update/);
  const { resource } = await addResource({ folder: dir, contentRoot: ws.content, store, today: '2026-09-22', update: true });
  assert.equal(resource.added, '2026-09-01');
  assert.equal(resource.updated, '2026-09-22');
});

Deno.test('a dry run writes and uploads nothing', async () => {
  const ws = await workspace();
  const dir = await folder(ws.root, 'test-horn', { type: 'audio', title: 'Test Horn', summary: 'A test.', usage: 'sfx', ...hosted }, { 'Horn.wav': makeWav(1) });
  const planned: string[] = [];
  const result = await addResource({ folder: dir, contentRoot: ws.content, store: dryRunStore((line) => planned.push(line)), today: '2026-09-22', write: false });
  assert.equal(planned.length, 1);
  assert.match(planned[0], /resources\/audio\/test-horn\//);
  await assert.rejects(() => Deno.stat(result.path));
});

Deno.test('rejects bad slugs and link resources', async () => {
  const ws = await workspace();
  const badSlug = await folder(ws.root, 'Bad_Slug', { type: 'audio', title: 'x', summary: 'x', usage: 'sfx', ...hosted }, { 'Horn.wav': makeWav(1) });
  await assert.rejects(() => addResource({ folder: badSlug, contentRoot: ws.content, store: dryRunStore(() => {}), today: '2026-09-22' }), /kebab-case/);
  const link = await folder(ws.root, 'a-link', { type: 'link', title: 'x', summary: 'x', source: hosted.source, category: 'Community', order: 1 }, {});
  await assert.rejects(() => addResource({ folder: link, contentRoot: ws.content, store: dryRunStore(() => {}), today: '2026-09-22' }), /by hand/);
});
```

Run: `deno test -A scripts/resources/add_test.ts`
Expected: FAIL — `add.ts` / `store.ts` not found.

- [ ] **Step 3: Implement the stores**

`scripts/resources/store.ts`:

```ts
import { AwsClient } from 'aws4fetch';
import { dirname, join } from 'jsr:@std/path@^1';

export interface AssetStore {
  readonly label: string;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
}

/** Keys are content-addressed, so every object can be cached forever. */
export const CACHE_CONTROL = 'public, max-age=31536000, immutable';

export function localStore(root: string): AssetStore {
  return {
    label: `local folder ${root}`,
    async put(key, bytes) {
      const path = join(root, ...key.split('/'));
      await Deno.mkdir(dirname(path), { recursive: true });
      await Deno.writeFile(path, bytes);
    },
  };
}

export function dryRunStore(log: (line: string) => void = console.log): AssetStore {
  return {
    label: 'dry run',
    put(key, bytes, contentType) {
      log(`would upload ${key} (${bytes.length} bytes, ${contentType})`);
      return Promise.resolve();
    },
  };
}

/** An S3-compatible bucket (Cloudflare R2 recommended) configured through ASSET_STORE_* variables. */
export function s3StoreFromEnv(env: Pick<Deno.Env, 'get'> = Deno.env): AssetStore {
  const required = (name: string) => {
    const value = env.get(name);
    if (!value) throw new Error(`${name} is not set.`);
    return value;
  };
  const endpoint = required('ASSET_STORE_ENDPOINT').replace(/\/+$/, '');
  const bucket = required('ASSET_STORE_BUCKET');
  const client = new AwsClient({
    accessKeyId: required('ASSET_STORE_ACCESS_KEY_ID'),
    secretAccessKey: required('ASSET_STORE_SECRET_ACCESS_KEY'),
    service: 's3',
    region: env.get('ASSET_STORE_REGION') ?? 'auto',
  });
  return {
    label: `bucket ${bucket}`,
    async put(key, bytes, contentType) {
      const url = `${endpoint}/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
      const response = await client.fetch(url, {
        method: 'PUT',
        body: new Uint8Array(bytes),
        headers: { 'Content-Type': contentType, 'Cache-Control': CACHE_CONTROL },
      });
      if (!response.ok) throw new Error(`Upload of ${key} failed: ${response.status} ${await response.text()}`);
    },
  };
}
```

- [ ] **Step 4: Implement `add.ts`**

`scripts/resources/add.ts`:

```ts
import { basename, dirname, join } from 'jsr:@std/path@^1';
import { authoredSchema, type HostedType, type Resource, resourceSchema } from '../../src/lib/resource-schema.ts';
import { decodeTexture } from './images.ts';
import { isSlug, sha256Hex, storeKey } from './keys.ts';
import { readModelMeta } from './model-meta.ts';
import { encodePng, pngSize } from './png.ts';
import { type FileFormat, sniff } from './sniff.ts';
import { type AssetStore, dryRunStore, localStore, s3StoreFromEnv } from './store.ts';
import { wavDurationSec } from './wav.ts';

export const ALLOWED_FORMATS: Record<HostedType, FileFormat[]> = {
  model: ['mdx', 'mdl', 'blp', 'dds', 'tga'],
  icon: ['blp', 'dds', 'tga'],
  texture: ['blp', 'dds', 'tga'],
  audio: ['wav', 'mp3', 'ogg', 'flac'],
  script: ['jass', 'lua', 'ts'],
};

const CONTENT_TYPES: Record<FileFormat, string> = {
  mdx: 'application/octet-stream', mdl: 'text/plain; charset=utf-8', blp: 'application/octet-stream',
  dds: 'image/vnd-ms.dds', tga: 'image/x-tga', png: 'image/png', wav: 'audio/wav', mp3: 'audio/mpeg',
  ogg: 'audio/ogg', flac: 'audio/flac', jass: 'text/plain; charset=utf-8', lua: 'text/plain; charset=utf-8',
  ts: 'text/plain; charset=utf-8',
};

export function roleFor(type: HostedType, format: FileFormat, fileName: string): string {
  if (type !== 'model') return type;
  if (format !== 'mdx' && format !== 'mdl') return 'texture';
  return /_portrait\.md[xl]$/i.test(fileName) ? 'portrait' : 'model';
}

export interface AddOptions {
  folder: string;
  contentRoot: string;
  store: AssetStore;
  /** ISO date recorded as `added` (new) or `updated` (with `update`). */
  today: string;
  update?: boolean;
  /** Write the resource JSON; false for dry runs. Defaults to true. */
  write?: boolean;
}

export interface AddResult { path: string; resource: Resource; warnings: string[] }

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function readExisting(path: string): Promise<{ added?: string } | null> {
  try {
    return JSON.parse(await Deno.readTextFile(path));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return null;
    throw error;
  }
}

/** Validates, previews, uploads, and records one resource folder. */
export async function addResource(options: AddOptions): Promise<AddResult> {
  const { folder, contentRoot, store, today, update = false, write = true } = options;
  const slug = basename(folder);
  if (!isSlug(slug)) throw new Error(`Folder name "${slug}" must be a lowercase kebab-case slug.`);
  const authored = authoredSchema.parse(JSON.parse(await Deno.readTextFile(join(folder, 'resource.json'))));
  if (authored.type === 'link') throw new Error('Link resources are written by hand; resource:add only handles hosted files.');
  const type = authored.type;

  const path = join(contentRoot, type, `${slug}.json`);
  const existing = await readExisting(path);
  if (existing && !update) throw new Error(`${path} already exists; pass --update to replace it.`);

  const warnings: string[] = [];
  const files: { key: string; role: string; format: string; bytes: number }[] = [];
  let preview: { key: string; width: number; height: number } | undefined;
  let meta: { animations: string[]; textures: string[] } | undefined;
  let durationSec = authored.type === 'audio' ? authored.durationSec : undefined;

  const upload = async (fileName: string, bytes: Uint8Array, format: FileFormat) => {
    const key = storeKey(type, slug, await sha256Hex(bytes), fileName);
    await store.put(key, bytes, CONTENT_TYPES[format]);
    return key;
  };

  const authoredPreview = await Deno.readFile(join(folder, 'preview.png')).catch(() => null);
  if (authoredPreview) {
    if (sniff('preview.png', authoredPreview) !== 'png') throw new Error('preview.png is not a PNG image.');
    preview = { key: await upload('preview.png', authoredPreview, 'png'), ...pngSize(authoredPreview) };
  }

  const names: string[] = [];
  for await (const entry of Deno.readDir(folder)) {
    if (entry.isFile && entry.name !== 'resource.json' && entry.name !== 'preview.png') names.push(entry.name);
  }
  names.sort();

  for (const name of names) {
    const bytes = await Deno.readFile(join(folder, name));
    const format = sniff(name, bytes);
    if (!format || !ALLOWED_FORMATS[type].includes(format)) {
      throw new Error(`${name}: not a valid ${ALLOWED_FORMATS[type].join('/')} file for a ${type} resource.`);
    }
    const role = roleFor(type, format, name);
    files.push({ key: await upload(name, bytes, format), role, format, bytes: bytes.length });

    if (role === 'model' && !meta) {
      try {
        meta = readModelMeta(format === 'mdl' ? new TextDecoder().decode(bytes) : bytes);
      } catch (error) {
        warnings.push(`${name}: could not read animations (${message(error)}).`);
      }
    }
    if (format === 'wav' && durationSec === undefined) durationSec = wavDurationSec(bytes) ?? undefined;
    if ((type === 'icon' || type === 'texture') && !preview && (format === 'blp' || format === 'dds')) {
      try {
        const image = decodeTexture(format, bytes);
        const png = await encodePng(image.width, image.height, image.data);
        preview = { key: await upload('preview.png', png, 'png'), width: image.width, height: image.height };
      } catch (error) {
        warnings.push(`${name}: could not generate a preview (${message(error)}); add preview.png.`);
      }
    }
  }

  if (files.length === 0) throw new Error('No resource files found next to resource.json.');
  if (type === 'audio' && durationSec === undefined) throw new Error('Set durationSec in resource.json; it can only be read from WAV files.');
  if (!preview && type !== 'audio' && type !== 'script') warnings.push('No preview image: add preview.png to show a thumbnail.');

  const resource = resourceSchema.parse({
    ...authored,
    files,
    preview,
    ...(type === 'model' ? meta ?? { animations: [], textures: [] } : {}),
    ...(type === 'audio' ? { durationSec } : {}),
    added: existing?.added ?? today,
    ...(existing ? { updated: today } : {}),
  });

  if (write) {
    await Deno.mkdir(dirname(path), { recursive: true });
    await Deno.writeTextFile(path, JSON.stringify(resource, null, 2) + '\n');
  }
  return { path, resource, warnings };
}

if (import.meta.main) {
  const flags = new Set(Deno.args.filter((arg) => arg.startsWith('--')));
  const [folder, ...extra] = Deno.args.filter((arg) => !arg.startsWith('--'));
  const unknown = [...flags].filter((flag) => !['--dry-run', '--local', '--update'].includes(flag));
  if (!folder || extra.length || unknown.length) {
    console.error('Usage: deno task resource:add <folder> [--dry-run] [--local] [--update]');
    Deno.exit(2);
  }
  const dryRun = flags.has('--dry-run');
  try {
    const store = dryRun ? dryRunStore() : flags.has('--local') ? localStore('.asset-store') : s3StoreFromEnv();
    const result = await addResource({
      folder,
      contentRoot: 'src/content/resources',
      store,
      today: new Date().toISOString().slice(0, 10),
      update: flags.has('--update'),
      write: !dryRun,
    });
    for (const warning of result.warnings) console.warn(`warning: ${warning}`);
    console.log(dryRun ? JSON.stringify(result.resource, null, 2) : `Wrote ${result.path} (files in ${store.label}).`);
  } catch (error) {
    console.error(`error: ${message(error)}`);
    Deno.exit(1);
  }
}
```

In `deno.json` tasks, add:

```json
    "resource:add": "deno run -A scripts/resources/add.ts",
    "assets:serve": "mkdir -p .asset-store && deno run --allow-net --allow-read jsr:@std/http@^1/file-server .asset-store --host 127.0.0.1 --port 4322 --cors --no-dir-listing",
```

- [ ] **Step 5: Run the tests**

Run: `deno test -A scripts/resources/add_test.ts`
Expected: all 7 tests PASS.

- [ ] **Step 6: Smoke-test the CLI**

Create a scratch folder outside the repo named `smoke-horn` with a `resource.json` (`{"type":"audio","title":"Smoke","summary":"Smoke test.","usage":"sfx","authors":[{"name":"Me"}],"source":{"site":"other","url":"https://example.com/"},"compat":{"sd":true,"hd":true}}`) and any WAV (write one with `makeWav` via `deno eval`). Run `deno task resource:add <that folder> --dry-run`. Expected: one "would upload" line and the resource JSON printed; `git status` shows no new content files. Then `deno task resource:add <folder> --bogus` exits with the usage message. Delete the scratch folder.

- [ ] **Step 7: Commit**

```bash
git add package.json deno.lock deno.json .gitignore scripts/resources
git commit -m "Add the resource:add command with local, dry-run, and S3 asset stores"
```

---

### Task 5: `resource:check`

**Files:**
- Create: `scripts/resources/check.ts`, `scripts/resources/check_test.ts`
- Modify: `deno.json`, `.github/workflows/check.yml`

**Interfaces:**
- Consumes: `resourceSchema` (Task 1), `isSlug` (Task 2).
- Produces: `checkResources(root: string, options?: { remoteBase?: string; fetchFn?: typeof fetch }): Promise<string[]>` (empty = valid); task `resource:check [--remote]`.

- [ ] **Step 1: Write the failing tests**

`scripts/resources/check_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { join } from 'jsr:@std/path@^1';
import { checkResources } from './check.ts';

const icon = (related: string[] = []) => ({
  type: 'icon',
  title: 'Sword',
  summary: 'A sword.',
  authors: [{ name: 'Tester' }],
  source: { site: 'hive', url: 'https://www.hiveworkshop.com/threads/sword.1/' },
  compat: { sd: true, hd: true },
  variants: ['BTN'],
  files: [{ key: 'resources/icon/sword/0123456789ab/BTNSword.blp', role: 'icon', format: 'blp', bytes: 10 }],
  added: '2026-09-22',
  related,
});

async function tree(files: Record<string, unknown>) {
  const root = await Deno.makeTempDir({ prefix: 'wc3-check-' });
  for (const [path, data] of Object.entries(files)) {
    await Deno.mkdir(join(root, path, '..'), { recursive: true });
    await Deno.writeTextFile(join(root, path), typeof data === 'string' ? data : JSON.stringify(data));
  }
  return root;
}

Deno.test('a valid tree has no errors', async () => {
  assert.deepEqual(await checkResources(await tree({ 'icon/sword.json': icon() })), []);
});

Deno.test('reports schema errors, wrong folders, duplicate slugs, bad slugs, and missing related', async () => {
  const errors = await checkResources(await tree({
    'icon/sword.json': icon(['ghost']),
    'model/sword.json': icon(),
    'icon/Bad_Name.json': icon(),
    'icon/broken.json': { ...icon(), source: undefined },
    'icon/not-json.json': '{',
  }));
  const text = errors.join('\n');
  assert.match(text, /model\/sword\.json: type "icon" must live in an? "icon\/" folder/);
  assert.match(text, /slug "sword" is also used/);
  assert.match(text, /Bad_Name\.json: file name must be a lowercase kebab-case slug/);
  assert.match(text, /broken\.json: .*source/);
  assert.match(text, /not-json\.json: /);
  assert.match(text, /related resource "ghost" does not exist/);
});

Deno.test('remote mode reports keys missing from the store', async () => {
  const requested: string[] = [];
  const fetchFn = ((input: string | URL) => {
    requested.push(String(input));
    return Promise.resolve(new Response(null, { status: 404 }));
  }) as typeof fetch;
  const errors = await checkResources(await tree({ 'icon/sword.json': icon() }), { remoteBase: 'https://assets.example.test/', fetchFn });
  assert.deepEqual(requested, ['https://assets.example.test/resources/icon/sword/0123456789ab/BTNSword.blp']);
  assert.match(errors.join('\n'), /missing from the store: resources\/icon\/sword\/0123456789ab\/BTNSword\.blp \(404\)/);
});
```

Run: `deno test -A scripts/resources/check_test.ts`
Expected: FAIL — `check.ts` not found.

- [ ] **Step 2: Implement `check.ts`**

```ts
import { basename, join, relative } from 'jsr:@std/path@^1';
import { z } from 'astro/zod';
import { resourceSchema } from '../../src/lib/resource-schema.ts';
import { isSlug } from './keys.ts';

async function* jsonFiles(dir: string): AsyncGenerator<string> {
  const entries = [];
  for await (const entry of Deno.readDir(dir)) entries.push(entry);
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory) yield* jsonFiles(path);
    else if (entry.name.endsWith('.json')) yield path;
  }
}

const describe = (error: unknown) =>
  error instanceof z.ZodError ? z.prettifyError(error).replaceAll('\n', ' ') : error instanceof Error ? error.message : String(error);

/** Validates every resource file under `root`; returns human-readable errors (empty when valid). */
export async function checkResources(
  root: string,
  options: { remoteBase?: string; fetchFn?: typeof fetch } = {},
): Promise<string[]> {
  const errors: string[] = [];
  const slugs = new Map<string, string>();
  const related: [string, string[]][] = [];
  const keys: string[] = [];

  for await (const path of jsonFiles(root)) {
    const file = relative(root, path).replaceAll('\\', '/');
    const slug = basename(path, '.json');
    if (!isSlug(slug)) errors.push(`${file}: file name must be a lowercase kebab-case slug`);
    const owner = slugs.get(slug);
    if (owner) errors.push(`${file}: slug "${slug}" is also used by ${owner}`);
    else slugs.set(slug, file);

    let data;
    try {
      data = resourceSchema.parse(JSON.parse(await Deno.readTextFile(path)));
    } catch (error) {
      errors.push(`${file}: ${describe(error)}`);
      continue;
    }
    const folder = file.split('/').at(-2);
    if (folder !== data.type) errors.push(`${file}: type "${data.type}" must live in an "${data.type}/" folder`);
    related.push([file, data.related]);
    if (data.type !== 'link') keys.push(...data.files.map((stored) => stored.key), ...(data.preview ? [data.preview.key] : []));
  }

  for (const [file, references] of related) {
    for (const reference of references) {
      if (!slugs.has(reference)) errors.push(`${file}: related resource "${reference}" does not exist`);
    }
  }

  if (options.remoteBase) {
    const fetchFn = options.fetchFn ?? fetch;
    for (const key of keys) {
      const response = await fetchFn(new URL(key, options.remoteBase).href, { method: 'HEAD' });
      if (!response.ok) errors.push(`missing from the store: ${key} (${response.status})`);
    }
  }
  return errors;
}

if (import.meta.main) {
  const remote = Deno.args.includes('--remote');
  const remoteBase = remote ? Deno.env.get('ASSET_BASE_URL') : undefined;
  if (remote && !remoteBase) {
    console.error('error: set ASSET_BASE_URL to check the store.');
    Deno.exit(2);
  }
  const errors = await checkResources('src/content/resources', { remoteBase });
  for (const error of errors) console.error(error);
  if (errors.length) Deno.exit(1);
  console.log('All resources are valid.');
}
```

Add to `deno.json` tasks: `"resource:check": "deno run -A scripts/resources/check.ts",`

In `.github/workflows/check.yml`, add `- run: deno task resource:check` directly after `- run: deno task check`.

- [ ] **Step 3: Run the tests and the real check**

Run: `deno test -A scripts/resources/check_test.ts; deno task resource:check`
Expected: 3 tests PASS; the real check prints "All resources are valid." (it covers the migrated links and the fixtures).

- [ ] **Step 4: Commit**

```bash
git add scripts/resources deno.json deno.lock .github/workflows/check.yml
git commit -m "Add the resource:check command"
```

---

### Task 6: Asset URLs and resource detail pages

**Files:**
- Create: `src/lib/assets.ts`, `src/components/resources/TypeIcon.astro`, `src/components/resources/TypeNav.astro`, `src/components/resources/ResourceCard.astro`, `src/pages/resources/[type]/[slug].astro`, `src/styles/resources.css`
- Modify: `astro.config.ts`, `src/lib/resources.ts`, `scripts/site_test.ts`

**Interfaces:**
- Consumes: Task 1 schema constants and `lib/resources.ts`; fixture resources.
- Produces: `assetUrl(key: string): string`; `resourceHref(entry: HostedEntry): string`; `sourceLabel(source): string`; `typeDetails(data: HostedData): [string, string][]`; `formatDuration(seconds: number): string`; components `TypeIcon` (`type`, `size?`), `TypeNav` (`all`, `activeType?`), `ResourceCard` (`entry`) — the card root carries `data-resource-card`, `data-tags` (space-separated), `data-authors` (`|`-separated), `data-sd`, `data-hd` (`"true"`/`"false"`) for Task 7's filtering.

- [ ] **Step 1: Write the failing build tests**

Append to `scripts/site_test.ts`:

```ts
const ASSETS = 'https://assets.example.test/';

Deno.test('resource detail pages credit and link the source without offering downloads', async () => {
  const html = await Deno.readTextFile(new URL('resources/models/fixture-footman/index.html', root));
  assert.match(html, /href="https:\/\/www\.hiveworkshop\.com\/threads\/fixture-footman\.1\/"[^>]*>\s*View on Hive Workshop/);
  assert.match(html, /id="resource-preview"/);
  assert.match(html, /name="wc3-tab"/);
  assert(html.includes(`src="${ASSETS}resources/model/fixture-footman/2123456789ab/preview.png"`), 'Preview image must load from the asset store');
  assert(!html.includes(`href="${ASSETS}`), 'Store files must never be linked');
  assert(!/\sdownload(?=[\s=>])/.test(html), 'No download attributes');
  // Store URLs are allowed only inside data-files (for the previewers); nothing visible may name a file.
  const visible = html.replace(/data-files="[^"]*"/, '');
  assert(!visible.includes('Footman.mdx'), 'File names must not be shown');
  for (const text of ['Fixture Author', 'Stand', 'Walk', 'Attack', 'Fixture Sword Icon']) assert(html.includes(text), `Missing ${text}`);
});

Deno.test('every hosted fixture has a detail page, with an icon when it has no preview', async () => {
  for (const route of ['icons/fixture-sword-icon', 'textures/fixture-grass-tile', 'audio/fixture-horn', 'scripts/fixture-damage-lib']) {
    const html = await Deno.readTextFile(new URL(`resources/${route}/index.html`, root));
    assert.match(html, /id="resource-preview"/, `Missing preview area on ${route}`);
  }
  const texture = await Deno.readTextFile(new URL('resources/textures/fixture-grass-tile/index.html', root));
  const preview = texture.match(/<section[^>]*id="resource-preview"[\s\S]*?<\/section>/)?.[0] ?? '';
  assert(!preview.includes('<img'), 'A resource without a preview shows its type icon');
  assert.match(texture, /Original source/);
  assert.match(texture, /Derived from Blizzard Entertainment assets/);
  const audio = await Deno.readTextFile(new URL('resources/audio/fixture-horn/index.html', root));
  assert.match(audio, /0:03/);
});
```

(`0:03` is 2.5 seconds rounded for display.)

Run: `deno task test`
Expected: the two new tests FAIL (pages not found); all others PASS.

- [ ] **Step 2: Configure the asset base URL**

In `astro.config.ts`, change the first import to `import { defineConfig, envField } from 'astro/config';` and add inside `defineConfig({ … })`, after `trailingSlash`:

```ts
  env: {
    schema: {
      // Where resource files are served from (the asset store). Required for builds that render resource files.
      ASSET_BASE_URL: envField.string({ context: 'server', access: 'public', optional: true, url: true }),
    },
  },
```

`src/lib/assets.ts`:

```ts
import { ASSET_BASE_URL } from 'astro:env/server';

/** Matches `deno task assets:serve`. */
const DEV_BASE = 'http://127.0.0.1:4322/';

/** Public URL of a store key. Fails the build when a resource file must render and no store is configured. */
export function assetUrl(key: string): string {
  const base = ASSET_BASE_URL ?? (import.meta.env.DEV ? DEV_BASE : undefined);
  if (!base) throw new Error('Set ASSET_BASE_URL to build pages that show resource files.');
  return new URL(key, base.endsWith('/') ? base : `${base}/`).href;
}
```

- [ ] **Step 3: Add view helpers**

Append to `src/lib/resources.ts` (and add `TYPE_SEGMENTS` to its import from `./resource-schema`):

```ts
export const resourceHref = (entry: HostedEntry): string => `/resources/${TYPE_SEGMENTS[entry.data.type]}/${entry.id}/`;

const SOURCE_LABELS = { hive: 'View on Hive Workshop', github: 'View on GitHub', other: 'Original source' } as const;
export const sourceLabel = (source: Resource['source']): string => source.label ?? SOURCE_LABELS[source.site];

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Type-specific rows for the detail page's facts table. */
export function typeDetails(data: HostedData): [string, string][] {
  switch (data.type) {
    case 'model':
      return [['Kind', data.kind], ['Animations', data.animations.join(', ') || 'None'], ['Textures', String(data.textures.length)]];
    case 'icon':
      return [['Variants', data.variants.join(', ')]];
    case 'texture':
      return [['Usage', data.usage]];
    case 'audio':
      return [['Usage', data.usage], ['Duration', formatDuration(data.durationSec)]];
    case 'script':
      return [['Language', data.language], ['Requires', data.requires.join(', ') || 'Nothing']];
  }
}
```

- [ ] **Step 4: Add the components**

`src/components/resources/TypeIcon.astro`:

```astro
---
import { AudioLines, Box, FileCode, Image, Layers } from 'lucide-astro';
import type { HostedType } from '../../lib/resource-schema';
interface Props { type: HostedType; size?: number }
const { type, size = 24 } = Astro.props;
const Icon = { model: Box, icon: Image, texture: Layers, audio: AudioLines, script: FileCode }[type];
---
<Icon size={size} strokeWidth={1.5} aria-hidden="true" />
```

`src/components/resources/TypeNav.astro`:

```astro
---
import { HOSTED_TYPES, TYPE_PLURALS, TYPE_SEGMENTS, type HostedType } from '../../lib/resource-schema';
import type { HostedEntry } from '../../lib/resources';
interface Props { all: HostedEntry[]; activeType?: HostedType; /** True on a type page itself, false on a resource inside it. */ exact?: boolean }
const { all, activeType, exact = true } = Astro.props;
---
<nav class="panel-nav" aria-label="Resource types">
  <h2 class="panel-title">Types</h2>
  <a href="/resources/" aria-current={activeType ? undefined : 'page'}>All resources<span>{all.length}</span></a>
  {HOSTED_TYPES.map((type) => (
    <a href={`/resources/${TYPE_SEGMENTS[type]}/`} aria-current={activeType === type ? (exact ? 'page' : 'true') : undefined}>
      {TYPE_PLURALS[type]}<span>{all.filter((entry) => entry.data.type === type).length}</span>
    </a>
  ))}
</nav>
```

`src/components/resources/ResourceCard.astro`:

```astro
---
import { assetUrl } from '../../lib/assets';
import { TYPE_NAMES } from '../../lib/resource-schema';
import { resourceHref, type HostedEntry } from '../../lib/resources';
import TypeIcon from './TypeIcon.astro';
interface Props { entry: HostedEntry }
const { entry } = Astro.props;
const { data } = entry;
---
<a
  class="catalog-card"
  href={resourceHref(entry)}
  data-resource-card
  data-tags={data.tags.join(' ')}
  data-authors={data.authors.map((author) => author.name).join('|')}
  data-sd={String(data.compat.sd)}
  data-hd={String(data.compat.hd)}
>
  <span class="catalog-thumb">
    {data.preview
      ? <img src={assetUrl(data.preview.key)} alt="" width={data.preview.width} height={data.preview.height} loading="lazy" />
      : <TypeIcon type={data.type} size={36} />}
  </span>
  <span class="catalog-card-body">
    <span class="catalog-card-type">{TYPE_NAMES[data.type]}</span>
    <strong>{data.title}</strong>
    <span class="catalog-card-author">{data.authors[0].name}</span>
    <span class="catalog-badges">
      {data.compat.sd && <span class="catalog-badge">SD</span>}
      {data.compat.hd && <span class="catalog-badge">HD</span>}
    </span>
  </span>
</a>
```

- [ ] **Step 5: Add the detail page**

`src/pages/resources/[type]/[slug].astro`:

```astro
---
import { ArrowUpRight } from 'lucide-astro';
import Shell from '../../../layouts/Shell.astro';
import ResourceCard from '../../../components/resources/ResourceCard.astro';
import TypeIcon from '../../../components/resources/TypeIcon.astro';
import TypeNav from '../../../components/resources/TypeNav.astro';
import { assetUrl } from '../../../lib/assets';
import { TYPE_NAMES, TYPE_SEGMENTS } from '../../../lib/resource-schema';
import { getResources, type HostedEntry, isHosted, sourceLabel, typeDetails } from '../../../lib/resources';
import '../../../styles/home.css';
import '../../../styles/resources.css';

export async function getStaticPaths() {
  const all = (await getResources()).filter(isHosted);
  return all.map((entry) => ({
    params: { type: TYPE_SEGMENTS[entry.data.type], slug: entry.id },
    props: { entry, all, related: all.filter((other) => entry.data.related.includes(other.id)) },
  }));
}

interface Props { entry: HostedEntry; all: HostedEntry[]; related: HostedEntry[] }
const { entry, all, related } = Astro.props;
const { data } = entry;
// Store URLs for the sub-project 3 previewers; never rendered as links.
const previewFiles = data.files.map((file) => ({ role: file.role, format: file.format, url: assetUrl(file.key) }));
---
<Shell title={data.title} description={data.summary} tab>
  <TypeNav slot="side" all={all} activeType={data.type} exact={false} />
  <article class="resource-detail wrap">
    <header class="resource-header">
      <p class="eyebrow"><TypeIcon type={data.type} size={14} /> {TYPE_NAMES[data.type].toUpperCase()}</p>
      <h1>{data.title}</h1>
      <p class="resource-summary">{data.summary}</p>
      <p class="resource-byline">
        by {data.authors.map((author, index) => (
          <Fragment>{index > 0 && ', '}{author.url ? <a href={author.url} rel="noopener">{author.name}</a> : author.name}</Fragment>
        ))}
      </p>
      <div class="catalog-badges">
        {data.compat.sd && <span class="catalog-badge">SD</span>}
        {data.compat.hd && <span class="catalog-badge">HD</span>}
        {data.compat.minPatch && <span class="catalog-badge">{data.compat.minPatch}+</span>}
      </div>
      <a class="button primary" href={data.source.url} rel="noopener">{sourceLabel(data.source)} <ArrowUpRight size={16} /></a>
    </header>

    <section id="resource-preview" class="resource-preview" aria-label="Preview" data-type={data.type} data-files={JSON.stringify(previewFiles)}>
      {data.preview
        ? <img src={assetUrl(data.preview.key)} width={data.preview.width} height={data.preview.height} alt={`Preview of ${data.title}`} />
        : <TypeIcon type={data.type} size={64} />}
    </section>

    <section class="resource-facts" aria-labelledby="details-title">
      <h2 id="details-title">Details</h2>
      <dl>
        {typeDetails(data).map(([label, value]) => <Fragment><dt>{label}</dt><dd>{value}</dd></Fragment>)}
        {data.tags.length > 0 && <Fragment><dt>Tags</dt><dd>{data.tags.join(', ')}</dd></Fragment>}
        <dt>Added</dt><dd><time datetime={data.added}>{data.added}</time></dd>
        {data.updated && <Fragment><dt>Updated</dt><dd><time datetime={data.updated}>{data.updated}</time></dd></Fragment>}
      </dl>
    </section>

    <section class="resource-credits" aria-labelledby="credits-title">
      <h2 id="credits-title">Credits</h2>
      <ul>{data.authors.map((author) => <li>{author.url ? <a href={author.url} rel="noopener">{author.name}</a> : author.name}</li>)}</ul>
      {data.permission && <p>{data.permission}</p>}
      {data.derivative && <p>Derived from Blizzard Entertainment assets.</p>}
      <p>wc3.dev only displays this resource. Get it from its <a href={data.source.url} rel="noopener">original source</a>.</p>
    </section>

    {related.length > 0 && (
      <section class="resource-related" aria-labelledby="related-title">
        <h2 id="related-title">Related</h2>
        <div class="catalog-grid">{related.map((other) => <ResourceCard entry={other} />)}</div>
      </section>
    )}
  </article>
</Shell>
```

- [ ] **Step 6: Add the styles**

`src/styles/resources.css` (shared by catalog and detail views; `.workspace` is a size container, so layout breakpoints use `@container`):

```css
.panel-nav a[aria-current] { background: #1f2e37; color: var(--accent); }
.panel-nav a span { font-size: .75rem; }

.catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
.catalog-card { display: flex; flex-direction: column; min-width: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 3px; background: #16232b; transition: border-color .15s; }
.catalog-card:hover { border-color: #8c742c; }
.catalog-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.catalog-card[hidden] { display: none; }
.catalog-thumb { display: grid; place-items: center; aspect-ratio: 1; border-bottom: 1px solid var(--line); background: #0f191f; color: var(--muted); }
.catalog-thumb img { width: 100%; height: 100%; object-fit: contain; }
.catalog-card-body { display: grid; gap: 4px; min-width: 0; padding: 10px 12px 12px; }
.catalog-card-type { color: var(--accent); font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; }
.catalog-card-body strong { overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.catalog-card-author { color: var(--muted); font-size: .8rem; }
.catalog-badges { display: flex; flex-wrap: wrap; gap: 6px; }
.catalog-badge { padding: 1px 6px; border: 1px solid #8f7625; border-radius: 3px; color: var(--muted); font-size: .68rem; letter-spacing: .05em; }

.resource-detail { display: grid; gap: 28px; padding-block: 28px 48px; }
.resource-header { display: grid; gap: 10px; justify-items: start; }
.resource-header .eyebrow { gap: .45rem; }
.resource-header h1 { font-size: clamp(1.8rem, 3.4vw, 2.6rem); font-weight: 650; letter-spacing: -.04em; line-height: 1.15; }
.resource-summary { max-width: 65ch; }
.resource-byline { font-size: .9rem; }
.resource-byline a, .resource-credits a { color: var(--accent); }
.resource-preview { display: grid; place-items: center; aspect-ratio: 16 / 9; max-height: 60vh; overflow: hidden; border: 1px solid var(--line); border-radius: 3px; background: radial-gradient(circle at 50% 40%, #1f2e37, #0c151a); color: var(--muted); }
.resource-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
.resource-detail h2 { font-size: 1.05rem; font-weight: 600; }
.resource-facts dl { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 24px; margin: 14px 0 0; font-size: .9rem; }
.resource-facts dt { color: var(--muted); }
.resource-facts dd { margin: 0; overflow-wrap: anywhere; }
.resource-credits ul { margin: 10px 0; padding-left: 1.1rem; }
.resource-credits p { margin-top: 6px; font-size: .9rem; }
.resource-related .catalog-grid { margin-top: 14px; }

@container (max-width: 560px) {
  .catalog-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  .resource-facts dl { grid-template-columns: minmax(0, 1fr); gap: 2px; }
  .resource-facts dd { margin-bottom: 8px; }
}
```

- [ ] **Step 7: Check, build, and test**

Run: `deno task check; deno task test; deno task build`
Expected: 0 errors; all tests PASS; the production build (no fixtures, no `ASSET_BASE_URL`) succeeds because no real hosted resources exist yet.

- [ ] **Step 8: Commit**

```bash
git add astro.config.ts src scripts/site_test.ts
git commit -m "Add view-only resource detail pages"
```

---

### Task 7: Catalog browser, type pages, and filtering

**Files:**
- Create: `src/scripts/resources/filter-state.ts`, `src/scripts/resources/catalog.ts`, `src/components/resources/CatalogFilters.astro`, `src/components/resources/ResourceCatalog.astro`, `src/pages/resources/[type]/index.astro`, `scripts/resources/filter_test.ts`
- Modify: `src/pages/resources/index.astro`, `src/styles/resources.css`, `scripts/site_test.ts`

**Interfaces:**
- Consumes: `ResourceCard` data attributes, `TypeNav`, `getResources`, `getLinks`, `isHosted` (Task 6/1), `ResourceDirectory` (Task 1).
- Produces: `filter-state.ts`: `interface FilterState { tags: string[]; sd: boolean; hd: boolean; author: string }`, `interface CardFacts { tags: string[]; authors: string[]; sd: boolean; hd: boolean }`, `emptyFilters`, `parseFilters(search: string): FilterState`, `serializeFilters(state): string`, `matchesFilters(card, state): boolean`.

- [ ] **Step 1: Write the failing tests**

`scripts/resources/filter_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { emptyFilters, matchesFilters, parseFilters, serializeFilters } from '../../src/scripts/resources/filter-state.ts';

const card = { tags: ['orc', 'unit'], authors: ['Grom Hellscream', 'Thrall'], sd: true, hd: false };

Deno.test('parseFilters reads, normalises, and de-duplicates the query string', () => {
  assert.deepEqual(parseFilters('?tag=Unit&tag=orc&tag=orc&hd=1&author=%20thrall%20'), { tags: ['orc', 'unit'], sd: false, hd: true, author: 'thrall' });
  assert.deepEqual(parseFilters(''), emptyFilters);
  assert.deepEqual(parseFilters('?sd=yes&tag='), emptyFilters);
});

Deno.test('serializeFilters is stable and empty for no filters', () => {
  assert.equal(serializeFilters(emptyFilters), '');
  assert.equal(serializeFilters({ tags: ['unit', 'orc'], sd: true, hd: false, author: 'Thrall' }), '?tag=orc&tag=unit&sd=1&author=Thrall');
  const state = { tags: ['orc'], sd: false, hd: true, author: 'a b' };
  assert.deepEqual(parseFilters(serializeFilters(state)), state);
});

Deno.test('matchesFilters requires every selected tag, each compat flag, and an author substring', () => {
  assert(matchesFilters(card, emptyFilters));
  assert(matchesFilters(card, { ...emptyFilters, tags: ['orc', 'unit'] }));
  assert(!matchesFilters(card, { ...emptyFilters, tags: ['orc', 'hero'] }));
  assert(matchesFilters(card, { ...emptyFilters, sd: true }));
  assert(!matchesFilters(card, { ...emptyFilters, hd: true }));
  assert(matchesFilters(card, { ...emptyFilters, author: 'HELLS' }));
  assert(!matchesFilters(card, { ...emptyFilters, author: 'jaina' }));
});
```

Append to `scripts/site_test.ts`:

```ts
Deno.test('the resource browser lists hosted fixtures, filters, and curated links', async () => {
  const html = await Deno.readTextFile(new URL('resources/index.html', root));
  assert.equal(html.match(/data-resource-card/g)?.length, 5);
  assert.match(html, /data-filter-form/);
  assert.match(html, /Hive Workshop/);
  assert.match(html, /Jassbot/);
  assert(html.indexOf('data-resource-card') < html.indexOf('Jassbot'), 'Curated links come after the catalog');
});

Deno.test('type pages list only their type', async () => {
  const expected = { models: 'fixture-footman', icons: 'fixture-sword-icon', textures: 'fixture-grass-tile', audio: 'fixture-horn', scripts: 'fixture-damage-lib' };
  for (const [segment, slug] of Object.entries(expected)) {
    const html = await Deno.readTextFile(new URL(`resources/${segment}/index.html`, root));
    assert.equal(html.match(/data-resource-card/g)?.length, 1, `/resources/${segment}/ should list one card`);
    assert(html.includes(`/resources/${segment}/${slug}/`), `/resources/${segment}/ should link ${slug}`);
  }
});
```

Run: `deno task test:unit; deno task test`
Expected: filter tests FAIL (module missing); the new site tests FAIL.

- [ ] **Step 2: Implement the filter state**

`src/scripts/resources/filter-state.ts`:

```ts
export interface FilterState { tags: string[]; sd: boolean; hd: boolean; author: string }
export interface CardFacts { tags: string[]; authors: string[]; sd: boolean; hd: boolean }

export const emptyFilters: FilterState = { tags: [], sd: false, hd: false, author: '' };

export function parseFilters(search: string): FilterState {
  const params = new URLSearchParams(search);
  return {
    tags: [...new Set(params.getAll('tag').map((tag) => tag.trim().toLowerCase()).filter(Boolean))].sort(),
    sd: params.get('sd') === '1',
    hd: params.get('hd') === '1',
    author: (params.get('author') ?? '').trim(),
  };
}

/** A query string ("" when no filters are set) with a stable parameter order. */
export function serializeFilters(state: FilterState): string {
  const params = new URLSearchParams();
  for (const tag of [...state.tags].sort()) params.append('tag', tag);
  if (state.sd) params.set('sd', '1');
  if (state.hd) params.set('hd', '1');
  if (state.author) params.set('author', state.author);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function matchesFilters(card: CardFacts, state: FilterState): boolean {
  if ((state.sd && !card.sd) || (state.hd && !card.hd)) return false;
  if (!state.tags.every((tag) => card.tags.includes(tag))) return false;
  const author = state.author.toLowerCase();
  return !author || card.authors.some((name) => name.toLowerCase().includes(author));
}
```

Run: `deno task test:unit`
Expected: filter tests PASS.

- [ ] **Step 3: Add the client module**

`src/scripts/resources/catalog.ts`:

```ts
import { type CardFacts, type FilterState, matchesFilters, parseFilters, serializeFilters } from './filter-state.ts';

const VIEW_KEY = 'wc3.resources.view';

function facts(card: HTMLElement): CardFacts {
  return {
    tags: card.dataset.tags ? card.dataset.tags.split(' ') : [],
    authors: card.dataset.authors ? card.dataset.authors.split('|') : [],
    sd: card.dataset.sd === 'true',
    hd: card.dataset.hd === 'true',
  };
}

function readForm(form: HTMLFormElement): FilterState {
  const params = new URLSearchParams();
  for (const [name, value] of new FormData(form)) if (typeof value === 'string' && value) params.append(name, value);
  return parseFilters(params.toString());
}

function writeForm(form: HTMLFormElement, state: FilterState): void {
  for (const input of form.querySelectorAll<HTMLInputElement>('input')) {
    if (input.name === 'tag') input.checked = state.tags.includes(input.value);
    else if (input.name === 'sd') input.checked = state.sd;
    else if (input.name === 'hd') input.checked = state.hd;
    else if (input.name === 'author') input.value = state.author;
  }
}

function initLayoutToggle(catalog: HTMLElement): void {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-view]')];
  const show = (layout: string) => {
    catalog.dataset.layout = layout;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.view === layout));
  };
  let saved: string | null = null;
  try { saved = localStorage.getItem(VIEW_KEY); } catch { /* Storage unavailable: default to grid. */ }
  if (saved === 'grid' || saved === 'list') show(saved);
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const layout = button.dataset.view ?? 'grid';
      show(layout);
      try { localStorage.setItem(VIEW_KEY, layout); } catch { /* Storage unavailable: keep for this page only. */ }
    });
  }
}

function initCatalog(): void {
  const catalog = document.querySelector<HTMLElement>('[data-catalog]');
  if (!catalog) return;
  initLayoutToggle(catalog);
  const form = document.querySelector<HTMLFormElement>('[data-filter-form]');
  if (!form) return;
  const cards = [...catalog.querySelectorAll<HTMLElement>('[data-resource-card]')].map((element) => ({ element, facts: facts(element) }));
  const count = document.querySelector<HTMLElement>('[data-catalog-count]');
  const empty = document.querySelector<HTMLElement>('[data-catalog-empty]');

  const apply = (state: FilterState) => {
    let shown = 0;
    for (const card of cards) {
      const visible = matchesFilters(card.facts, state);
      card.element.hidden = !visible;
      if (visible) shown++;
    }
    if (count) count.textContent = `${shown} ${shown === 1 ? 'resource' : 'resources'}`;
    if (empty) empty.hidden = shown > 0;
  };
  const update = () => {
    const state = readForm(form);
    apply(state);
    // Keep the router's own history state; only the query changes.
    history.replaceState(history.state, '', location.pathname + serializeFilters(state) + location.hash);
  };

  const initial = parseFilters(location.search);
  writeForm(form, initial);
  apply(initial);
  form.addEventListener('input', update);
  form.addEventListener('submit', (event) => event.preventDefault());
  // The reset event fires before the fields are cleared.
  form.addEventListener('reset', () => setTimeout(update));
}

document.addEventListener('astro:page-load', initCatalog);
```

- [ ] **Step 4: Add the catalog components and pages**

`src/components/resources/CatalogFilters.astro`:

```astro
---
import type { HostedType } from '../../lib/resource-schema';
import type { HostedEntry } from '../../lib/resources';
import TypeNav from './TypeNav.astro';
interface Props { entries: HostedEntry[]; all: HostedEntry[]; activeType?: HostedType }
const { entries, all, activeType } = Astro.props;
const tagCounts = new Map<string, number>();
for (const entry of entries) for (const tag of entry.data.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
const tags = [...tagCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 20);
---
<div class="catalog-filters">
  <TypeNav all={all} activeType={activeType} />
  <form class="filter-form" data-filter-form aria-label="Filter resources">
    <fieldset>
      <legend class="panel-title">Compatibility</legend>
      <label><input type="checkbox" name="sd" value="1" /> SD</label>
      <label><input type="checkbox" name="hd" value="1" /> HD</label>
    </fieldset>
    {tags.length > 0 && (
      <fieldset>
        <legend class="panel-title">Tags</legend>
        {tags.map(([tag, count]) => <label><input type="checkbox" name="tag" value={tag} /> {tag} <span>{count}</span></label>)}
      </fieldset>
    )}
    <label class="filter-author"><span class="panel-title">Author</span><input type="search" name="author" autocomplete="off" /></label>
    <button type="reset" class="button secondary filter-clear">Clear filters</button>
  </form>
</div>
```

`src/components/resources/ResourceCatalog.astro`:

```astro
---
import { LayoutGrid, List } from 'lucide-astro';
import type { HostedEntry } from '../../lib/resources';
import ResourceCard from './ResourceCard.astro';
interface Props { entries: HostedEntry[]; title: string; intro: string }
const { entries, title, intro } = Astro.props;
const label = (n: number) => `${n} ${n === 1 ? 'resource' : 'resources'}`;
---
<section class="catalog" aria-labelledby="catalog-title">
  <header class="catalog-heading">
    <div><h1 id="catalog-title">{title}</h1><p>{intro}</p></div>
    <div class="catalog-tools">
      <span data-catalog-count aria-live="polite">{label(entries.length)}</span>
      <div class="view-toggle" role="group" aria-label="Layout">
        <button type="button" data-view="grid" aria-pressed="true" aria-label="Grid view"><LayoutGrid size={16} /></button>
        <button type="button" data-view="list" aria-pressed="false" aria-label="List view"><List size={16} /></button>
      </div>
    </div>
  </header>
  {entries.length > 0
    ? <div class="catalog-grid" data-catalog data-layout="grid">{entries.map((entry) => <ResourceCard entry={entry} />)}</div>
    : <p class="catalog-empty">No resources here yet.</p>}
  <p class="catalog-empty" data-catalog-empty hidden>No resources match these filters.</p>
</section>
<script>import '../../scripts/resources/catalog.ts';</script>
```

Replace `src/pages/resources/index.astro`:

```astro
---
import Shell from '../../layouts/Shell.astro';
import ResourceDirectory from '../../components/ResourceDirectory.astro';
import CatalogFilters from '../../components/resources/CatalogFilters.astro';
import ResourceCatalog from '../../components/resources/ResourceCatalog.astro';
import { getLinks, getResources, isHosted } from '../../lib/resources';
import '../../styles/home.css';
import '../../styles/resources.css';
const all = (await getResources()).filter(isHosted);
const links = await getLinks();
---
<Shell title="Resources" description="Warcraft III models, icons, textures, audio, and scripts, each linked to where it was originally published.">
  <CatalogFilters slot="side" entries={all} all={all} />
  <div class="portal-workspace wrap">
    <ResourceCatalog entries={all} title="Resources" intro="Models, icons, textures, audio, and scripts from the Warcraft III modding community. Each links to where it was originally published." />
    <div class="catalog-links">
      <ResourceDirectory resources={links} title="Community & tools" id="community-and-tools" />
    </div>
  </div>
</Shell>
```

`src/pages/resources/[type]/index.astro`:

```astro
---
import Shell from '../../../layouts/Shell.astro';
import CatalogFilters from '../../../components/resources/CatalogFilters.astro';
import ResourceCatalog from '../../../components/resources/ResourceCatalog.astro';
import { HOSTED_TYPES, type HostedType, TYPE_PLURALS, TYPE_SEGMENTS } from '../../../lib/resource-schema';
import { getResources, isHosted } from '../../../lib/resources';
import '../../../styles/home.css';
import '../../../styles/resources.css';

export function getStaticPaths() {
  return HOSTED_TYPES.map((type) => ({ params: { type: TYPE_SEGMENTS[type] }, props: { type } }));
}

const INTROS: Record<HostedType, string> = {
  model: 'Units, buildings, doodads, effects, and portraits.',
  icon: 'Command buttons, passives, and autocast icons.',
  texture: 'Skins, tilesets, skies, loading screens, and UI textures.',
  audio: 'Music, sound effects, voices, and ambience.',
  script: 'JASS, vJASS, Lua, and TypeScript systems and libraries.',
};

interface Props { type: HostedType }
const { type } = Astro.props;
const all = (await getResources()).filter(isHosted);
const entries = all.filter((entry) => entry.data.type === type);
---
<Shell title={TYPE_PLURALS[type]} description={`Warcraft III ${TYPE_PLURALS[type].toLowerCase()}: ${INTROS[type]}`}>
  <CatalogFilters slot="side" entries={entries} all={all} activeType={type} />
  <div class="portal-workspace wrap">
    <ResourceCatalog entries={entries} title={TYPE_PLURALS[type]} intro={INTROS[type]} />
  </div>
</Shell>
```

Append to `src/styles/resources.css` (before the `@container` block):

```css
.catalog-heading { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.catalog-heading h1 { font-size: clamp(1.65rem, 3vw, 2.15rem); font-weight: 650; letter-spacing: -.035em; }
.catalog-heading p { max-width: 60ch; margin-top: 6px; font-size: .95rem; }
.catalog-tools { display: flex; align-items: center; gap: 12px; color: var(--muted); font-size: .85rem; }
.view-toggle { display: flex; overflow: hidden; border: 1px solid var(--line); border-radius: 3px; }
.view-toggle button { display: grid; place-items: center; width: 32px; height: 30px; border: 0; background: #16232b; color: var(--muted); cursor: pointer; }
.view-toggle button[aria-pressed="true"] { background: #24343d; color: var(--accent); }
.view-toggle button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.catalog-grid[data-layout="list"] { grid-template-columns: minmax(0, 1fr); gap: 0; border: 1px solid var(--line); border-radius: 3px; }
.catalog-grid[data-layout="list"] .catalog-card { flex-direction: row; align-items: center; border: 0; border-bottom: 1px solid var(--line); border-radius: 0; }
.catalog-grid[data-layout="list"] .catalog-card:last-child { border-bottom: 0; }
.catalog-grid[data-layout="list"] .catalog-thumb { flex: 0 0 56px; border-right: 1px solid var(--line); border-bottom: 0; }
.catalog-empty { padding: 24px 0; }
.catalog-links { margin-top: 32px; }
.filter-form { display: grid; gap: 16px; margin-top: 18px; }
.filter-form fieldset { display: grid; gap: 4px; margin: 0; padding: 0; border: 0; }
.filter-form label { display: flex; align-items: center; gap: 8px; padding: 3px 8px; color: var(--muted); font-size: .86rem; cursor: pointer; }
.filter-form label > span:last-child:not(.panel-title) { margin-left: auto; font-size: .75rem; }
.filter-form input[type="checkbox"] { accent-color: var(--accent); }
.filter-form .filter-author { display: grid; gap: 6px; cursor: auto; }
.filter-author input { height: 30px; padding: 0 8px; border: 1px solid var(--line); border-radius: 3px; background: #101a20; color: var(--ink); }
.filter-author input:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.filter-clear { justify-self: start; margin-left: 8px; padding: 7px 12px; font-size: .8rem; }
```

- [ ] **Step 5: Check, build, and test**

Run: `deno task check; deno task test; deno task build`
Expected: 0 errors; all tests PASS; production build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src scripts
git commit -m "Add the resource catalog with type pages and client-side filters"
```

---

### Task 8: Hive Workshop principles and documentation

**Files:**
- Create: `docs/hive-integration.md`
- Modify: `README.md`

**Interfaces:** none (documentation).

- [ ] **Step 1: Write `docs/hive-integration.md`**

```markdown
# Hive Workshop integration principles

wc3.dev is a companion to [Hive Workshop](https://www.hiveworkshop.com/), not a
replacement. These rules bind every feature that touches Hive content,
including any future automation (roadmap sub-project 5).

## What wc3.dev does

- Displays a curated selection of resources for browsing and previewing only.
  wc3.dev never offers downloads.
- Links every resource prominently to where it was originally published. For
  resources from Hive, that link is the primary action on the page.
- Credits authors as their original page lists them.

## Permission

- A resource is displayed only with its author's permission or under a licence
  that allows it. The resource's `permission` field records which.
- Authors and Hive staff can ask for a resource to be removed at any time;
  removals happen promptly and without argument.

## Automated access

No automated access to Hive exists today. Before any is built:

1. Contact Hive Workshop staff, explain the purpose, and ask whether an
   official feed or API exists or could be agreed. Prefer it over scraping.
2. Respect `robots.txt` and Hive's terms of service in full.
3. Identify the client with a descriptive User-Agent that links to wc3.dev.
4. Rate-limit requests well below anything that could affect Hive's service,
   and back off on errors.
5. Cache metadata only (titles, authors, links, tags, dates). Never copy
   resource files or page content in bulk.
6. Provide an opt-out that authors can use without contacting wc3.dev
   directly, and honour it on the next sync.

## Tone

wc3.dev sends people to Hive. Copy on wc3.dev describes Hive as the community
hub it is, and never implies that wc3.dev hosts the canonical version of
anything published there.
```

- [ ] **Step 2: Update `README.md`**

Replace the line that begins "Add a resource by adding JSON with `title`, `description`, `url`, `category`" (and the rest of that paragraph) with:

```markdown
### Resources

Resources are view-only: the site previews them and links to where they were
originally published, and never offers downloads. Only the maintainer adds
them. See `docs/hive-integration.md` for the rules on third-party content.

- **Curated links** (`type: "link"`): write
  `src/content/resources/link/<slug>.json` by hand.
- **Hosted resources** (models, icons, textures, audio, scripts): put the files
  and a `resource.json` with the authored fields in a folder named after the
  slug, then run:

  ```sh
  deno task resource:add path/to/<slug> --dry-run   # preview the result
  deno task resource:add path/to/<slug> --local     # store files in .asset-store/
  deno task resource:add path/to/<slug>             # upload to the asset store
  ```

  Uploads need `ASSET_STORE_ENDPOINT`, `ASSET_STORE_BUCKET`,
  `ASSET_STORE_ACCESS_KEY_ID`, and `ASSET_STORE_SECRET_ACCESS_KEY`. Add a
  `preview.png` for models. Pass `--update` to replace an existing resource.
- `deno task resource:check` validates every resource (`--remote` also checks
  the store at `ASSET_BASE_URL`).
- `deno task assets:serve` serves `.asset-store/` on `http://127.0.0.1:4322/`,
  the default asset URL in development.
- Production builds must set `ASSET_BASE_URL` once any hosted resource exists.
  Configure the store with no public listing, a CORS allowlist for the site's
  origins, and hotlink protection.
```

Also update the "Validate and build" section's commands so it reads `deno task test` builds with test fixtures first (`deno task build:test`), and that deploys must use `deno task build`, which never includes fixtures.

- [ ] **Step 3: Commit**

```bash
git add docs/hive-integration.md README.md
git commit -m "Document Hive Workshop integration principles and resource tooling"
```

---

### Task 9: End-to-end verification

**Files:** only what fixes require.

- [ ] **Step 1: Local round trip**

Create a scratch folder (outside the repo) named `demo-horn` containing a WAV written with `makeWav(2)` and a `resource.json` for an audio resource. Run `deno task resource:add <folder> --local`, then `deno task resource:check`. Start `deno task assets:serve` in the background and `deno task dev`, open `/resources/audio/demo-horn/` in the browser pane: the page shows the source button, credits, a 0:02 duration, and the preview area; `curl -I http://127.0.0.1:4322/` returns no directory listing. Stop both servers, then delete `src/content/resources/audio/demo-horn.json` and `.asset-store/`.

- [ ] **Step 2: Catalog behaviour**

Run `deno task build:test && deno task preview` (start via the browser pane config `wc3-dev-preview` after the build). At 1280×800: on `/resources/`, tick HD — the card count and `?hd=1` update; tick a tag; type an author fragment; Clear filters resets everything and the query string. Reload with `?tag=weapon` — only the sword icon shows. Toggle list view, navigate away and back — list view persists. Open a card: it opens as a tab; the rail keeps Resources active; the side panel marks the type. Confirm at the `mobile` preset that cards reflow and there is no horizontal scroll. Reset to `desktop`.

- [ ] **Step 3: Production build hygiene**

Run `deno task build` and confirm `grep -rl "fixture-" dist` prints nothing, and `grep -rl 'download' dist/resources` prints nothing.

- [ ] **Step 4: Final validation**

Run: `deno task check; deno task resource:check; deno task test; deno task build`
Expected: all pass. Commit any fixes:

```bash
git add -A src scripts docs README.md
git commit -m "Polish resource catalog after end-to-end verification"
```

Skip the commit if nothing changed.
