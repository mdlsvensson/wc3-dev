# Hive Activity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "New on Hive" list on `/resources/` and a "Latest on Hive" card on the home dashboard, built from a committed snapshot that the owner refreshes from saved RSS/Atom files, with an opt-out register the build enforces and a drafted message to Hive staff. No automated request to Hive anywhere.

**Architecture:** One shared Zod schema (`src/lib/hive-schema.ts`) validates the snapshot and the opt-out register. Pure logic (`src/lib/hive.ts`: feed items → entries, URL normalisation, opt-out matching, merging, view model with relative dates and staleness) is used by both the Deno import command and the Astro pages. Pages load the snapshot through one Astro-side loader (`src/lib/hive-data.ts`) that validates it and fails the build on opted-out entries; the test build loads a fixture snapshot instead.

**Tech Stack:** Deno 2.9, Astro 7.3, Zod 4 via `astro/zod`, `fast-xml-parser` 5.11.1 (feed parsing in the Deno command only), lucide-astro.

**Spec:** `docs/superpowers/specs/2026-09-25-hive-activity-design.md` (principles: `docs/hive-integration.md`)

## Global Constraints

- Every subagent runs on Opus 5.5 (owner's instruction).
- No network access to Hive in any code path: no `fetch`, no feed URLs in code, no images from Hive. Outbound `<a href>` links only.
- Metadata only: title, authors, category, published date, URL.
- Deno tasks only; never npm/node or npm lockfiles. Dependencies in `package.json`; `deno install` and commit `deno.lock`.
- Styles in global CSS under `src/styles/` (Starlight forces `scopedStyleStrategy: "where"`).
- Stop a running dev server before `deno task check`/`build`.
- Commit messages end with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/hive-schema.ts` | `hiveEntrySchema`, `hiveSnapshotSchema`, `hiveOptOutSchema`, `HIVE_ORIGIN`, `MAX_ENTRIES` |
| `src/lib/hive.ts` | Pure: `normaliseHiveUrl`, `isOptedOut`, `mergeEntries`, `feedItemsToEntries`, `hiveView`, `relativeAge`, `HIVE_CONTACT_URL` |
| `src/lib/hive-data.ts` | Astro-side loader: pick real or fixture snapshot, validate, enforce opt-outs |
| `src/data/hive-activity.json` | Snapshot (starts empty) |
| `src/data/hive-optout.json` | Opt-out register (starts empty) |
| `src/data/_fixtures/hive-activity.json` | Test snapshot (stale, 7 entries) |
| `scripts/hive/feed.ts` | Parse an RSS/Atom string into feed items (`fast-xml-parser`) |
| `scripts/hive/import.ts` | `deno task hive:import` |
| `scripts/hive/*_test.ts`, `scripts/hive/testdata/` | Unit and command tests, feed fixtures |
| `src/components/hive/HiveActivity.astro`, `HiveCard.astro` | The `/resources/` group and the home card |
| `src/styles/hive.css` | Styles |
| `docs/hive-outreach.md`, `docs/hive-integration.md` | Outreach message; status section |

---

### Task 1: Schema and pure logic

**Files:** create `src/lib/hive-schema.ts`, `src/lib/hive.ts`, `src/data/hive-activity.json`, `src/data/hive-optout.json`, `scripts/hive/hive_test.ts`; modify `deno.json` (`test:unit` gains `scripts/hive/`).

**Interfaces (produces):**

```ts
// hive-schema.ts
export const HIVE_ORIGIN = 'https://www.hiveworkshop.com';
export const MAX_ENTRIES = 30;
export const hiveEntrySchema: z.ZodObject<{ title; authors; category; published; url }>;
export type HiveEntry = z.infer<typeof hiveEntrySchema>;
export const hiveSnapshotSchema; // { updated: iso date, entries: HiveEntry[] } with refinements: ≤ 30, unique by normalised URL, sorted newest first
export type HiveSnapshot;
export const hiveOptOutSchema;  // { authors: string[], urls: string[] }
export type HiveOptOut;

// hive.ts
export const HIVE_CONTACT_URL = 'https://github.com/mdlsvensson/wc3-dev/issues';
export function normaliseHiveUrl(url: string): string;       // lowercase host, drop query/fragment, ensure trailing slash
export function isOptedOut(entry: HiveEntry, optOut: HiveOptOut): boolean; // any author (case-insensitive, trimmed) or the normalised URL
export interface FeedItem { title?: string; authors: string[]; categories: string[]; published?: string; link?: string }
export function feedItemsToEntries(items: FeedItem[], feedTitle: string): { entries: HiveEntry[]; skipped: number };
export function mergeEntries(existing: HiveEntry[], incoming: HiveEntry[], optOut: HiveOptOut):
  { entries: HiveEntry[]; added: string[]; updated: string[]; optedOut: string[]; cut: string[] };
export function relativeAge(published: string, now: Date): string; // 'today', 'yesterday', '3 days ago', '2 weeks ago', '5 months ago', '2 years ago'
export function hiveView(snapshot: HiveSnapshot, now: Date, limit?: number):
  { entries: (HiveEntry & { age: string })[]; stale: boolean; updatedLabel: string }; // stale when updated is > 30 days before now; label like '25 September 2026'
```

Rules:
- `hiveEntrySchema`: `title` 1–120 chars; `authors` array of 1+ non-empty strings; `category` 1–40 chars; `published` `z.iso.date()`; `url` a URL whose origin is `HIVE_ORIGIN` (also accept `https://hiveworkshop.com`, normalised to www in `feedItemsToEntries`).
- `feedItemsToEntries`: skip items without a title or a Hive link (count them); authors trimmed, deduplicated; category = first item category, else `feedTitle` trimmed of a leading "Hive Workshop - " / trailing " | Hive" style prefix (keep it simple: first category, else feed title); `published` = the date part of the item's date in UTC (skip items with an unparseable date); `url` normalised.
- `mergeEntries`: incoming replaces existing by normalised URL; drop opted-out (report their titles); sort by `published` desc then title; keep `MAX_ENTRIES` (report cut titles).
- All exported functions are pure (no I/O, no `Date.now()` inside; `now` is passed in).

- [ ] **Step 1:** Write `scripts/hive/hive_test.ts` covering: schema rejects a non-Hive URL, duplicate URLs, 31 entries, unsorted entries, empty authors; accepts an empty snapshot. `normaliseHiveUrl` (`HTTPS://WWW.HiveWorkshop.com/threads/a.1/?x=1#post` → `https://www.hiveworkshop.com/threads/a.1/`, non-www → www). `isOptedOut` by author (case-insensitive) and by URL. `feedItemsToEntries` skips title-less and non-Hive items and uses the feed title as fallback category. `mergeEntries` replaces by URL, sorts, cuts to 30, drops opt-outs and reports each list. `relativeAge` boundaries (0, 1, 6, 7, 13, 30, 364, 365 days). `hiveView`: stale at 31 days, not at 30; `limit` applied; `updatedLabel` format. Run: `deno test -A scripts/hive/` → FAIL.
- [ ] **Step 2:** Implement `hive-schema.ts` and `hive.ts` (import the schema module with a `.ts` extension, as `src/lib/tutorials.ts` does, since Deno tests import it). Create `src/data/hive-activity.json` as `{ "updated": "2026-09-25", "entries": [] }` and `src/data/hive-optout.json` as `{ "authors": [], "urls": [] }`. Add `scripts/hive/` to `test:unit`.
- [ ] **Step 3:** `deno test -A scripts/hive/` → PASS; `deno task test:unit` → PASS; `deno task check` → 0 errors.
- [ ] **Step 4:** Commit "Add the Hive activity schema and logic".

### Task 2: `hive:import`

**Files:** create `scripts/hive/feed.ts`, `scripts/hive/import.ts`, `scripts/hive/import_test.ts`, `scripts/hive/testdata/{rss.xml,atom.xml,not-a-feed.html}`; modify `package.json`/`deno.lock` (`fast-xml-parser` 5.11.1), `deno.json` (task `"hive:import": "deno run --allow-read --allow-write scripts/hive/import.ts"` — deliberately no `--allow-net`).

**Interfaces:**
- `feed.ts`: `parseFeed(xml: string): { title: string; items: FeedItem[] }` — RSS 2.0 (`rss > channel > item`: `title`, `link`, `pubDate`, `dc:creator` and/or `author`, `category` (string or array)) and Atom (`feed > entry`: `title`, `link[@href]` preferring `rel="alternate"`, `published` or `updated`, `author > name` (one or many), `category[@term]`). Throws `Error('Not an RSS or Atom feed')` otherwise. Handles CDATA and HTML entities in titles (decode `&amp;` etc.).
- `import.ts`: `planImport(files: {name: string; xml: string}[], snapshot: HiveSnapshot, optOut: HiveOptOut, today: string)` → `{ snapshot: HiveSnapshot; report: string; skipped: number }` (pure, testable); CLI `main(args)` reads the files and `src/data/hive-activity.json` / `hive-optout.json`, prints the report, writes the file (pretty JSON, 2 spaces, trailing newline) unless `--dry-run`. Errors (unreadable file, not a feed) name the file and exit 1 without writing.

- [ ] **Step 1:** Write fixtures (a small RSS feed with 3 items incl. one non-Hive link and one with two categories and `dc:creator`; an Atom feed with 2 entries incl. two authors and an `&amp;` title) and `import_test.ts`: both formats parse; `planImport` merges into an existing snapshot and reports added/updated/opted-out/cut/skipped; a non-feed throws naming the file; the CLI with `--dry-run` on a temp copy of the data files leaves them byte-identical (run the CLI via `Deno.Command` with `cwd` set to a temp dir laid out like the repo, or give `main` an injectable root). Run → FAIL.
- [ ] **Step 2:** Add `fast-xml-parser` (`deno install`), implement `feed.ts` and `import.ts`, add the task.
- [ ] **Step 3:** `deno test -A scripts/hive/` → PASS; run `deno task hive:import scripts/hive/testdata/rss.xml --dry-run` and check the report; `deno task check` → 0 errors.
- [ ] **Step 4:** Commit "Add the hive:import command".

### Task 3: Views, loader and build checks

**Files:** create `src/lib/hive-data.ts`, `src/data/_fixtures/hive-activity.json`, `src/components/hive/HiveActivity.astro`, `src/components/hive/HiveCard.astro`, `src/styles/hive.css`; modify `src/pages/resources/index.astro`, `src/pages/index.astro`, `scripts/site_test.ts`.

**Loader** (`hive-data.ts`): reads `env.RESOURCE_FIXTURES` the same way `src/content.config.ts` does; imports both JSON files statically and picks the fixture when set; parses with `hiveSnapshotSchema` and the opt-out register with `hiveOptOutSchema` (a parse error throws with a clear message naming the file); throws if any entry `isOptedOut` ("<title> is in src/data/hive-optout.json; run hive:import again or remove it"); exports `getHiveView(limit?)` returning `hiveView(snapshot, new Date(), limit)`.

**Fixture:** 7 entries, `updated` `2026-01-10` (stale for any build after Feb 2026), varied categories and authors, one with two authors, one title containing `&`.

**Markup contract** (tests rely on it):
- `HiveActivity.astro`: nothing when there are no entries. Otherwise `<section class="hive-activity" id="new-on-hive" aria-labelledby="new-on-hive-title">` with header `<h2 id="new-on-hive-title"><a href="https://www.hiveworkshop.com/">New on Hive</a></h2>` and `<p class="hive-updated">From Hive Workshop, updated {label}.</p>` (stale: `…, last updated {label}.`); `<ul class="hive-list">` of `<li>` with `<a class="hive-title" href={url} rel="external">{title}</a>`, `<span class="hive-authors">by {authors joined ", "}</span>`, `<span class="hive-category">{category}</span>`, `<time datetime={published}>{age}</time>`; then `<p class="hive-optout">` with the text from the spec ("wc3.dev links to Hive and never hosts these resources. Authors and Hive staff can ask to be left out: <a href={HIVE_CONTACT_URL}>open an issue</a>, and requests are honoured promptly.").
- `HiveCard.astro`: nothing when empty; else `<section class="hive-card" aria-labelledby="hive-card-title">` with `<h2 id="hive-card-title">Latest on Hive</h2>`, the 5 newest as `<a href={url} rel="external">` with the category, and `<a href="/resources/#new-on-hive">All recent Hive resources</a>`.
- `/resources/`: render `HiveActivity` inside `.catalog-links` after the Community & tools directory. Home: render `HiveCard` in the right column under the framework reference (wrap the aside and card in a column `div` if needed; keep the existing layout at every breakpoint).
- Styles in `src/styles/hive.css`, imported by both pages, following `home.css`'s directory look (panel border, row separators, muted meta, `ArrowUpRight` icon on links); no horizontal scroll at 390px.

- [ ] **Step 1:** Append to `scripts/site_test.ts`: with the test build (fixture), `/resources/` has `id="new-on-hive"`, exactly 7 `.hive-title` links, each `href` starting `https://www.hiveworkshop.com/`, the `&` title escaped correctly, `last updated` shown, and the opt-out note linking to the issues URL; the home page has a `.hive-card` with exactly 5 external links plus the `/resources/#new-on-hive` link; no page contains an `<img` whose `src` is on hiveworkshop.com. (Empty and fresh states are covered by `hiveView` unit tests; also add a unit test that the loader's opt-out check throws, by exporting the check as a pure function `assertNoOptOuts(snapshot, optOut)` from `hive.ts`.) Run `deno task test` → FAIL.
- [ ] **Step 2:** Implement loader, fixture, components, styles and page changes.
- [ ] **Step 3:** `deno task check` → 0 errors; `deno task test` → PASS; `deno task build` (production, real empty snapshot) → no Hive group or card rendered. Look at `/resources/` and `/` in the fixture build at 1440 and 390 (Chromium under `/opt/pw-browsers`, driven from a scratch script, never added to the repo).
- [ ] **Step 4:** Commit "Show new Hive resources on the resources page and home".

### Task 4: Outreach, status and docs

**Files:** create `docs/hive-outreach.md`; modify `docs/hive-integration.md`, `README.md`.

- [ ] **Step 1:** `docs/hive-outreach.md`: a short intro for the owner (where to send it: Hive's staff contact or forum, to be chosen by the owner), then the message: who is writing and what wc3.dev is; what it shows today (curated, view-only resources with the author's permission, each linking to Hive as the primary action; a "New on Hive" list of titles, authors and links refreshed by hand); the question (is there an official feed or API, or could one be agreed; which endpoints may be used and how often); the limits wc3.dev would keep (descriptive User-Agent linking to wc3.dev, requests well below any load and backing off on errors, respecting robots.txt and the terms, metadata only, no files or page content, an author opt-out without contacting wc3.dev, prompt removals); an offer to adjust anything Hive prefers. Plain, friendly, under 350 words.
- [ ] **Step 2:** `docs/hive-integration.md`: add a `## Status` section at the end: contact with Hive staff pending (see `docs/hive-outreach.md`); no automated access exists; the "New on Hive" list is refreshed by hand with `deno task hive:import` from feeds saved in a browser; opted-out authors and URLs live in `src/data/hive-optout.json`, and the build fails if the list contains one.
- [ ] **Step 3:** README: a `### Hive activity` subsection under Structure (after Tutorials): the snapshot and opt-out files, how to save feeds and run `deno task hive:import <files…> [--dry-run]`, that the command never touches the network, and that the build rejects opted-out entries.
- [ ] **Step 4:** Commit "Document the Hive activity list and draft the outreach message".

## Verification

After the tasks: `deno install --frozen`, `deno task check`, `deno task resource:check`, `deno task tutorial:check`, `deno task test`, `deno task build`; grep the whole diff for `fetch(`, `hiveworkshop.com` inside anything but data, fixtures, docs, links and tests; browser pass on the fixture build at 1440, 800 and 390.
