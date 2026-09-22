# Resource system design

Date: 2026-09-22
Status: Approved design, awaiting spec review
Sub-project: 2 of 5 in the wc3.dev platform roadmap (see `2026-09-22-app-shell-design.md`)

## Goal

wc3.dev shows a curated catalog of Warcraft III modding resources (models,
icons, textures, audio, scripts, and external links) that visitors can browse,
filter, and view in the app shell. Resources are **view-only**: the site never
offers downloads. Every resource credits its authors and links prominently to
where it was originally published, which is the only place to get it.

## Decisions

- **Maintainer-only intake.** Only the site owner adds resources, locally, with
  a Deno command. No submission form, no contributor uploads.
- **View-only.** No download buttons, file lists, checksums, or import paths in
  the UI. Files live in an asset store purely so previews can render.
- **Source link required.** `source.url` is mandatory on every resource and is
  shown as the primary action on its page.
- **Separate asset store.** Binary files never enter git. The site reads them
  from `ASSET_BASE_URL`; production targets an S3-compatible bucket (Cloudflare
  R2 recommended), development a local folder served on a local port.

View-only is a presentation guarantee, not a technical one: anything a browser
renders can be extracted from its network traffic. The store therefore uses
cheap deterrents only — no bucket listing, a CORS allowlist for the site's
origins, and a Referer-based hotlink rule — and never obfuscation.

## Non-goals

- Interactive previewers (3D viewer, audio player): sub-project 3. This
  sub-project reserves the preview area and shows static images.
- Hive Workshop scraping or sync: sub-project 5. This sub-project writes only
  the integration principles document.
- Accounts, ratings, comments, uploads by anyone but the owner.

## Data model

One JSON file per resource at `src/content/resources/<type>/<slug>.json`,
loaded by the existing `resources` content collection with a Zod schema that is
a discriminated union on `type`.

### Common fields

| Field | Type | Notes |
| --- | --- | --- |
| `type` | `'model' \| 'icon' \| 'texture' \| 'audio' \| 'script' \| 'link'` | Discriminator |
| `title` | string, 1–80 chars | |
| `summary` | string, 1–280 chars | Card and meta description |
| `tags` | string[] (lowercase kebab-case) | Free-form, filterable |
| `authors` | `{ name: string; url?: url }[]`, ≥ 1 | Credited on the page; optional for `link` (sites, not works) |
| `source` | `{ site: 'hive' \| 'github' \| 'other'; url: url; label?: string }` | **Required** |
| `permission` | string, optional | Short note on permission to display, e.g. "Author permission, 2026-09" |
| `derivative` | boolean, default false | Built from Blizzard assets |
| `compat` | `{ sd: boolean; hd: boolean; minPatch?: string }` | Not used by `link` |
| `added` / `updated` | ISO date (`YYYY-MM-DD`) | `updated` is optional; pages show `updated ?? added` |
| `files` | `{ key: string; role: string; format: string; bytes: number }[]` | Store keys for previews; never rendered as links |
| `preview` | `{ key: string; width: number; height: number }`, optional | Thumbnail/preview image store key |
| `related` | slug[] , optional | Must reference existing resources |

The slug is the file name. Slugs are unique across all types.

### Type-specific fields

| Type | Fields |
| --- | --- |
| `model` | `kind`: `unit \| building \| doodad \| effect \| missile \| item \| portrait \| other`; `animations`: string[] (sequence names, extracted); `textures`: string[] (texture paths referenced, extracted) |
| `icon` | `variants`: subset of `BTN, DISBTN, PAS, DISPAS, ATC, DISATC, ATT, UPG` |
| `texture` | `usage`: `skin \| tileset \| sky \| loading-screen \| ui \| other` |
| `audio` | `usage`: `music \| sfx \| voice \| ambient`; `durationSec`: number |
| `script` | `language`: `jass \| vjass \| lua \| typescript`; `requires`: string[] |
| `link` | `category`: `Community \| Tooling \| Scripting`; `order`: integer — the five existing curated links migrate here, with their `url` becoming `source.url` |

`link` resources have no `files`, `preview`, or `compat`.

### Store keys

`resources/<type>/<slug>/<first 12 hex chars of sha256>/<original file name>`.
Keys change whenever content changes, so the store can serve them with
`Cache-Control: public, max-age=31536000, immutable`.

## Views

### Browser — `/resources/`

- **Side panel**: type navigation (links to the type pages, with counts), then
  client-side filters for tags, SD/HD compatibility, and author, and a "clear
  filters" action.
- **Workspace**: a heading with the result count, a grid/list toggle, and
  resource cards (preview thumbnail or type icon, title, first author, type
  badge, SD/HD badges). `link` resources render as the current directory rows
  in their own "Community & tools" group below the grid.
- Every card is prerendered in the HTML so the page is indexable and works
  without JavaScript. A small client module filters by toggling visibility,
  using data attributes on each card; filter state is mirrored to the URL query
  string (`?tag=orc&hd=1&author=name`) so views are shareable and survive
  reloads. Grid/list choice is remembered in `localStorage` (try/catch).
- Adequate up to a few thousand resources; beyond that, switch to a generated
  JSON index with client rendering (out of scope).

### Type pages — `/resources/<type>/`

Prerendered browser pages pre-filtered to one type (`models`, `icons`,
`textures`, `audio`, `scripts`), for linking and search indexing. The rail's
Resources item stays active.

### Test fixtures

Fixture resources (one per hosted type) live in
`src/content/resources/_fixtures/<type>/fixture-*.json` and are loaded only
when `RESOURCE_FIXTURES=1`. `deno task build:test` sets it together with a
placeholder `ASSET_BASE_URL`, and `deno task test` runs that build before the
tests. Production builds (`deno task build`) never include fixtures.

### Detail — `/resources/<type>/<slug>/`

A shell page with `tab` set, so it opens as a workspace tab.

- **Header**: title, type badge, compat badges, authors.
- **Primary action**: "View on Hive Workshop ↗" (or "Original source ↗" /
  "View on GitHub ↗" per `source.site`, or `source.label`), styled as the
  primary button.
- **Preview area**: a fixed-aspect panel with an id sub-project 3 mounts into
  (`#resource-preview`, `data-type`, `data-files` carrying store URLs). Now it
  shows the preview image, or the type icon when none exists.
- **Details table**: type-specific fields (kind, animations list, icon
  variants, usage, duration, language, requirements), tags, added/updated.
- **Credits**: authors with links, permission note, and a "Derived from
  Blizzard assets" note when `derivative` is true.
- **Related**: cards for related resources.

No download link, file names, sizes, or hashes appear anywhere in the UI.

## Tooling

All scripts live in `scripts/resources/`, run through Deno tasks, and keep
pure logic (validation, sniffing, key derivation, metadata shaping) in modules
separate from I/O so it can be unit-tested.

### `deno task resource:add <folder> [--dry-run] [--local]`

Input folder: the resource's files plus a hand-written `resource.json`
containing the authored fields (type, title, summary, tags, authors, source,
permission, derivative, compat, and type-specific authored fields such as
`kind` or `usage`). The command:

1. Validates the authored fields against the schema (minus generated fields).
2. Sniffs every file by magic bytes and rejects mismatches: MDX (`MDLX`),
   MDL (text, `Version` block with `FormatVersion`), BLP (`BLP1`; Warcraft III never uses BLP2), DDS (`DDS `), TGA
   (by header shape), WAV (`RIFF`…`WAVE`), MP3 (ID3 or frame sync), OGG
   (`OggS`), FLAC (`fLaC`), and `.j`/`.lua`/`.ts` scripts as UTF-8 text.
3. Extracts metadata: model sequences and texture paths via `mdx-m3-viewer`'s
   MDLX parser; audio duration from WAV headers (other formats: authored
   `durationSec`).
4. Generates a PNG preview for icons and textures by decoding BLP/DDS with
   `mdx-m3-viewer` into `ImageData` and encoding it with `OffscreenCanvas`
   (both available in Deno 2.9). Models use an authored screenshot
   (`preview.png` in the folder) until sub-project 3.
5. Computes sha256 per file and derives store keys.
6. Uploads files and the preview to the store (S3 API signed with `aws4fetch`,
   credentials from `ASSET_STORE_ENDPOINT`, `ASSET_STORE_BUCKET`,
   `ASSET_STORE_ACCESS_KEY_ID`, `ASSET_STORE_SECRET_ACCESS_KEY`), setting the
   immutable cache header; `--local` copies into `.asset-store/` instead;
   `--dry-run` uploads nothing and prints the plan.
7. Writes `src/content/resources/<type>/<slug>.json`, refusing to overwrite an
   existing slug unless `--update` is passed (which keeps `added` and sets
   `updated`).

### `deno task resource:check [--remote]`

Validates every resource file against the schema, slug uniqueness, `related`
references, and that each `files`/`preview` key follows the key format;
`--remote` additionally issues HEAD requests to confirm each key exists in the
store. Runs in CI without `--remote`.

### `deno task assets:serve`

Serves `.asset-store/` on `http://127.0.0.1:4322/` with CORS for local
development. `ASSET_BASE_URL` defaults to that address in development and must
be set for production builds (the build fails if resources have files and it is
unset).

`.asset-store/` is git-ignored.

## Hive Workshop integration principles

Deliverable: `docs/hive-integration.md`, the rules sub-project 5 must follow.

- wc3.dev complements Hive Workshop: it links to Hive, never replaces it.
- Every resource that originated on Hive links back to its Hive page as the
  primary action and credits its authors as Hive lists them.
- Resources are displayed only with the author's permission or under a licence
  that allows it; the `permission` note records which.
- Before any automated access, contact Hive staff; prefer an official feed or
  API if one exists or can be agreed.
- Any automated access respects `robots.txt` and Hive's terms, identifies
  itself with a descriptive User-Agent, is rate-limited, and caches metadata
  only (titles, authors, links, tags) — never files.
- Authors and Hive staff can request removal; removals are honoured promptly.

## Testing

- **Unit**: schema acceptance/rejection per type (including missing
  `source.url`), file sniffing with small byte fixtures, store-key derivation,
  WAV duration parsing, filter logic (pure module: filter state ⇄ query string,
  card matching), slug/related validation.
- **Integration**: `resource:add --dry-run --local` against a fixture folder
  containing a tiny MDX, BLP, and WAV, asserting the written JSON.
- **Build**: `/resources/`, each type page, and each fixture resource's detail
  page exist; detail pages contain the source link and `#resource-preview`, and
  contain no `download` attributes or store links outside `data-files` and the
  preview `img`; link-type entries still render.

## Risks

- Parsing HD (Reforged) MDX 1000+ files with `mdx-m3-viewer`: if the parser
  fails on a file, `resource:add` records no animations and warns rather than
  aborting.
- DDS variants the decoder does not support (e.g. BC7): the command falls back
  to requiring an authored `preview.png` and says so.
