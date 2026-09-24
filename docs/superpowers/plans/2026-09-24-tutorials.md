# Tutorials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Getting started with Warcraft III: Reforged modding" track at `/learn/` inside the app shell: 21 World Editor lessons in 6 chapters that build one map, "Defend the Village", plus a closing page, with a side-panel outline, previous/next navigation, screenshot placeholders, and a check command.

**Architecture:** Lessons are Markdown files in two content collections read from `src/content/tutorials/`. A Sätteri mdast plugin (`src/markdown/tutorial-directives.ts`), registered on Astro's Markdown processor and scoped to that folder, turns a small set of directives into HTML; `::shot` emits an `image` node so Astro optimises the screenshot, or a placeholder when the file is missing. Pure track logic (ordering, previous/next, minutes) lives in `src/lib/tutorials.ts`; Astro pages render the landing, lessons and closing page with shared components. A Deno command, `tutorial:check`, validates the content and lists missing screenshots and facts to verify.

**Tech Stack:** Deno 2.9, Astro 7.3 (content collections with the glob loader, `astro:assets` via `sharp`), `@astrojs/markdown-satteri` 0.4.1 and `satteri` 0.10.5 (Astro 7's default Markdown engine, plugin API), `jsr:@std/front-matter`, lucide-astro, vanilla TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-24-tutorials-design.md` (app shell context: `docs/superpowers/specs/2026-09-22-app-shell-design.md`)

## Global Constraints

- Every subagent in this plan runs on Opus 5.5 (owner's instruction): pass `model: "opus"`.
- Deno tasks only; never npm/node commands or npm lockfiles. Dependencies go in `package.json`; run `deno install` and commit `deno.lock`.
- No client UI framework; Astro components and vanilla TypeScript.
- Styles go in global CSS under `src/styles/` (Starlight forces `scopedStyleStrategy: "where"`); tutorial styles in `src/styles/learn.css`.
- The track teaches the World Editor only: no JASS, Lua, TypeScript, or "Custom Script" actions in any lesson.
- The directive plugin must only transform files under `src/content/tutorials/`; Starlight docs render exactly as before.
- Lesson pages open as tabs (`<Shell … tab>`); `/learn/` does not.
- Write lesson content with the file-writing tool, never Bash heredocs: heredocs mangle backslashes in Windows paths (`Documents\Warcraft III\Maps`).
- Stop a running dev server (`deno run -A npm:astro dev stop`) before `deno task check`/`build`.
- Commit messages end with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Verified during planning

A probe build (reverted) confirmed:

- `satteri({ mdastPlugins: [factory] })` in `astro.config.ts` coexists with Starlight, which still enables directive syntax and restores unhandled directives as text (`:unknown[x]` renders as `<p>:unknown[x]</p>`).
- A leaf-directive visitor returning `{ type: 'blockquote', data: { hName: 'figure', … }, children: [{ type: 'image', url: './x/shot.png', alt }] }` is collected by Astro and emitted as `<img … width height src="/_astro/shot.….webp">`. This needs `sharp` installed; without it the build fails with `MissingSharp`.
- `blockquote` with `hName` holds block children (`<figure>`, `<aside>`, `<div>`); `paragraph`/`emphasis` with `hName` hold phrasing (`<figcaption>`, `<span>`, `<kbd>`); `hProperties` such as `className` and `ariaHidden` become attributes.
- A container directive's `[label]` arrives as a first `paragraph` child with `data.directiveLabel === true`.
- Returning `{ raw: '' }` from an `html` visitor removes the node (used for `<!-- verify: … -->`).
- The page's `render()` returns `headings` with `depth`, `slug`, `text`, and every heading gets an `id`.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/tutorial-schema.ts` | Zod schemas for lesson and page frontmatter, slug pattern (shared by Astro and Deno) |
| `src/data/tutorials.ts` | Track title and the chapter list, in order |
| `src/lib/tutorials.ts` | Pure: build the track, previous/next, section headings, minute formatting |
| `src/lib/learn.ts` | Astro-side: load the track and the closing page from the collections |
| `src/content.config.ts` | Adds the `tutorials` and `tutorialPages` collections |
| `src/markdown/tutorial-directives.ts` | The Sätteri plugin for the tutorial directives |
| `astro.config.ts` | Registers the plugin on the Markdown processor |
| `src/components/learn/TrackOutline.astro` | Side-panel outline |
| `src/components/learn/LessonHeader.astro` | Lesson header |
| `src/components/learn/LessonPager.astro` | Previous/next links |
| `src/components/learn/ChapterCard.astro` | Chapter card on the landing |
| `src/pages/learn/index.astro` | Track landing (replaces the placeholder) |
| `src/pages/learn/[chapter]/[lesson].astro` | Lesson pages |
| `src/pages/learn/next.astro` | Closing page |
| `src/scripts/learn/outline-state.ts` | Pure: which heading is active |
| `src/scripts/learn/outline.ts` | Scroll-spy |
| `src/styles/learn.css` | All tutorial styles |
| `src/content/tutorials/<chapter>/<lesson>.md` | Lessons; screenshots in `<chapter>/<lesson>/` |
| `src/content/tutorials/next.md` | Closing page content |
| `scripts/tutorials/check.ts` | `deno task tutorial:check` |
| `scripts/tutorials/{track,directives,outline,check}_test.ts` | Unit tests |
| `scripts/site_test.ts` | Build tests for the track |
| `docs/tutorial-writing.md` | Directive reference, style guide and the running-project bible |

---

### Task 1: Track foundations

**Files:**
- Modify: `package.json`, `deno.lock`, `deno.json`, `src/content.config.ts`
- Create: `src/lib/tutorial-schema.ts`, `src/data/tutorials.ts`, `src/lib/tutorials.ts`, `src/lib/learn.ts`, `scripts/tutorials/track_test.ts`

**Interfaces:**
- Produces:
  - `tutorial-schema.ts`: `TUTORIAL_SLUG`, `lessonSchema`, `type Lesson`, `tutorialPageSchema`, `type TutorialPage`.
  - `data/tutorials.ts`: `TRACK { title, short }`, `chapters` (readonly `{ slug, title, summary }[]`).
  - `tutorials.ts`: `LEARN_HOME`, `NEXT_PAGE`, `lessonHref`, `interface LessonInput`, `interface ChapterInfo`, `interface TrackLesson<E>`, `interface TrackChapter<E>`, `interface Track<E>`, `interface PagerLink`, `buildTrack`, `pager`, `sectionHeadings`, `formatMinutes`.
  - `learn.ts`: `getTrack()`, `getClosingPage()`, `closingLink()`.
  - Collections: `tutorials` (ids `<chapter>/<slug>`), `tutorialPages` (ids `<slug>`).

- [ ] **Step 1: Add the dependencies**

In `package.json` `dependencies`, keeping alphabetical order, add:

```json
    "@astrojs/markdown-satteri": "0.4.1",
    "satteri": "0.10.5",
    "sharp": "0.35.4",
```

Run: `deno install`
Expected: `deno.lock` gains the three packages (sharp resolves its prebuilt `@img/sharp-*` binary; no install script is needed). Commit `deno.lock` with this task.

- [ ] **Step 2: Write the failing tests**

`scripts/tutorials/track_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { lessonSchema, tutorialPageSchema } from '../../src/lib/tutorial-schema.ts';
import { buildTrack, formatMinutes, pager, sectionHeadings } from '../../src/lib/tutorials.ts';

const chapters = [
  { slug: 'basics', title: 'Basics', summary: 'First.' },
  { slug: 'terrain', title: 'Terrain', summary: 'Second.' },
];
const lesson = (id: string, order: number, minutes = 10) => ({
  id,
  data: { title: `Title ${id}`, summary: 'Summary.', order, minutes, goals: ['Goal'] },
});
const closing = { href: '/learn/next/', title: 'Where to go next' };

Deno.test('buildTrack orders lessons by chapter, then order, and sums chapter minutes', () => {
  const track = buildTrack(chapters, [
    lesson('terrain/water', 2, 5),
    lesson('basics/tour', 2),
    lesson('terrain/tiles', 1, 15),
    lesson('basics/install', 1),
  ]);
  assert.deepEqual(track.lessons.map((entry) => entry.id), ['basics/install', 'basics/tour', 'terrain/tiles', 'terrain/water']);
  assert.deepEqual(track.chapters.map((chapter) => [chapter.number, chapter.minutes]), [[1, 20], [2, 20]]);
  const water = track.lessons[3];
  assert.equal(water.href, '/learn/terrain/water/');
  assert.equal(water.chapter, 'terrain');
  assert.equal(water.slug, 'water');
  assert.equal(water.chapterNumber, 2);
  assert.equal(water.entry.id, 'terrain/water');
});

Deno.test('buildTrack rejects unknown chapters and repeated orders', () => {
  assert.throws(() => buildTrack(chapters, [lesson('cinematics/intro', 1)]), /cinematics\/intro/);
  assert.throws(() => buildTrack(chapters, [lesson('basics/a', 1), lesson('basics/b', 1)]), /share order 1/);
});

Deno.test('pager links the overview, crosses chapters, and ends at the closing page', () => {
  const track = buildTrack(chapters, [lesson('basics/install', 1), lesson('basics/tour', 2), lesson('terrain/tiles', 1)]);
  assert.deepEqual(pager(track, 'basics/install', closing), {
    previous: { href: '/learn/', title: 'Track overview' },
    next: { href: '/learn/basics/tour/', title: 'Title basics/tour' },
  });
  assert.deepEqual(pager(track, 'terrain/tiles', closing), {
    previous: { href: '/learn/basics/tour/', title: 'Title basics/tour' },
    next: closing,
  });
  assert.throws(() => pager(track, 'basics/missing', closing), /basics\/missing/);
});

Deno.test('section headings keep only h2, and minutes read naturally', () => {
  assert.deepEqual(
    sectionHeadings([
      { depth: 2, slug: 'a', text: 'A' },
      { depth: 3, slug: 'b', text: 'B' },
      { depth: 2, slug: 'c', text: 'C' },
    ]),
    [{ slug: 'a', text: 'A' }, { slug: 'c', text: 'C' }],
  );
  assert.equal(formatMinutes(5), '5 min');
  assert.equal(formatMinutes(60), '1 h');
  assert.equal(formatMinutes(310), '5 h 10 min');
});

Deno.test('lesson frontmatter is validated', () => {
  const valid = { title: 'T', summary: 'S', order: 1, minutes: 10, goals: ['G'] };
  assert.equal(lessonSchema.safeParse(valid).success, true);
  assert.equal(lessonSchema.safeParse({ ...valid, goals: [] }).success, false);
  assert.equal(lessonSchema.safeParse({ ...valid, goals: ['1', '2', '3', '4', '5', '6'] }).success, false);
  assert.equal(lessonSchema.safeParse({ ...valid, order: 0 }).success, false);
  assert.equal(lessonSchema.safeParse({ ...valid, minutes: 2.5 }).success, false);
  assert.equal(lessonSchema.safeParse({ ...valid, summary: 'x'.repeat(201) }).success, false);
  assert.equal(tutorialPageSchema.safeParse({ title: 'T', summary: 'S' }).success, true);
});
```

In `deno.json`, extend `test:unit`:

```json
    "test:unit": "deno test -A scripts/shell_test.ts scripts/resources/ scripts/previewers/ scripts/tutorials/",
```

Run: `deno test -A scripts/tutorials/track_test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement the schemas, chapters, and track logic**

`src/lib/tutorial-schema.ts`:

```ts
import { z } from 'astro/zod';

/** Lowercase kebab-case, used for chapter folders and lesson file names. */
export const TUTORIAL_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Frontmatter of a lesson (`src/content/tutorials/<chapter>/<lesson>.md`). */
export const lessonSchema = z.object({
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(200),
  /** Position within the chapter; unique per chapter. */
  order: z.number().int().positive(),
  /** Estimated time to read and follow along. */
  minutes: z.number().int().positive(),
  /** The "In this lesson you will" list. */
  goals: z.array(z.string().min(1)).min(1).max(5),
});
export type Lesson = z.infer<typeof lessonSchema>;

/** Frontmatter of a top-level track page, such as `next.md`. */
export const tutorialPageSchema = z.object({
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(200),
});
export type TutorialPage = z.infer<typeof tutorialPageSchema>;
```

`src/data/tutorials.ts`:

```ts
/** The "Getting started" track. */
export const TRACK = {
  title: 'Getting started with Warcraft III: Reforged modding',
  short: 'Getting started',
} as const;

/** Chapters in reading order. Each is a folder in `src/content/tutorials/`. */
export const chapters = [
  { slug: 'editor-basics', title: 'Editor basics', summary: 'Open the World Editor, find your way around, and create the map you will build throughout the track.' },
  { slug: 'terrain', title: 'Terraining', summary: 'Paint tiles, raise the village onto a plateau, and carve a river with a single ford.' },
  { slug: 'placement', title: 'Placing units and doodads', summary: 'Build the village, place creep camps, and mark the regions your triggers will use.' },
  { slug: 'map-setup', title: 'Map setup', summary: 'Name and describe your map, give it a loading screen, and set up its players and forces.' },
  { slug: 'object-editor', title: 'Object Editor', summary: 'Create a custom hero, a custom ability, and a tower to defend the village.' },
  { slug: 'triggers', title: 'GUI triggers', summary: 'Turn the map into a game: waves on a timer, then victory or defeat.' },
] as const;
```

`src/lib/tutorials.ts`:

```ts
import type { Lesson } from './tutorial-schema.ts';

export const LEARN_HOME = '/learn/';
export const NEXT_PAGE = '/learn/next/';

export const lessonHref = (chapter: string, slug: string) => `/learn/${chapter}/${slug}/`;

/** A lesson as the content collection provides it; `id` is `<chapter>/<slug>`. */
export interface LessonInput { id: string; data: Lesson }
export interface ChapterInfo { slug: string; title: string; summary: string }
export interface TrackLesson<E extends LessonInput = LessonInput> {
  entry: E;
  id: string;
  chapter: string;
  slug: string;
  href: string;
  /** 1-based number of the lesson's chapter. */
  chapterNumber: number;
  data: Lesson;
}
export interface TrackChapter<E extends LessonInput = LessonInput> extends ChapterInfo {
  number: number;
  minutes: number;
  lessons: TrackLesson<E>[];
}
export interface Track<E extends LessonInput = LessonInput> {
  chapters: TrackChapter<E>[];
  /** Every lesson in reading order. */
  lessons: TrackLesson<E>[];
}
export interface PagerLink { href: string; title: string }

const splitId = (id: string) => {
  const [chapter, slug] = id.split('/');
  return { chapter, slug };
};

/** Groups lessons into chapters (in chapter order), each sorted by `order`. */
export function buildTrack<E extends LessonInput>(chapterList: readonly ChapterInfo[], entries: readonly E[]): Track<E> {
  const known = new Set(chapterList.map((chapter) => chapter.slug));
  for (const entry of entries) {
    if (!known.has(splitId(entry.id).chapter)) throw new Error(`Lesson ${entry.id} is not in a chapter listed in src/data/tutorials.ts`);
  }
  const built = chapterList.map((chapter, index): TrackChapter<E> => {
    const lessons = entries
      .filter((entry) => splitId(entry.id).chapter === chapter.slug)
      .sort((a, b) => a.data.order - b.data.order)
      .map((entry): TrackLesson<E> => {
        const { slug } = splitId(entry.id);
        return { entry, id: entry.id, chapter: chapter.slug, slug, href: lessonHref(chapter.slug, slug), chapterNumber: index + 1, data: entry.data };
      });
    lessons.forEach((lesson, position) => {
      const before = lessons[position - 1];
      if (before && before.data.order === lesson.data.order) {
        throw new Error(`Lessons ${before.id} and ${lesson.id} share order ${lesson.data.order}`);
      }
    });
    return { ...chapter, number: index + 1, minutes: lessons.reduce((total, lesson) => total + lesson.data.minutes, 0), lessons };
  });
  return { chapters: built, lessons: built.flatMap((chapter) => chapter.lessons) };
}

const link = (lesson: TrackLesson): PagerLink => ({ href: lesson.href, title: lesson.data.title });

/** Previous and next links: the track overview before the first lesson, the closing page after the last. */
export function pager(track: Track, id: string, closing: PagerLink): { previous: PagerLink; next: PagerLink } {
  const index = track.lessons.findIndex((lesson) => lesson.id === id);
  if (index < 0) throw new Error(`Unknown lesson ${id}`);
  const before = track.lessons[index - 1];
  const after = track.lessons[index + 1];
  return {
    previous: before ? link(before) : { href: LEARN_HOME, title: 'Track overview' },
    next: after ? link(after) : closing,
  };
}

/** The lesson's `h2` sections, for the side-panel outline. */
export function sectionHeadings(headings: readonly { depth: number; slug: string; text: string }[]) {
  return headings.filter((heading) => heading.depth === 2).map(({ slug, text }) => ({ slug, text }));
}

/** `5 min`, `1 h`, `5 h 10 min`. */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
```

- [ ] **Step 4: Add the collections and the Astro-side loaders**

In `src/content.config.ts`, import the schemas and add two collections:

```ts
import { lessonSchema, tutorialPageSchema } from './lib/tutorial-schema';
```

```ts
// Lessons: one Markdown file per lesson, in a folder per chapter. Ids are `<chapter>/<slug>`.
const tutorials = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/tutorials' }),
  schema: lessonSchema,
});
// Top-level track pages, such as the closing "Where to go next" page.
const tutorialPages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/tutorials' }),
  schema: tutorialPageSchema,
});
export const collections = { docs, i18n, resources, tutorials, tutorialPages };
```

`src/lib/learn.ts`:

```ts
import { getCollection, getEntry } from 'astro:content';
import { chapters } from '../data/tutorials';
import { buildTrack, NEXT_PAGE, type PagerLink } from './tutorials';

/** The whole track, from the `tutorials` collection. */
export async function getTrack() {
  return buildTrack(chapters, await getCollection('tutorials'));
}

/** The closing "Where to go next" page (`src/content/tutorials/next.md`). */
export async function getClosingPage() {
  const page = await getEntry('tutorialPages', 'next');
  if (!page) throw new Error('src/content/tutorials/next.md is missing');
  return page;
}

export async function closingLink(): Promise<PagerLink> {
  return { href: NEXT_PAGE, title: (await getClosingPage()).data.title };
}
```

- [ ] **Step 5: Run the tests**

Run: `deno test -A scripts/tutorials/track_test.ts`
Expected: PASS (5 tests).

Run: `deno task test:unit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json deno.lock deno.json src/content.config.ts src/lib/tutorial-schema.ts src/data/tutorials.ts src/lib/tutorials.ts src/lib/learn.ts scripts/tutorials/track_test.ts
git commit -m "Add the tutorial track model and collections"
```

(`deno task check` runs in Task 3, once the collections have content; an empty `tutorials` folder only logs a warning.)

---

### Task 2: Tutorial directives

**Files:**
- Create: `src/markdown/tutorial-directives.ts`, `scripts/tutorials/directives_test.ts`
- Modify: `astro.config.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `isTutorialFile(fileURL)`, `tutorialDirectives` (a Sätteri plugin factory: `(ctx: PluginFactoryContext) => MdastPluginDefinition | undefined`). Output classes: `keys`, `menu-path`, `menu-sep`, `tutorial-steps`, `tutorial-callout`, `tutorial-callout-{tip,note,caution}`, `tutorial-callout-title`, `tutorial-checkpoint`, `shot`, `shot-missing`, `shot-placeholder`, `shot-flag`, `shot-note`.

- [ ] **Step 1: Write the failing tests**

`scripts/tutorials/directives_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { join, toFileUrl } from 'jsr:@std/path@^1';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { isTutorialFile, tutorialDirectives } from '../../src/markdown/tutorial-directives.ts';

const processor = await createSatteriMarkdownProcessor({ mdastPlugins: [tutorialDirectives], features: { directive: true } });

// A lesson at <temp>/src/content/tutorials/terrain/water.md with one captured screenshot.
const root = await Deno.makeTempDir();
const chapterDir = join(root, 'src', 'content', 'tutorials', 'terrain');
await Deno.mkdir(join(chapterDir, 'water'), { recursive: true });
await Deno.writeFile(join(chapterDir, 'water', 'river.png'), new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
const lessonURL = toFileUrl(join(chapterDir, 'water.md'));
const docsURL = toFileUrl(join(root, 'src', 'content', 'docs', 'framework', 'docs', 'index.md'));

async function render(markdown: string, fileURL = lessonURL) {
  return await processor.render(markdown, { frontmatter: {}, fileURL });
}
const html = async (markdown: string, fileURL?: URL) => (await render(markdown, fileURL)).code;

Deno.test('only tutorial files are transformed', async () => {
  assert.equal(isTutorialFile(lessonURL), true);
  assert.equal(isTutorialFile(docsURL), false);
  assert.equal(isTutorialFile(undefined), false);
  assert(!(await html('Press :kbd[Ctrl+F9].', docsURL)).includes('<kbd'));
});

Deno.test('keys and menu paths', async () => {
  assert.match(await html('Press :kbd[Ctrl + F9].'), /<kbd class="keys"><kbd>Ctrl<\/kbd>\+<kbd>F9<\/kbd><\/kbd>/);
  assert.match(
    await html('Open :menu[Scenario > Map Options].'),
    /<span class="menu-path"><span>Scenario<\/span><span class="menu-sep" aria-hidden="true">›<\/span><span>Map Options<\/span><\/span>/,
  );
});

Deno.test('steps wrap their ordered list', async () => {
  assert.match(await html(':::steps\n1. First\n2. Second\n:::'), /<div class="tutorial-steps">\s*<ol>\s*<li>First<\/li>/);
});

Deno.test('callouts and checkpoints carry a title, default or custom', async () => {
  const tip = await html(':::tip\nHold Shift.\n:::');
  assert.match(tip, /<aside class="tutorial-callout tutorial-callout-tip">\s*<p class="tutorial-callout-title">Tip<\/p>\s*<p>Hold Shift.<\/p>/);
  const caution = await html(':::caution[Save *first*]\nBack up your map.\n:::');
  assert.match(caution, /<aside class="tutorial-callout tutorial-callout-caution">\s*<p class="tutorial-callout-title">Save <em>first<\/em><\/p>\s*<p>Back up your map.<\/p>/);
  assert.match(await html(':::note\nA note.\n:::'), /tutorial-callout-note/);
  const checkpoint = await html(':::checkpoint\nThe river blocks the way.\n:::');
  assert.match(checkpoint, /<aside class="tutorial-checkpoint">\s*<p class="tutorial-callout-title">Checkpoint: your map now…<\/p>\s*<p>The river blocks the way.<\/p>/);
  assert(!(await html(':::warning\nNot ours.\n:::')).includes('tutorial-callout'), 'Unknown containers are left for Starlight to restore');
});

Deno.test('a captured screenshot becomes an image Astro optimises', async () => {
  const result = await render('::shot[The river and its ford]{src="./water/river.png" caption="The ford is the only crossing."}');
  assert.match(result.code, /<figure class="shot">/);
  assert.match(result.code, /__ASTRO_IMAGE_="[^"]*The river and its ford[^"]*"/);
  assert.match(result.code, /<figcaption>The ford is the only crossing.<\/figcaption>/);
  assert.deepEqual(result.metadata.localImagePaths, ['./water/river.png']);
});

Deno.test('a missing screenshot renders a placeholder with its capture note', async () => {
  const result = await render('::shot[The Terrain Palette with Shallow Water selected]{src="./water/palette.png"}');
  assert.match(result.code, /<figure class="shot shot-missing">/);
  assert.match(result.code, /<span class="shot-flag">Screenshot needed<\/span><span class="shot-note">The Terrain Palette with Shallow Water selected<\/span>/);
  assert(!result.code.includes('<img'));
  assert.deepEqual(result.metadata.localImagePaths, []);
});

Deno.test('a screenshot without a relative src is an error', async () => {
  await assert.rejects(() => render('::shot[No source]'), /::shot needs a src/);
  await assert.rejects(() => render('::shot[Absolute]{src="/images/a.png"}'), /::shot needs a src/);
});

Deno.test('verify notes are removed and docs links reload the page', async () => {
  const output = await html('Press F9.\n\n<!-- verify: F9 opens the Help -->\n\nSee [the docs](/framework/docs/installation/) and [resources](/resources/).');
  assert(!output.includes('verify'), 'Verify notes never reach the page');
  assert.match(output, /<a href="\/framework\/docs\/installation\/" data-astro-reload="">the docs<\/a>/);
  assert.match(output, /<a href="\/resources\/">resources<\/a>/);
});
```

If the type checker rejects the `createSatteriMarkdownProcessor` options or `render` arguments (their declared types include Astro-internal fields), cast those two arguments with `as Parameters<typeof …>[0]` rather than loosening the plugin's own types.

Run: `deno test -A scripts/tutorials/directives_test.ts`
Expected: FAIL (module not found).

- [ ] **Step 2: Implement the plugin**

`src/markdown/tutorial-directives.ts`:

```ts
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { MdastNode, MdastPluginDefinition, PluginFactoryContext } from 'satteri';

/** Tutorial directives apply only to lessons; Starlight docs and all other Markdown are left alone. */
const TUTORIALS_DIR = '/src/content/tutorials/';

const CALLOUTS: Record<string, string> = { tip: 'Tip', note: 'Note', caution: 'Caution' };
const CHECKPOINT_TITLE = 'Checkpoint: your map now…';

export function isTutorialFile(fileURL: URL | undefined): fileURL is URL {
  return fileURL !== undefined && fileURLToPath(fileURL).replaceAll('\\', '/').includes(TUTORIALS_DIR);
}

type Child = unknown;

/**
 * A node rendered as `tagName`. Sätteri, like remark-rehype, honours `data.hName` and
 * `data.hProperties`. `blockquote` holds block content; `paragraph` and `emphasis` hold phrasing.
 */
function element(type: 'blockquote' | 'paragraph' | 'emphasis', tagName: string, properties: Record<string, unknown>, children: Child[]): MdastNode {
  return { type, data: { hName: tagName, hProperties: properties }, children } as unknown as MdastNode;
}
const text = (value: string) => ({ type: 'text', value });

/** `Ctrl+F9` → `<kbd class="keys"><kbd>Ctrl</kbd>+<kbd>F9</kbd></kbd>`. */
function keys(combination: string): MdastNode {
  const children: Child[] = [];
  combination.split('+').map((key) => key.trim()).filter(Boolean).forEach((key, index) => {
    if (index > 0) children.push(text('+'));
    children.push(element('emphasis', 'kbd', {}, [text(key)]));
  });
  return element('emphasis', 'kbd', { className: ['keys'] }, children);
}

/** `Scenario > Map Options` → a menu path with a separator between items. */
function menuPath(path: string): MdastNode {
  const children: Child[] = [];
  path.split('>').map((item) => item.trim()).filter(Boolean).forEach((item, index) => {
    if (index > 0) children.push(element('emphasis', 'span', { className: ['menu-sep'], ariaHidden: 'true' }, [text('›')]));
    children.push(element('emphasis', 'span', {}, [text(item)]));
  });
  return element('emphasis', 'span', { className: ['menu-path'] }, children);
}

/** A screenshot: the image when its file exists next to the lesson, otherwise a placeholder showing the capture note. */
function shot(alt: string, attributes: Record<string, string | null | undefined> | null | undefined, fileURL: URL): MdastNode {
  const src = attributes?.src ?? '';
  if (!src.startsWith('./')) {
    throw new Error(`::shot needs a src relative to the lesson, starting with "./" (${fileURLToPath(fileURL)}: "${alt}")`);
  }
  const caption = attributes?.caption;
  const figcaption = caption ? [element('paragraph', 'figcaption', {}, [text(caption)])] : [];
  if (existsSync(fileURLToPath(new URL(src, fileURL)))) {
    return element('blockquote', 'figure', { className: ['shot'] }, [{ type: 'image', url: src, alt }, ...figcaption]);
  }
  return element('blockquote', 'figure', { className: ['shot', 'shot-missing'] }, [
    element('paragraph', 'div', { className: ['shot-placeholder'] }, [
      element('emphasis', 'span', { className: ['shot-flag'] }, [text('Screenshot needed')]),
      element('emphasis', 'span', { className: ['shot-note'] }, [text(alt)]),
    ]),
    ...figcaption,
  ]);
}

/** Sätteri plugin factory, registered in `astro.config.ts`. */
export function tutorialDirectives({ fileURL }: PluginFactoryContext): MdastPluginDefinition | undefined {
  if (!isTutorialFile(fileURL)) return undefined;
  return {
    name: 'wc3-tutorial-directives',
    textDirective(node, ctx) {
      if (node.name === 'kbd') return keys(ctx.textContent(node));
      if (node.name === 'menu') return menuPath(ctx.textContent(node));
    },
    leafDirective(node, ctx) {
      if (node.name === 'shot') return shot(ctx.textContent(node), node.attributes, fileURL);
    },
    containerDirective(node) {
      // A `:::name[label]` label arrives as a first paragraph flagged `directiveLabel`.
      const [first, ...rest] = node.children;
      const label = first?.type === 'paragraph' && first.data?.directiveLabel ? first : undefined;
      const body = label ? rest : node.children;
      const title = (fallback: string) => element('paragraph', 'p', { className: ['tutorial-callout-title'] }, label ? label.children : [text(fallback)]);
      if (node.name === 'steps') return element('blockquote', 'div', { className: ['tutorial-steps'] }, body);
      if (node.name === 'checkpoint') return element('blockquote', 'aside', { className: ['tutorial-checkpoint'] }, [title(CHECKPOINT_TITLE), ...body]);
      const calloutTitle = CALLOUTS[node.name];
      if (calloutTitle) {
        return element('blockquote', 'aside', { className: ['tutorial-callout', `tutorial-callout-${node.name}`] }, [title(calloutTitle), ...body]);
      }
    },
    html(node) {
      // Author notes marking editor facts to confirm; `tutorial:check` lists them.
      if (/^<!--\s*verify:/.test(node.value)) return { raw: '' };
    },
    link(node, ctx) {
      // Starlight pages don't use the shell's client router; load them in full.
      if (node.url.startsWith('/framework/docs/')) ctx.setProperty(node, 'data', { ...node.data, hProperties: { dataAstroReload: '' } });
    },
  };
}
```

If `deno task check` reports that `first.data?.directiveLabel` does not exist (the `mdast` augmentation in satteri's types did not load), read it through a narrow cast (`(first.data as { directiveLabel?: boolean } | undefined)?.directiveLabel`) and keep everything else typed.

- [ ] **Step 3: Register the plugin**

In `astro.config.ts`:

```ts
import { satteri } from '@astrojs/markdown-satteri';
import { tutorialDirectives } from './src/markdown/tutorial-directives';
```

and change the `markdown` entry to:

```ts
  markdown: {
    // Sätteri is Astro 7's default Markdown engine; the tutorial directives apply only under src/content/tutorials/.
    processor: satteri({ mdastPlugins: [tutorialDirectives] }),
    shikiConfig: { langs: [jass], themes: { light: 'github-light', dark: 'github-dark' } },
  },
```

- [ ] **Step 4: Run the tests**

Run: `deno test -A scripts/tutorials/directives_test.ts`
Expected: PASS (8 tests).

Run: `deno task test`
Expected: PASS. The docs still render and highlight JASS (the existing syntax-token test covers the Shiki config).

- [ ] **Step 5: Commit**

```bash
git add src/markdown/tutorial-directives.ts scripts/tutorials/directives_test.ts astro.config.ts
git commit -m "Add Markdown directives for tutorials"
```

---

### Task 3: Track pages, outline, styles, and lesson stubs

**Files:**
- Create: `src/components/learn/{TrackOutline,LessonHeader,LessonPager,ChapterCard}.astro`, `src/pages/learn/[chapter]/[lesson].astro`, `src/pages/learn/next.astro`, `src/styles/learn.css`, `src/content/tutorials/<chapter>/<lesson>.md` (21 stubs), `src/content/tutorials/next.md`
- Modify: `src/pages/learn/index.astro`, `scripts/site_test.ts`

**Interfaces:**
- Consumes: `getTrack`, `getClosingPage`, `closingLink` (Task 1); `pager`, `sectionHeadings`, `formatMinutes`, `TRACK` (Task 1); directive classes (Task 2).
- Produces: markup the scroll-spy (Task 4) and tests rely on:
  - Outline: `<nav class="track-outline" aria-label="Tutorial track">`; the current lesson's link is `<a href="…" aria-current="page">`; its headings are `<ol class="outline-headings">` of `<a href="#slug">`.
  - Pager: `<a class="pager-prev" rel="prev" href="…">`, `<a class="pager-next" rel="next" href="…">`.
  - Landing: `<a class="button primary track-start" href="…">`.

- [ ] **Step 1: Write the failing build tests**

Append to `scripts/site_test.ts`:

```ts
/** Lesson ids (`<chapter>/<slug>`) from the content folder. */
async function lessonIds(): Promise<string[]> {
  const base = new URL('../src/content/tutorials/', import.meta.url);
  const ids: string[] = [];
  for await (const chapter of Deno.readDir(base)) {
    if (!chapter.isDirectory) continue;
    for await (const file of Deno.readDir(new URL(`${chapter.name}/`, base))) {
      if (file.isFile && file.name.endsWith('.md')) ids.push(`${chapter.name}/${file.name.slice(0, -3)}`);
    }
  }
  return ids.sort();
}

const readRoute = (path: string) => Deno.readTextFile(new URL(`${path.replace(/^\//, '')}index.html`, root));
const between = (html: string, start: string, end: string) => html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)));

Deno.test('the tutorial track chains every lesson from the overview to the closing page', async () => {
  const landing = await readRoute('/learn/');
  assert(!landing.includes('name="wc3-tab"'), 'The track overview is a section page, not a tab');
  let path = landing.match(/<a class="button primary track-start" href="([^"]+)"/)?.[1];
  assert(path, 'Missing "Start the track" link');
  const visited: string[] = [];
  let previous = '/learn/';
  while (path !== '/learn/next/') {
    assert(!visited.includes(path), `The lesson chain loops at ${path}`);
    visited.push(path);
    const html = await readRoute(path);
    assert.match(html, /<meta name="wc3-tab"/, `Lessons open as tabs (${path})`);
    assert.equal(html.match(/<a class="pager-prev" rel="prev" href="([^"]+)"/)?.[1], previous, `Previous link of ${path}`);
    const outline = between(html, '<nav class="track-outline"', '</nav>');
    const current = [...outline.matchAll(/<a href="([^"]+)" aria-current="page"/g)].map((match) => match[1]);
    assert.deepEqual(current, [path], `The outline marks exactly the current lesson (${path})`);
    const main = between(html, '<main', '</main>');
    assert(!/:::|::shot|:(kbd|menu)\[/.test(main), `Raw directive text on ${path}`);
    for (const [, attributes] of main.matchAll(/<h2([^>]*)>/g)) assert.match(attributes, /\bid="/, `A heading without an id on ${path}`);
    previous = path;
    path = html.match(/<a class="pager-next" rel="next" href="([^"]+)"/)?.[1];
    assert(path, `Missing next link on ${previous}`);
  }
  assert.deepEqual(visited.map((route) => route.slice('/learn/'.length, -1)).sort(), await lessonIds());
  const closing = await readRoute('/learn/next/');
  assert.match(closing, /<meta name="wc3-tab"/);
  assert.equal(closing.match(/<a class="pager-prev" rel="prev" href="([^"]+)"/)?.[1], previous);
  assert(!closing.includes('class="pager-next"'), 'The closing page ends the track');
});

Deno.test('tutorial markup stays out of the framework docs', async () => {
  for (const file of await htmlFiles(new URL('framework/docs/', root))) {
    const html = await Deno.readTextFile(file);
    assert(!/class="(keys|menu-path|tutorial-[a-z-]+|shot[a-z -]*)"/.test(html), `Tutorial markup in ${file.pathname}`);
  }
});
```

Run: `deno task test`
Expected: FAIL (`/learn/` has no start link).

- [ ] **Step 2: Add the lesson stubs and the closing page**

For every lesson in **Appendix A**, create `src/content/tutorials/<chapter>/<slug>.md` with exactly the frontmatter given there and this body (Tasks 6–11 replace the body):

```md
This lesson is being written.

## Overview

The full lesson will follow the outline in the tutorials plan.
```

Create `src/content/tutorials/next.md` with the full content in **Appendix B**.

- [ ] **Step 3: Build the components**

`src/components/learn/TrackOutline.astro`:

```astro
---
import { TRACK } from '../../data/tutorials';
import type { PagerLink, Track } from '../../lib/tutorials';
interface Props {
  track: Track;
  closing: PagerLink;
  /** The lesson being read; its chapter opens and its headings are listed. */
  currentId?: string;
  headings?: { slug: string; text: string }[];
  /** True on the closing page itself. */
  closingCurrent?: boolean;
}
const { track, closing, currentId, headings = [], closingCurrent = false } = Astro.props;
---
<nav class="track-outline" aria-label="Tutorial track">
  <h2 class="panel-title"><a href="/learn/">{TRACK.short}</a></h2>
  {track.chapters.map((chapter) => (
    <details open={chapter.lessons.some((lesson) => lesson.id === currentId)}>
      <summary><span class="outline-number" aria-hidden="true">{chapter.number}</span>{chapter.title}</summary>
      <ol>
        {chapter.lessons.map((lesson) => lesson.id === currentId
          ? (
            <li>
              <a href={lesson.href} aria-current="page">{lesson.data.title}</a>
              {headings.length > 0 && (
                <ol class="outline-headings">
                  {headings.map((heading) => <li><a href={`#${heading.slug}`}>{heading.text}</a></li>)}
                </ol>
              )}
            </li>
          )
          : <li><a href={lesson.href}>{lesson.data.title}</a></li>)}
      </ol>
    </details>
  ))}
  <a class="outline-closing" href={closing.href} aria-current={closingCurrent ? 'page' : undefined}>{closing.title}</a>
</nav>
```

`src/components/learn/LessonHeader.astro`:

```astro
---
import { Clock } from 'lucide-astro';
import { formatMinutes, type TrackLesson } from '../../lib/tutorials';
interface Props { lesson: TrackLesson; chapterTitle: string }
const { lesson, chapterTitle } = Astro.props;
---
<header class="lesson-header">
  <p class="eyebrow">Chapter {lesson.chapterNumber} · {chapterTitle}</p>
  <h1>{lesson.data.title}</h1>
  <p class="lesson-summary">{lesson.data.summary}</p>
  <p class="lesson-meta"><Clock size={16} aria-hidden="true" /> {formatMinutes(lesson.data.minutes)}</p>
  <div class="lesson-goals">
    <p class="lesson-goals-title">In this lesson you will</p>
    <ul>{lesson.data.goals.map((goal) => <li>{goal}</li>)}</ul>
  </div>
</header>
```

`src/components/learn/LessonPager.astro`:

```astro
---
import { ArrowLeft, ArrowRight } from 'lucide-astro';
import type { PagerLink } from '../../lib/tutorials';
interface Props { previous?: PagerLink; next?: PagerLink }
const { previous, next } = Astro.props;
---
<nav class="lesson-pager" aria-label="Previous and next">
  {previous && (
    <a class="pager-prev" rel="prev" href={previous.href}>
      <span class="pager-label"><ArrowLeft size={14} aria-hidden="true" /> Previous</span>
      <span class="pager-title">{previous.title}</span>
    </a>
  )}
  {next && (
    <a class="pager-next" rel="next" href={next.href}>
      <span class="pager-label">Next <ArrowRight size={14} aria-hidden="true" /></span>
      <span class="pager-title">{next.title}</span>
    </a>
  )}
</nav>
```

`src/components/learn/ChapterCard.astro`:

```astro
---
import { formatMinutes, type TrackChapter } from '../../lib/tutorials';
interface Props { chapter: TrackChapter }
const { chapter } = Astro.props;
---
<article class="chapter-card">
  <header>
    <span class="chapter-number">Chapter {chapter.number}</span>
    <h2>{chapter.title}</h2>
    <span class="chapter-minutes">{formatMinutes(chapter.minutes)}</span>
  </header>
  <p>{chapter.summary}</p>
  <ol>
    {chapter.lessons.map((lesson) => (
      <li><a href={lesson.href}>{lesson.data.title}</a><span>{formatMinutes(lesson.data.minutes)}</span></li>
    ))}
  </ol>
</article>
```

- [ ] **Step 4: Build the pages**

Replace `src/pages/learn/index.astro`:

```astro
---
import { ArrowRight, ArrowUpRight } from 'lucide-astro';
import Shell from '../../layouts/Shell.astro';
import ChapterCard from '../../components/learn/ChapterCard.astro';
import TrackOutline from '../../components/learn/TrackOutline.astro';
import { TRACK } from '../../data/tutorials';
import { closingLink, getClosingPage, getTrack } from '../../lib/learn';
import { formatMinutes } from '../../lib/tutorials';
import '../../styles/home.css';
import '../../styles/learn.css';

const track = await getTrack();
const closing = await closingLink();
const closingPage = await getClosingPage();
const first = track.lessons[0];
const total = track.lessons.reduce((sum, lesson) => sum + lesson.data.minutes, 0);
---
<Shell title="Learn" description="Getting started with Warcraft III: Reforged modding, from your first World Editor map to a playable game.">
  <TrackOutline slot="side" track={track} closing={closing} />
  <div class="learn-landing wrap">
    <div class="workspace-heading">
      <p class="eyebrow">{TRACK.title}</p>
      <h1>Learn to mod <span>Warcraft III.</span></h1>
      <p class="track-intro">Build <strong>Defend the Village</strong>, a small map where you hold a village against waves of creeps. You start from an empty map and finish with a playable game, using only the World Editor. All you need is Warcraft III: Reforged; no programming.</p>
    </div>
    <ul class="track-stats">
      <li><strong>{track.chapters.length}</strong> chapters</li>
      <li><strong>{track.lessons.length}</strong> lessons</li>
      <li>About <strong>{formatMinutes(total)}</strong></li>
    </ul>
    <div class="actions">
      {first && <a class="button primary track-start" href={first.href}>Start the track <ArrowRight size={18} /></a>}
      <a class="button secondary" href="https://www.hiveworkshop.com/">Hive Workshop <ArrowUpRight size={18} /></a>
    </div>
    <div class="chapter-grid">{track.chapters.map((chapter) => <ChapterCard chapter={chapter} />)}</div>
    <section class="docs-callout track-next">
      <div><h2>{closingPage.data.title}</h2><p>{closingPage.data.summary}</p></div>
      <a class="button secondary" href={closing.href}>Read on <ArrowRight size={18} /></a>
    </section>
  </div>
</Shell>
```

`src/pages/learn/[chapter]/[lesson].astro`:

```astro
---
import { render } from 'astro:content';
import Shell from '../../../layouts/Shell.astro';
import LessonHeader from '../../../components/learn/LessonHeader.astro';
import LessonPager from '../../../components/learn/LessonPager.astro';
import TrackOutline from '../../../components/learn/TrackOutline.astro';
import { closingLink, getTrack } from '../../../lib/learn';
import { pager, sectionHeadings } from '../../../lib/tutorials';
import '../../../styles/learn.css';

export async function getStaticPaths() {
  const track = await getTrack();
  const closing = await closingLink();
  return track.lessons.map((lesson) => ({
    params: { chapter: lesson.chapter, lesson: lesson.slug },
    props: { track, lesson, closing },
  }));
}

type Props = Awaited<ReturnType<typeof getStaticPaths>>[number]['props'];
const { track, lesson, closing } = Astro.props as Props;
const { Content, headings } = await render(lesson.entry);
const chapter = track.chapters[lesson.chapterNumber - 1];
const { previous, next } = pager(track, lesson.id, closing);
---
<Shell title={lesson.data.title} description={lesson.data.summary} tab>
  <TrackOutline slot="side" track={track} closing={closing} currentId={lesson.id} headings={sectionHeadings(headings)} />
  <article class="lesson wrap">
    <LessonHeader lesson={lesson} chapterTitle={chapter.title} />
    <div class="lesson-body"><Content /></div>
    <LessonPager previous={previous} next={next} />
  </article>
</Shell>
```

`src/pages/learn/next.astro`:

```astro
---
import { render } from 'astro:content';
import Shell from '../../layouts/Shell.astro';
import LessonPager from '../../components/learn/LessonPager.astro';
import TrackOutline from '../../components/learn/TrackOutline.astro';
import { TRACK } from '../../data/tutorials';
import { closingLink, getClosingPage, getTrack } from '../../lib/learn';
import '../../styles/learn.css';

const track = await getTrack();
const closing = await closingLink();
const page = await getClosingPage();
const { Content } = await render(page);
const last = track.lessons.at(-1);
---
<Shell title={page.data.title} description={page.data.summary} tab>
  <TrackOutline slot="side" track={track} closing={closing} closingCurrent />
  <article class="lesson wrap">
    <header class="lesson-header">
      <p class="eyebrow">{TRACK.short}</p>
      <h1>{page.data.title}</h1>
      <p class="lesson-summary">{page.data.summary}</p>
    </header>
    <div class="lesson-body"><Content /></div>
    <LessonPager previous={last && { href: last.href, title: last.data.title }} />
  </article>
</Shell>
```

- [ ] **Step 5: Write the styles**

`src/styles/learn.css`:

```css
/* Tutorials: the track landing, lessons, the side-panel outline, and the Markdown directives. */

/* Icons (lucide) used as masks, so they take the callout's colour. */
:root {
  --icon-tip: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5'/><path d='M9 18h6'/><path d='M10 22h4'/></svg>");
  --icon-note: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><path d='M12 16v-4'/><path d='M12 8h.01'/></svg>");
  --icon-caution: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'/><path d='M12 9v4'/><path d='M12 17h.01'/></svg>");
  --icon-checkpoint: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528'/></svg>");
  --icon-camera: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z'/><circle cx='12' cy='13' r='3'/></svg>");
}

/* Landing */
.learn-landing { padding-block: 40px 64px; }
.track-intro { max-width: 68ch; }
.track-intro strong { color: var(--ink); }
.track-stats { display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; margin: 18px 0 24px; padding: 0; list-style: none; color: var(--muted); font-size: .85rem; letter-spacing: .04em; }
.track-stats strong { color: var(--ink); }
.chapter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 16px; margin-block: 40px; }
.chapter-card { display: flex; flex-direction: column; gap: 10px; padding: 20px; background: var(--panel); border: 1px solid var(--line); }
.chapter-card header { display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 2px 12px; }
.chapter-number { grid-column: 1 / -1; color: var(--accent); font-size: .72rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; }
.chapter-card h2 { margin: 0; font-size: 1.2rem; }
.chapter-minutes, .chapter-card li span { color: var(--muted); font-size: .8rem; white-space: nowrap; }
.chapter-card p { margin: 0; font-size: .92rem; }
.chapter-card ol { margin: 4px 0 0; padding: 0; list-style: none; border-top: 1px solid var(--line); }
.chapter-card li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line); font-size: .9rem; }
.chapter-card li a:hover { color: var(--accent); }

/* Lesson */
.lesson { max-width: 820px; padding-block: 36px 64px; }
.lesson-header { margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
.lesson-header h1 { margin: 10px 0 12px; font-size: clamp(1.8rem, 4cqi, 2.6rem); line-height: 1.15; }
.lesson-summary { margin: 0; font-size: 1.05rem; }
.lesson-meta { display: flex; align-items: center; gap: 6px; margin: 14px 0 0; color: var(--muted); font-size: .85rem; }
.lesson-goals { margin-top: 18px; padding: 14px 18px; background: var(--panel); border-left: 2px solid var(--accent); }
.lesson-goals-title { margin: 0 0 6px; color: var(--ink); font-size: .9rem; font-weight: 600; }
.lesson-goals ul { margin: 0; padding-left: 1.2rem; color: var(--muted); }
.lesson-body { line-height: 1.7; }
.lesson-body h2 { margin: 2.2em 0 .6em; font-size: 1.45rem; scroll-margin-top: 16px; }
.lesson-body h3 { margin: 1.8em 0 .5em; font-size: 1.1rem; scroll-margin-top: 16px; }
.lesson-body li { color: var(--muted); }
.lesson-body li + li { margin-top: .35em; }
.lesson-body ul, .lesson-body ol { padding-left: 1.4rem; }
.lesson-body strong { color: var(--ink); }
.lesson-body a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
.lesson-body code { padding: .1em .35em; border-radius: 3px; background: var(--panel); color: var(--ink); font-family: var(--font-code); font-size: .9em; }

/* Directives */
kbd.keys { font: inherit; white-space: nowrap; }
kbd.keys kbd { display: inline-block; min-width: 1.6em; padding: .05em .45em; border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 3px; background: #0f191f; color: var(--ink); font: .82em/1.5 var(--font-code); text-align: center; }
.menu-path { color: var(--ink); font-weight: 600; }
.menu-sep { margin: 0 .35em; color: var(--accent); font-weight: 400; }

.tutorial-steps ol { padding-left: 0; list-style: none; counter-reset: step; }
.tutorial-steps li { position: relative; min-height: 1.8rem; padding-left: 2.6rem; counter-increment: step; }
.tutorial-steps li::before { content: counter(step); position: absolute; left: 0; top: .1em; display: grid; place-items: center; width: 1.75rem; height: 1.75rem; border: 1px solid var(--accent); border-radius: 50%; color: var(--accent); font-size: .8rem; font-weight: 600; }

.tutorial-callout, .tutorial-checkpoint { position: relative; margin: 1.5em 0; padding: 14px 18px 14px 48px; background: var(--panel); border-left: 3px solid var(--callout); }
.tutorial-callout::before, .tutorial-checkpoint::before { content: ""; position: absolute; left: 16px; top: 17px; width: 18px; height: 18px; background: var(--callout); mask: var(--callout-icon) center / contain no-repeat; }
.tutorial-callout > :last-child, .tutorial-checkpoint > :last-child { margin-bottom: 0; }
.tutorial-callout-title { margin: 0 0 .3em; color: var(--ink); font-weight: 600; }
.tutorial-callout-tip { --callout: #8fcf8a; --callout-icon: var(--icon-tip); }
.tutorial-callout-note { --callout: #86b7e8; --callout-icon: var(--icon-note); }
.tutorial-callout-caution { --callout: #f0a44b; --callout-icon: var(--icon-caution); }
.tutorial-checkpoint { --callout: var(--accent); --callout-icon: var(--icon-checkpoint); border: 1px solid var(--accent); border-left-width: 3px; }

.shot { margin: 1.6em 0; }
.shot img { display: block; width: 100%; height: auto; border: 1px solid var(--line); }
.shot figcaption { margin-top: 8px; color: var(--muted); font-size: .85rem; }
.shot-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; aspect-ratio: 16 / 9; padding: 24px; border: 1px dashed var(--line); background: repeating-linear-gradient(135deg, #15222a 0 12px, #172630 12px 24px); text-align: center; }
.shot-flag { display: flex; align-items: center; gap: 8px; color: var(--accent); font-size: .75rem; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; }
.shot-flag::before { content: ""; width: 18px; height: 18px; background: currentColor; mask: var(--icon-camera) center / contain no-repeat; }
.shot-note { max-width: 52ch; color: var(--muted); font-size: .9rem; }

/* Previous and next */
.lesson-pager { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--line); }
.lesson-pager a { display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; background: var(--panel); border: 1px solid var(--line); }
.lesson-pager a:hover { border-color: var(--accent); }
.pager-next { grid-column: 2; align-items: flex-end; text-align: right; }
.pager-label { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; }
.pager-title { color: var(--ink); font-weight: 600; }
@container (max-width: 520px) {
  .lesson-pager { grid-template-columns: 1fr; }
  .pager-next { grid-column: auto; }
}

/* Side-panel outline */
.track-outline { display: flex; flex-direction: column; gap: 2px; font-size: .88rem; }
.track-outline .panel-title a:hover { color: var(--ink); }
.track-outline summary { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 2px; color: var(--ink); cursor: pointer; list-style: none; }
.track-outline summary::-webkit-details-marker { display: none; }
.track-outline summary::after { content: "›"; margin-left: auto; color: var(--muted); transition: transform .15s; }
.track-outline details[open] > summary::after { transform: rotate(90deg); }
.track-outline summary:hover { background: #1f2e37; }
.outline-number { display: grid; place-items: center; flex-shrink: 0; width: 1.4rem; height: 1.4rem; border: 1px solid var(--line); border-radius: 50%; color: var(--muted); font-size: .72rem; }
.track-outline ol { margin: 0; padding: 0 0 4px 30px; list-style: none; }
.track-outline li a { display: block; padding: 5px 8px; border-radius: 2px; color: var(--muted); }
.track-outline li a:hover { background: #1f2e37; color: var(--ink); }
.track-outline a[aria-current="page"] { background: #1b2931; box-shadow: inset 2px 0 0 var(--accent); color: var(--accent); }
.track-outline .outline-headings { padding: 2px 0 6px 12px; }
.outline-headings a { padding: 3px 8px; font-size: .82rem; }
.outline-headings a[aria-current="location"] { box-shadow: inset 2px 0 0 var(--muted); color: var(--ink); }
.outline-closing { margin-top: 6px; padding: 7px 8px; border-top: 1px solid var(--line); color: var(--muted); }
.outline-closing:hover { color: var(--ink); }
.outline-closing[aria-current="page"] { color: var(--accent); }
.track-outline a:focus-visible, .track-outline summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .track-outline summary::after { transition: none; } }
```

- [ ] **Step 6: Run the checks and tests**

Run: `deno task check`
Expected: 0 errors.

Run: `deno task test`
Expected: PASS, including both new tests and the existing link, search-index and shell tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/learn src/pages/learn src/styles/learn.css src/content/tutorials scripts/site_test.ts
git commit -m "Add the tutorial track pages, outline, and lesson stubs"
```

---

### Task 4: Outline scroll-spy

**Files:**
- Create: `src/scripts/learn/outline-state.ts`, `src/scripts/learn/outline.ts`, `scripts/tutorials/outline_test.ts`
- Modify: `src/pages/learn/[chapter]/[lesson].astro`

**Interfaces:**
- Consumes: outline markup (Task 3).
- Produces: `activeIndex(tops, offset, atBottom)`; the scroll-spy sets `aria-current="location"` on one `.outline-headings a`.

- [ ] **Step 1: Write the failing test**

`scripts/tutorials/outline_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { activeIndex } from '../../src/scripts/learn/outline-state.ts';

Deno.test('the active heading is the last one scrolled past the offset', () => {
  assert.equal(activeIndex([], 80, false), -1);
  assert.equal(activeIndex([200, 900, 1600], 80, false), -1, 'Nothing is active above the first section');
  assert.equal(activeIndex([60, 900, 1600], 80, false), 0);
  assert.equal(activeIndex([-700, 40, 900], 80, false), 1);
  assert.equal(activeIndex([-1500, -700, 300], 80, false), 1);
  assert.equal(activeIndex([-1500, -700, 300], 80, true), 2, 'At the bottom, the last section is active');
});
```

Run: `deno test -A scripts/tutorials/outline_test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement**

`src/scripts/learn/outline-state.ts`:

```ts
/**
 * Which section is being read: the last heading whose top (relative to the scroll container)
 * is at or above `offset`, or the last heading once the container is scrolled to the bottom.
 * Returns -1 above the first heading.
 */
export function activeIndex(tops: readonly number[], offset: number, atBottom: boolean): number {
  if (tops.length === 0) return -1;
  if (atBottom) return tops.length - 1;
  let active = -1;
  tops.forEach((top, index) => {
    if (top <= offset) active = index;
  });
  return active;
}
```

`src/scripts/learn/outline.ts`:

```ts
import { activeIndex } from './outline-state.ts';

/** How far below the top of the workspace a heading counts as "being read". */
const OFFSET = 96;

let cleanup: (() => void) | undefined;

function bind(): void {
  const main = document.getElementById('main');
  const pairs = [...document.querySelectorAll<HTMLAnchorElement>('.track-outline .outline-headings a')]
    .map((link) => ({ link, heading: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
    .filter((pair): pair is { link: HTMLAnchorElement; heading: HTMLElement } => pair.heading !== null);
  if (!main || pairs.length === 0) return;

  let frame = 0;
  const update = () => {
    frame = 0;
    const top = main.getBoundingClientRect().top;
    const tops = pairs.map(({ heading }) => heading.getBoundingClientRect().top - top);
    const atBottom = main.scrollTop + main.clientHeight >= main.scrollHeight - 2;
    const active = activeIndex(tops, OFFSET, atBottom);
    pairs.forEach(({ link }, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  main.addEventListener('scroll', onScroll, { passive: true });
  update();
  cleanup = () => {
    main.removeEventListener('scroll', onScroll);
    if (frame) cancelAnimationFrame(frame);
  };
}

document.addEventListener('astro:page-load', bind);
document.addEventListener('astro:before-swap', () => {
  cleanup?.();
  cleanup = undefined;
});
```

In `src/pages/learn/[chapter]/[lesson].astro`, add inside `<Shell>`, after `</article>`:

```astro
  <script>import '../../../scripts/learn/outline.ts';</script>
```

- [ ] **Step 3: Test**

Run: `deno test -A scripts/tutorials/outline_test.ts` → PASS.
Run: `deno task check` → 0 errors. Run: `deno task test` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/learn scripts/tutorials/outline_test.ts "src/pages/learn/[chapter]/[lesson].astro"
git commit -m "Highlight the section being read in the tutorial outline"
```

---

### Task 5: `tutorial:check`, CI, and the writing guide

**Files:**
- Create: `scripts/tutorials/check.ts`, `scripts/tutorials/check_test.ts`, `docs/tutorial-writing.md`
- Modify: `deno.json`, `deno.lock`, `.github/workflows/check.yml`

**Interfaces:**
- Consumes: `lessonSchema`, `tutorialPageSchema`, `TUTORIAL_SLUG` (Task 1); `chapters` (Task 1).
- Produces: `checkTutorials(root, chapterSlugs?) → Promise<TutorialReport>`, `formatReport(report) → string`, `interface TutorialReport { errors; lessons; shots; missing: { page; src; note }[]; verify: { page; note }[] }`.

- [ ] **Step 1: Write the failing tests**

`scripts/tutorials/check_test.ts`:

```ts
import { strict as assert } from 'node:assert';
import { join } from 'jsr:@std/path@^1';
import { checkTutorials, formatReport } from './check.ts';

const lesson = (order: number, body: string, extra = '') => `---
title: A lesson
summary: What it teaches.
order: ${order}
minutes: 10
goals:
  - Learn a thing${extra}
---

${body}
`;

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await Deno.makeTempDir();
  for (const [path, content] of Object.entries(files)) {
    await Deno.mkdir(join(root, path, '..'), { recursive: true });
    await Deno.writeTextFile(join(root, path), content);
  }
  return root;
}

Deno.test('a valid track reports shots and verify notes without errors', async () => {
  const root = await fixture({
    'basics/intro.md': lesson(1, '## Start\n\n::shot[The main window]{src="./intro/main.png"}\n\n::shot[The palette]{src="./intro/palette.png"}\n\n<!-- verify: F4 opens the Trigger Editor -->'),
    'basics/intro/main.png': 'png',
    'basics/tour.md': lesson(2, '## Tour\n\n```md\n::shot[Inside a code block]{src="./nowhere.png"}\n```'),
    'next.md': '---\ntitle: Where to go next\nsummary: Onward.\n---\n\n## Hive\n',
  });
  const report = await checkTutorials(root, ['basics']);
  assert.deepEqual(report.errors, []);
  assert.equal(report.lessons, 2);
  assert.equal(report.shots, 2);
  assert.deepEqual(report.missing, [{ page: 'basics/intro', src: './intro/palette.png', note: 'The palette' }]);
  assert.deepEqual(report.verify, [{ page: 'basics/intro', note: 'F4 opens the Trigger Editor' }]);
  const text = formatReport(report);
  assert.match(text, /1 of 2 screenshots captured/);
  assert.match(text, /\.\/intro\/palette\.png: The palette/);
  assert.match(text, /F4 opens the Trigger Editor/);
});

Deno.test('structural problems are errors', async () => {
  const root = await fixture({
    'basics/intro.md': lesson(1, 'No sections here.'),
    'basics/Bad_Name.md': lesson(2, '## A'),
    'basics/dupe.md': lesson(1, '## B\n\n::shot[Wrong folder]{src="./elsewhere/x.png"}'),
    'basics/broken.md': '---\ntitle: Missing fields\n---\n\n## C\n',
    'cinematics/intro.md': lesson(1, '## D'),
    'next.md': '---\ntitle: Where to go next\n---\n',
  });
  const report = await checkTutorials(root, ['basics', 'terrain']);
  const expect = (pattern: RegExp) => assert(report.errors.some((error) => pattern.test(error)), `Expected an error matching ${pattern}:\n${report.errors.join('\n')}`);
  expect(/^basics\/intro\.md: .*"## "/);
  expect(/^basics\/Bad_Name\.md: file name/);
  expect(/^basics\/(dupe|intro)\.md: order 1 is also used by basics\/(dupe|intro)/);
  expect(/^basics\/dupe\.md: .*\.\/dupe\//);
  expect(/^basics\/broken\.md: /);
  expect(/^cinematics\/: not a chapter/);
  expect(/^terrain\/: chapter has no lessons/);
  expect(/^next\.md: /);
});
```

Run: `deno test -A scripts/tutorials/check_test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement the command**

`scripts/tutorials/check.ts`:

```ts
import { fromFileUrl, join } from 'jsr:@std/path@^1';
import { extract } from 'jsr:@std/front-matter@^1/yaml';
import { z } from 'astro/zod';
import { chapters } from '../../src/data/tutorials.ts';
import { lessonSchema, TUTORIAL_SLUG, tutorialPageSchema } from '../../src/lib/tutorial-schema.ts';

export interface MissingShot { page: string; src: string; note: string }
export interface VerifyNote { page: string; note: string }
export interface TutorialReport {
  errors: string[];
  lessons: number;
  /** Every `::shot` in the track, captured or not. */
  shots: number;
  missing: MissingShot[];
  verify: VerifyNote[];
}

const FENCE = /^(```|~~~)[\s\S]*?^\1[^\n]*$/gm;
const SHOT = /^::shot\[([^\]]*)\](?:\{([^}]*)\})?[ \t]*$/gm;
const ATTRIBUTE = /(\w+)="([^"]*)"/g;
const VERIFY = /<!--\s*verify:\s*([\s\S]*?)\s*-->/g;
const IMAGE = /\.(png|jpe?g|webp)$/i;

const describe = (error: unknown) =>
  error instanceof z.ZodError ? z.prettifyError(error).replaceAll('\n', ' ') : error instanceof Error ? error.message : String(error);

async function sortedEntries(dir: string): Promise<Deno.DirEntry[]> {
  const entries: Deno.DirEntry[] = [];
  for await (const entry of Deno.readDir(dir)) entries.push(entry);
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

const exists = (path: string) => Deno.stat(path).then(() => true, () => false);

/** Checks one Markdown file; returns its parsed frontmatter, or undefined when it has errors. */
async function checkPage(
  report: TutorialReport,
  dir: string,
  page: string,
  schema: typeof lessonSchema | typeof tutorialPageSchema,
  needsSection: boolean,
): Promise<Record<string, unknown> | undefined> {
  const name = page.split('/').at(-1)!;
  const file = `${page}.md`;
  if (!TUTORIAL_SLUG.test(name)) report.errors.push(`${file}: file name must be a lowercase kebab-case slug`);
  let attrs: Record<string, unknown>;
  let body: string;
  try {
    ({ attrs, body } = extract<Record<string, unknown>>(await Deno.readTextFile(join(dir, `${name}.md`))));
  } catch (error) {
    report.errors.push(`${file}: frontmatter: ${describe(error)}`);
    return undefined;
  }
  const prose = body.replace(FENCE, '');
  if (needsSection && !/^## /m.test(prose)) report.errors.push(`${file}: a lesson needs at least one "## " section heading`);
  for (const [, note, attributeText = ''] of prose.matchAll(SHOT)) {
    report.shots++;
    const attributes = Object.fromEntries([...attributeText.matchAll(ATTRIBUTE)].map(([, key, value]) => [key, value]));
    const src = attributes.src ?? '';
    if (!src.startsWith(`./${name}/`) || !IMAGE.test(src)) {
      report.errors.push(`${file}: screenshot "${note}" must be a .png, .jpg or .webp in ./${name}/ (got "${src}")`);
    } else if (!(await exists(join(dir, src)))) {
      report.missing.push({ page, src, note });
    }
  }
  for (const [, note] of prose.matchAll(VERIFY)) report.verify.push({ page, note: note.replace(/\s+/g, ' ') });
  const parsed = schema.safeParse(attrs);
  if (!parsed.success) {
    report.errors.push(`${file}: ${describe(parsed.error)}`);
    return undefined;
  }
  return parsed.data;
}

/** Validates the track under `root` (`src/content/tutorials/`). */
export async function checkTutorials(root: string, chapterSlugs: readonly string[] = chapters.map((chapter) => chapter.slug)): Promise<TutorialReport> {
  const report: TutorialReport = { errors: [], lessons: 0, shots: 0, missing: [], verify: [] };
  const known = new Set(chapterSlugs);
  for (const entry of await sortedEntries(root)) {
    if (entry.isDirectory && !known.has(entry.name)) report.errors.push(`${entry.name}/: not a chapter in src/data/tutorials.ts`);
    if (entry.isFile && entry.name.endsWith('.md')) await checkPage(report, root, entry.name.slice(0, -3), tutorialPageSchema, false);
  }
  for (const chapter of chapterSlugs) {
    const dir = join(root, chapter);
    const files = (await exists(dir) ? await sortedEntries(dir) : []).filter((entry) => entry.isFile && entry.name.endsWith('.md'));
    if (files.length === 0) {
      report.errors.push(`${chapter}/: chapter has no lessons`);
      continue;
    }
    const orders = new Map<number, string>();
    for (const file of files) {
      const page = `${chapter}/${file.name.slice(0, -3)}`;
      report.lessons++;
      const data = await checkPage(report, dir, page, lessonSchema, true);
      if (!data) continue;
      const order = data.order as number;
      const other = orders.get(order);
      if (other) report.errors.push(`${page}.md: order ${order} is also used by ${other}`);
      else orders.set(order, page);
    }
  }
  return report;
}

export function formatReport(report: TutorialReport): string {
  const lines = [`Tutorials: ${report.lessons} lessons.`];
  const captured = report.shots - report.missing.length;
  lines.push(`Screenshots: ${captured} of ${report.shots} screenshots captured.`);
  let page = '';
  for (const shot of report.missing) {
    if (shot.page !== page) lines.push(`  ${(page = shot.page)}`);
    lines.push(`    ${shot.src}: ${shot.note}`);
  }
  if (report.verify.length > 0) {
    lines.push(`To verify in the World Editor (${report.verify.length}):`);
    page = '';
    for (const item of report.verify) {
      if (item.page !== page) lines.push(`  ${(page = item.page)}`);
      lines.push(`    - ${item.note}`);
    }
  }
  if (report.errors.length > 0) lines.push(`Errors (${report.errors.length}):`, ...report.errors.map((error) => `  ${error}`));
  return lines.join('\n');
}

if (import.meta.main) {
  const report = await checkTutorials(fromFileUrl(new URL('../../src/content/tutorials/', import.meta.url)));
  console.log(formatReport(report));
  if (report.errors.length > 0) Deno.exit(1);
}
```

In `deno.json` `tasks`, add after `resource:check`:

```json
    "tutorial:check": "deno run -A scripts/tutorials/check.ts",
```

In `.github/workflows/check.yml`, add after the `resource:check` step:

```yaml
      - run: deno task tutorial:check
```

- [ ] **Step 3: Write the writing guide**

Create `docs/tutorial-writing.md` with the full content of **Appendix C**. Tasks 6–11 follow it; it stays in the repository for future lessons.

- [ ] **Step 4: Test**

Run: `deno test -A scripts/tutorials/check_test.ts` → PASS (2 tests). The first run adds `jsr:@std/front-matter` to `deno.lock`; commit it.
Run: `deno task tutorial:check` → exit 0; "21 lessons", "0 of 0 screenshots captured" with the stubs.
Run: `deno task test:unit` → PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/tutorials/check.ts scripts/tutorials/check_test.ts docs/tutorial-writing.md deno.json deno.lock .github/workflows/check.yml
git commit -m "Add tutorial:check and the tutorial writing guide"
```

---

### Tasks 6–11: Lesson content

One task per chapter. Each implementer replaces the stub bodies of that chapter's lessons (keeping the frontmatter from Appendix A exactly) and follows `docs/tutorial-writing.md` and the running-project bible in it. Lessons must build on the state the previous chapter leaves the map in.

**Every content task:**

- [ ] **Step 1:** Read `docs/tutorial-writing.md` in full, the previous chapter's lessons (if any), and the outline for this chapter below.
- [ ] **Step 2:** Write each lesson with the file-writing tool. Follow the outline's sections (`##` headings may be reworded; their order and content may not change without reason) and declare at least the listed screenshots, with capture notes precise enough to reproduce the shot. Mark every editor fact you are not certain of with `<!-- verify: … -->` on the line after it.
- [ ] **Step 3:** Run `deno task tutorial:check` (no errors; every declared shot is listed as missing), then `deno task test` (PASS). Stop a running dev server first.
- [ ] **Step 4:** Commit: `git add src/content/tutorials/<chapter> && git commit -m "Write the <chapter title> chapter"`.

The reviewer for a content task checks: the style guide; consistency with the bible (names, numbers, layout); that each lesson starts from the state the previous one left; no scripting; editor accuracy (anything doubtful must carry a verify note); screenshot notes; no broken links.

#### Task 6: Chapter 1, Editor basics (`editor-basics`)

**install-and-open**
- Intro: what the World Editor is (the map-making tool that ships with the game, the same one Blizzard used) and what the track builds.
- `## What you need`: Warcraft III: Reforged installed through the Battle.net app (the World Editor ships with it); no programming. Windows or macOS; the track shows Windows paths and names macOS differences once. No screenshot.
- `## Launch the World Editor`: from the Battle.net app (game options menu → Show in Explorer, then `_retail_\x86_64\World Editor.exe`; verify whether the Battle.net app also offers a direct launch) and pinning a shortcut. Steps. Shots: `battle-net-options` (the Battle.net game page with the options menu open), `editor-exe` (the game folder with World Editor.exe selected).
- `## Graphics mode`: the editor follows the game's graphics setting (Classic/Reforged); where to switch it and why it does not affect the map file. Verify note. Shot: `graphics-setting`.
- `## Where maps are saved`: `Documents\Warcraft III\Maps` (verify), the `Download` subfolder for maps from other players, why you should keep your own folder. Tip: back up maps before big changes.

**editor-tour**
- `## The main window`: menu bar, toolbar, the terrain view, the minimap, the palette window, the status bar. Shot: `main-window` with the regions described.
- `## Moving around`: arrow keys and edge scrolling, mouse wheel zoom, clicking the minimap, camera reset (verify keys). Steps.
- `## Palettes and layers`: Terrain :kbd[T], Doodads :kbd[D], Units :kbd[U], Regions :kbd[R], Cameras :kbd[C] (verify each); what each layer holds; the "Layer" menu. Shot: `palettes`.
- `## The other editors`: :menu[Module] menu: Trigger Editor :kbd[F4], Sound Editor :kbd[F5], Object Editor :kbd[F6], Campaign Editor :kbd[F7], AI Editor :kbd[F8], Object Manager :kbd[F11], Import/Asset Manager :kbd[F12] (verify every key and name in Reforged). One sentence each; which ones this track uses. Shot: `module-menu`.

**create-your-map**
- `## A new map`: :menu[File > New Map] (:kbd[Ctrl+N]); width and height 96 × 96, tileset Lordaeron Summer, initial tile grass, initial height and no water (verify dialog fields). Steps. Shot: `new-map-dialog`.
- `## Save it`: :menu[File > Save Map As], name `DefendTheVillage.w3x`, in the maps folder; save often (:kbd[Ctrl+S]). Shot: `save-dialog`.
- `## Switch off the melee setup`: every new map starts with a `Melee Initialization` trigger that gives players melee starting units, resources and victory rules; this map replaces all of that. Open the Trigger Editor (:kbd[F4]), select `Melee Initialization`, and untick **Enabled** (verify label); chapter 6 explains triggers and deletes it. Caution callout. Shot: `disable-melee`.
- `## Test it`: :menu[File > Test Map] (:kbd[Ctrl+F9]); the game launches with your empty map; return to the editor. Shot: `first-test` (the game running the empty map).
- `:::checkpoint`: your map exists as a 96 × 96 Lordaeron Summer map saved as `DefendTheVillage.w3x`, its melee setup is switched off, and it launches with Test Map.

#### Task 7: Chapter 2, Terraining (`terrain`)

**painting-tiles**
- `## The Terrain Palette`: open it (:kbd[T]); tile buttons, brush size and shape (verify options). Shot: `terrain-palette`.
- `## Painting`: click and drag; brush sizes; square vs round; undo (:kbd[Ctrl+Z]). Steps. Shot: `painting`.
- `## Choosing tiles`: a tileset offers a limited set of tiles; :menu[Scenario > Modify Tileset] (verify menu) to swap in e.g. Lordaeron Summer Grassy Dirt and Cobble Path; mind the tile limit. Shot: `modify-tileset`.
- `## Lay out the village`: the bible layout: a grass clearing in the north-east for the village, a dirt path from the south-west spawn through the ford site to the village, rough dirt around the edges. Shot: `village-layout` (minimap/overview).

**height-and-cliffs**
- `## Raise and lower`: height tools (Raise, Lower, Plateau, Ripple, Noise, Smooth; verify names); gentle hills around the map. Shot: `height-tools`.
- `## Cliffs`: cliff levels, raise/lower cliff, cliff tile types (Grass cliff, Dirt cliff); cliffs block movement. Shot: `cliff-tools`.
- `## The village plateau`: raise the village clearing one cliff level; keep its edge simple. Steps. Shot: `plateau`.
- `## Ramps`: the ramp tool; one ramp from the plateau to the path, facing the south-west; ramps need straight cliff edges (verify). Shot: `ramp`.

**water**
- `## Shallow and deep water`: water is painted with the cliff tools (Shallow Water, Deep Water; verify); units walk through shallow water, not deep. Shot: `water-tools`.
- `## The river`: a river from the north-west edge to the south-east edge between the spawn and the village, deep water. Steps. Shot: `river`.
- `## The ford`: turn one stretch where the path crosses into shallow water: the only crossing. Tip: why a single crossing makes the defence interesting. Shot: `ford`.
- `## Water colour`: optional tint in :menu[Scenario > Map Options] or terrain settings (verify where); skip if unsure.

**finishing-touches**
- `## Variation`: random tile variation; the brush's variation option or painting with a mix; break up large grass areas. Shot: `variation`.
- `## The pathing view`: :menu[View > Pathing - Ground] (verify; :kbd[P]); what the colours mean. Shot: `pathing-view`.
- `## Check the route`: follow the path from the spawn through the ford up the ramp into the village; fix any blocked spots. Steps.
- `## Test the terrain`: Test Map and walk the route with a unit if one is present (or describe what to look at). 
- `:::checkpoint`: a village clearing on a plateau with one ramp, a river with a single ford, and a walkable path from the spawn.

#### Task 8: Chapter 3, Placing units and doodads (`placement`)

**doodads**
- `## The Doodad Palette`: :kbd[D]; categories; the list of doodads for the tileset. Shot: `doodad-palette`.
- `## Place, rotate and scale`: placing, rotating (verify keys or properties), random rotation/scale options, selecting and moving, deleting; the doodad properties dialog (double-click). Steps. Shot: `doodad-properties`.
- `## Doodads and destructibles`: trees and some objects are destructibles: they can be destroyed and block pathing; plain doodads are decoration. Note.
- `## Dress the village`: fences, crates, barrels, lamp posts inside the village; a tree line framing the map edges and a forest west of the river (for the gnoll camp later). Shots: `village-doodads`, `tree-line`.

**units-and-buildings**
- `## The Unit Palette`: :kbd[U]; the player dropdown (Player 1 (Red)); race/category lists. Shot: `unit-palette`.
- `## Build the village`: for Player 1 (Red): a Town Hall in the centre of the plateau, 4 Farms, a Lumber Mill and 5 Peasants. No gold mine: the Setup trigger in chapter 6 gives the player gold. Steps. Shot: `village-units`.
- `## Unit properties`: double-click a placed unit; hit points, mana, level, owner, facing; the name the editor gives it (e.g. `Town Hall 0001 <gen>`), which triggers use in chapter 6. Shot: `unit-properties`.
- `## Start location`: the Player 1 start location in the village; what it does (camera start, melee start). Shot: `start-location`.

**creep-camps**
- `## Neutral Hostile`: the Neutral Hostile player in the Unit Palette; creeps attack anyone nearby, including the invaders. Shot: `neutral-hostile`.
- `## Two camps`: a gnoll camp in the forest west of the river (2 Gnolls, 1 Gnoll Poacher) and a murloc camp on the river bank north of the ford (2 Murloc Tiderunners); both away from the wave route so they don't fight the waves. Steps. Shot: `creep-camps`.
- `## Item drops`: unit properties → item drops / item tables (verify UI); give the gnoll camp's Poacher a Potion of Healing drop. Shot: `item-drops`.
- `## Camp levels`: minimap colours for camp difficulty (green/orange/red; verify) and keeping camps easy for a new hero.

**regions**
- `## The Region Palette`: :kbd[R]; drawing a region; resizing and moving. Shot: `region-palette`.
- `## Spawn`: a region at the south-west end of the path, named `Spawn`. Steps. Shot: `spawn-region`.
- `## Village`: a region covering the village centre around the Town Hall, named `Village`. Shot: `village-region`.
- `## Naming and colour`: region properties (name, colour, weather/sound options exist but are not used); triggers refer to `Spawn <gen>` and `Village <gen>`.
- `:::checkpoint`: a village with the town hall, farms and peasants, a start location, two creep camps with a drop, and the Spawn and Village regions.

#### Task 9: Chapter 4, Map setup (`map-setup`)

**map-options**
- `## Name and description`: :menu[Scenario > Map Description]: name "Defend the Village", suggested players "1", description (from the bible), author. Shot: `map-description`.
- `## Loading screen`: :menu[Scenario > Map Loading Screen]: title "Defend the Village", subtitle "Hold the ford", text (bible); the default background. Shot: `loading-screen`.
- `## Map options`: :menu[Scenario > Map Options]: what the main flags do (e.g. hide minimap in preview, masked areas partially visible); leave defaults unless the bible says otherwise. Shot: `map-options`.
- `## The preview image`: the map preview in the game's map list (minimap by default); leave it. Test the map and look at the loading screen.

**players-and-forces**
- `## Player slots`: :menu[Scenario > Player Properties]: Player 1 (Red) User, Human, name "Defender"; Player 12 (Brown) Computer, Human race (irrelevant), name "Invaders"; all other slots unused. Why the invaders are a computer player (units that triggers control, with no AI script). Shot: `player-properties`.
- `## Forces`: :menu[Scenario > Force Properties]: Force 1 "Villagers" (Player 1), Force 2 "Invaders" (Player 12); the Allied/Allied Victory/Share Vision flags; "Use Custom Forces" and "Fixed Player Settings" on (verify labels). Shot: `force-properties`.
- `## The invaders' start location`: the editor needs a start location for each used slot (verify): place Player 12's near the Spawn region. Shot: `invader-start`.
- `## Test the setup`: Test Map; the lobby shows fixed slots (verify) and the loading screen.
- `:::checkpoint`: the map has its own name, description and loading screen, a human defender and a computer invader, each in their own force with fixed settings.

#### Task 10: Chapter 5, Object Editor (`object-editor`)

**object-editor-tour**
- `## Open the Object Editor`: :kbd[F6]; the tabs: Units, Items, Destructibles, Doodads, Abilities, Buffs/Effects, Upgrades. Shot: `object-editor`.
- `## Standard and custom objects`: the tree on the left: Standard Units vs Custom Units, by race and melee/campaign; you never edit the game's objects by accident if you copy first (you can edit standard ones, but this track makes custom copies). Shot: `object-tree`.
- `## Fields`: the field list, how a changed field turns colour (verify), resetting a field. 
- `## Raw data`: :menu[View > Display Values As Raw Data] (:kbd[Ctrl+D]; verify) shows raw field IDs and object IDs such as `h000`; why modders talk in rawcodes. Shot: `raw-data`.

**custom-hero**
- `## Copy the Paladin`: find Human > Melee > Heroes > Paladin; copy and paste (or :menu[Edit > New Custom Unit]; verify) to create a custom unit. Steps. Shot: `new-custom-unit`.
- `## Name and proper names`: name "Village Captain"; Text - Proper Names: Aldric, Maren, Tobin; tooltip text. Shot: `hero-names`.
- `## Stats`: Strength 22, Agility 14, Intelligence 16 at level 1 (bible), hit points unchanged; starting level; the model stays the Paladin's (changing models is out of scope; a note points to the resource catalog at `/resources/` for later).
- `## Place the hero`: Unit Palette → Custom Units → Village Captain for Player 1 (Red) next to the Town Hall. Test Map and check the name and stats. Shot: `hero-in-game`.

**custom-ability**
- `## Copy Storm Bolt`: Abilities tab → Human > Heroes > Storm Bolt; copy/paste; name "Shield Throw". Shot: `new-ability`.
- `## Levels and values`: 3 levels; damage 60/120/180; stun (hero and normal) 1/1.5/2 seconds; cooldown 8; mana cost 60 (bible); the per-level fields. Steps. Shot: `ability-levels`.
- `## Tooltips`: Text - Tooltip - Learn, Normal, Extended; the level placeholders (verify `<A000,DataA1>` style references—if unsure, write numbers out). Shot: `ability-tooltips`.
- `## Give it to the hero`: Village Captain → Abilities - Hero: replace Holy Light with Shield Throw (keep Divine Shield, Devotion Aura, Resurrection). Test: learn and cast it on a creep. Shot: `hero-abilities`.

**village-tower**
- `## Copy the Guard Tower`: Units → Human > Melee > Buildings > Guard Tower; copy; name "Village Tower". Shot: `new-tower`.
- `## Attack, cost and build time`: cost 100 gold, 30 lumber; build time 30 seconds; attack damage lowered slightly (bible); clear "Upgrades To" and "Techtree - Requirements" (verify field names). Steps. Shot: `tower-fields`.
- `## Let peasants build it`: Peasant → Techtree - Structures Built: add Village Tower. Shot: `peasant-builds`.
- `## Test`: Test Map; the player has no gold until the Setup trigger in chapter 6, so type the single-player cheat `greedisgood 500` in chat (verify it works in Test Map) and build a tower with a Peasant.
- `:::checkpoint`: the Village Captain with Shield Throw stands in the village, and peasants can build the Village Tower.

#### Task 11: Chapter 6, GUI triggers (`triggers`)

**trigger-basics**
- `## The Trigger Editor`: :kbd[F4]; the tree of categories and triggers; the `Melee Initialization` trigger a new map starts with. Shot: `trigger-editor`.
- `## Events, conditions, actions`: what each is, with a plain-language example ("when a unit dies, if it is the town hall, the player loses").
- `## The melee setup`: the `Melee Initialization` trigger switched off in chapter 1: read its actions now that they make sense, then delete it. Note callout.
- `## A first trigger`: create category "Defend the Village", trigger "Welcome": event :menu[Map Initialization] ("Map initialization"); action "Game - Display Text to (All players)": "Defend the village! The first wave arrives soon." Steps. Shots: `new-trigger`, `welcome-trigger`. Test Map and see the message.

**wave-timer**
- `## Variables`: the Variable Editor (:kbd[Ctrl+B]; verify); create `WaveNumber` (Integer, 0), `WaveUnitType` (Unit-Type, array, size 5), `WaveTimer` (Timer), `WaveWindow` (Timer Window). Steps. Shot: `variable-editor`.
- `## The Setup trigger`: trigger "Setup", event Map initialization; actions: set WaveUnitType[1..5] = Gnoll, Gnoll Poacher, Gnoll Brute, Ogre Warrior, Ogre Mauler (bible); set Player 1's gold to 500 and lumber to 200 (Player - Set Property). Shot: `setup-actions`.
- `## Start the countdown`: in Setup: "Countdown Timer - Start WaveTimer as a One-shot timer that will expire in 60 seconds"; "Countdown Timer - Create a timer window for WaveTimer with title "Next wave""; set WaveWindow = (Last created timer window). Shot: `timer-actions`.
- `## Test`: Test Map: the message, the resources, the countdown window. Shot: `timer-window` (in game).

**spawning-waves**
- `## When the timer expires`: trigger "Spawn Wave", event "Time - WaveTimer expires". Shot: `spawn-event`.
- `## Create the wave`: actions: Set WaveNumber = WaveNumber + 1; "Unit - Create (WaveNumber + 3) WaveUnitType[WaveNumber] for Player 12 (Brown) at (Center of Spawn <gen>) facing Default building facing degrees"; "Game - Display Text": "Wave (WaveNumber) is coming!" (with Convert Integer To String and concatenation). Steps. Shot: `create-units-action`.
- `## Send it to the village`: "Unit Group - Pick every unit in (Units owned by Player 12 (Brown)) and do (Unit - Issue order targeting a point: Order (Picked unit) to Attack-Move To (Center of Village <gen>))". Shot: `attack-move-action`.
- `## The next wave`: If WaveNumber less than 5 then start WaveTimer as one-shot in 45 seconds (If/Then/Else action). Note callout: some GUI actions create points and groups that are never cleaned up ("leaks"); harmless for a short map, and Hive Workshop has guides for when it matters (plain link to `https://www.hiveworkshop.com/`). Test: waves spawn and walk through the ford. Shot: `wave-in-game`.

**win-and-lose**
- `## Defeat`: trigger "Defeat": event "Unit - Specific Unit Event": Town Hall `<gen>` (the one placed in chapter 3) Dies; action "Game - Defeat Player 1 (Red) with the message: The village has fallen." Shot: `defeat-trigger`.
- `## Victory`: trigger "Victory": event "Unit - Player-Owned Unit Event: A unit owned by Player 12 (Brown) Dies"; conditions WaveNumber Equal to 5 and (Number of units in (Units owned by Player 12 (Brown) matching ((Matching unit) is alive) Equal to True)) Equal to 0; action "Game - Victory Player 1 (Red) (Show dialogs, Show scores)". Steps. Shot: `victory-trigger`.
- `## Play it through`: a full test; balancing tips (timer length, wave sizes in WaveUnitType, tower cost). Tip: :menu[File > Test Map] with the Test Map preferences (verify) to start faster.
- `## What you built`: recap every chapter in one line each; link to `/learn/next/`.
- `:::checkpoint`: a playable game: five waves on a timer attack the village through the ford, and the game ends in victory or defeat.

---

### Task 12: Documentation and browser verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document**

In `README.md`, under `## Structure`, add a `### Tutorials` subsection after `### Resources`: lessons live in `src/content/tutorials/<chapter>/<lesson>.md` with screenshots in `<chapter>/<lesson>/`; chapters are listed in `src/data/tutorials.ts`; the directives and style guide are in `docs/tutorial-writing.md`; `deno task tutorial:check` validates lessons and lists missing screenshots and facts to verify; drop a PNG at the path a `::shot` names and rebuild to replace its placeholder.

- [ ] **Step 2: Verify in the browser**

Run `deno task build` and `deno task preview` (port 4321) and check, at desktop (1440), tablet (800) and mobile (390) widths:

1. `/learn/`: heading, stats, six chapter cards with lesson lists and minutes, "Start the track", the closing callout, the outline with all chapters closed; no tab opens.
2. A lesson: opens a tab; header, goals, directives (keys, menu path, steps, callouts, checkpoint), screenshot placeholders; the outline has its chapter open, the lesson marked, its headings listed; scrolling highlights the current heading; clicking a heading scrolls to it.
3. Temporarily drop any PNG at one declared screenshot path, rebuild, and confirm it renders as an optimised image; delete it again.
4. Previous/next through a chapter boundary and to `/learn/next/`; tabs accumulate and close as in the resource pages; Ctrl+K finds a lesson by a word from its body.
5. No horizontal scroll at any width; the side panel drawer on mobile shows the outline.

Fix anything found, then run `deno task check`, `deno task tutorial:check` and `deno task test`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document the tutorial track"
```

---

## Appendix A: Lesson frontmatter

Copy each block verbatim into `src/content/tutorials/<chapter>/<slug>.md`.

### `editor-basics/install-and-open.md`

```yaml
---
title: Install and open the World Editor
summary: Find the World Editor that comes with Warcraft III, open it, and learn where your maps are saved.
order: 1
minutes: 10
goals:
  - Launch the World Editor that comes with Warcraft III
  - Know how the game's graphics mode affects the editor
  - Find the folder where your maps are saved
---
```

### `editor-basics/editor-tour.md`

```yaml
---
title: A tour of the editor
summary: Learn the parts of the main window, move the camera, and find the palettes and editors this track uses.
order: 2
minutes: 15
goals:
  - Name the parts of the main window
  - Move and zoom the camera around a map
  - Open the tool palettes and the other editors
---
```

### `editor-basics/create-your-map.md`

```yaml
---
title: Create and test your map
summary: Create the 96 × 96 Lordaeron Summer map you will build throughout the track, save it, and play it for the first time.
order: 3
minutes: 15
goals:
  - Create a new map with a chosen size and tileset
  - Save the map where the game can find it
  - Launch the map in the game with Test Map
---
```

### `terrain/painting-tiles.md`

```yaml
---
title: Painting tiles
summary: Use the Terrain Palette to paint grass, dirt and stone, and lay out the village clearing and its path.
order: 1
minutes: 10
goals:
  - Paint ground tiles with different brush sizes and shapes
  - Change which tiles your map's tileset offers
  - Lay out the village clearing and the path to it
---
```

### `terrain/height-and-cliffs.md`

```yaml
---
title: Height, cliffs and ramps
summary: Shape gentle hills, raise the village onto a cliff plateau, and connect it to the path with a ramp.
order: 2
minutes: 15
goals:
  - Raise, lower and smooth the ground
  - Build cliffs at different levels
  - Join cliff levels with a ramp
---
```

### `terrain/water.md`

```yaml
---
title: Water and the river
summary: Carve a river across the map with deep water, and leave a shallow ford as the only crossing.
order: 3
minutes: 10
goals:
  - Add shallow and deep water
  - Shape a river that blocks the way
  - Leave a shallow ford as the only crossing
---
```

### `terrain/finishing-touches.md`

```yaml
---
title: Finishing touches
summary: Break up flat ground with tile variation, and check with the pathing view that units can walk from the spawn to the village.
order: 4
minutes: 10
goals:
  - Add variety to large areas of tiles
  - Read the ground pathing view
  - Check the route from the spawn to the village
---
```

### `placement/doodads.md`

```yaml
---
title: Doodads and the village
summary: Place trees, fences, crates and other doodads to turn the plateau into a village and frame the map.
order: 1
minutes: 15
goals:
  - Place, rotate and scale doodads
  - Tell doodads and destructibles apart
  - Dress the village and frame the map with trees
---
```

### `placement/units-and-buildings.md`

```yaml
---
title: Units, buildings and start locations
summary: Place the town hall, farms and peasants for Player 1, and set the start location the game uses when the map begins.
order: 2
minutes: 15
goals:
  - Place units and buildings for a player
  - Edit a placed unit's properties
  - Set a player's start location
---
```

### `placement/creep-camps.md`

```yaml
---
title: Creep camps and item drops
summary: Guard the map with neutral hostile creep camps, and make them drop an item when they die.
order: 3
minutes: 15
goals:
  - Place neutral hostile creeps
  - Make a creep drop an item
  - Keep camps suited to a new hero
---
```

### `placement/regions.md`

```yaml
---
title: Regions
summary: Mark the Spawn and Village areas with regions, ready for the triggers in chapter 6.
order: 4
minutes: 10
goals:
  - Create, move and resize regions
  - Name regions so triggers can find them
  - Place the Spawn and Village regions
---
```

### `map-setup/map-options.md`

```yaml
---
title: Description, options and loading screen
summary: Give the map its name, description and loading screen, and learn what the main map options do.
order: 1
minutes: 15
goals:
  - Set the map's name, description and suggested players
  - Write a loading screen
  - Know what the main map options do
---
```

### `map-setup/players-and-forces.md`

```yaml
---
title: Players and forces
summary: Set up the human defender and the computer invader, put them in forces, and fix the player settings.
order: 2
minutes: 15
goals:
  - Set each player slot's controller, race and name
  - Group players into forces
  - Lock player settings for a custom map
---
```

### `object-editor/object-editor-tour.md`

```yaml
---
title: A tour of the Object Editor
summary: Find your way around the Object Editor, its tabs, standard and custom objects, and the fields that define them.
order: 1
minutes: 15
goals:
  - Browse units, abilities and items in the Object Editor
  - Tell standard objects from custom ones
  - Switch between field names and raw data
---
```

### `object-editor/custom-hero.md`

```yaml
---
title: A custom hero
summary: Create the Village Captain, a custom hero based on the Paladin, and place it in the village.
order: 2
minutes: 20
goals:
  - Create a custom unit from an existing one
  - Change a hero's name, proper names and stats
  - Place the new hero on the map
---
```

### `object-editor/custom-ability.md`

```yaml
---
title: A custom ability
summary: Turn Storm Bolt into Shield Throw, with its own damage, cooldown and tooltips, and give it to the Village Captain.
order: 3
minutes: 20
goals:
  - Create a custom ability from an existing one
  - Set values for each ability level
  - Write tooltips and give the ability to a hero
---
```

### `object-editor/village-tower.md`

```yaml
---
title: A village tower
summary: Create a cheap Village Tower that peasants can build to defend against the waves.
order: 4
minutes: 15
goals:
  - Create a custom building
  - Set its attack, cost and build time
  - Let a worker build it
---
```

### `triggers/trigger-basics.md`

```yaml
---
title: Events, conditions and actions
summary: Open the Trigger Editor, see how triggers work, and show a welcome message when the map starts.
order: 1
minutes: 15
goals:
  - Find your way around the Trigger Editor
  - Explain events, conditions and actions
  - Write and test a first trigger
---
```

### `triggers/wave-timer.md`

```yaml
---
title: Variables and a wave timer
summary: Store the wave number and each wave's unit type in variables, and count down to the first wave in a timer window.
order: 2
minutes: 20
goals:
  - Create variables, including an array
  - Set up the map when it starts
  - Start a timer and show it in a timer window
---
```

### `triggers/spawning-waves.md`

```yaml
---
title: Spawning waves
summary: Spawn each wave at the Spawn region when the timer expires, and send it to attack the village.
order: 3
minutes: 20
goals:
  - React to a timer expiring
  - Create units for a player at a region
  - Order a group of units to attack-move
---
```

### `triggers/win-and-lose.md`

```yaml
---
title: Winning and losing
summary: End the game in defeat when the town hall falls, and in victory when the last wave is beaten.
order: 4
minutes: 15
goals:
  - React to a unit dying
  - Combine conditions on a variable and a unit group
  - End the game in victory or defeat
---
```

## Appendix B: `src/content/tutorials/next.md`

```md
---
title: Where to go next
summary: You have built a complete map. Here is where to keep learning, find resources and meet other modders.
---

You started with an empty map and finished with a game: terrain, a village,
custom objects, and triggers that run waves and decide who wins. Everything
else in Warcraft III modding builds on those same pieces.

## Hive Workshop

[Hive Workshop](https://www.hiveworkshop.com/) is the home of the Warcraft III
modding community. Its tutorials go deeper into every chapter of this track,
its forums answer questions from first maps to advanced systems, and its map
section is where you can share Defend the Village and play what others make.

## Resources on wc3.dev

The [resource catalog](/resources/) collects models, icons, textures, sounds
and scripts you can preview in the browser. Every resource links to where it
was published, so you can read its terms and get it from its author.

## Scripting with the wc3.dev-framework

Triggers take you a long way. When you want to write gameplay as code, the
[wc3.dev-framework](/framework/) lets you build maps in TypeScript, with object
data in Pkl and a Deno toolchain. Its [documentation](/framework/docs/) starts
with installation and a first map.
```

## Appendix C: `docs/tutorial-writing.md`

```md
# Writing tutorials

The "Getting started" track lives in `src/content/tutorials/`. This guide covers
the file format, the directives, the house style, and the running project every
lesson builds on. Run `deno task tutorial:check` after editing: it validates the
lessons and lists missing screenshots and facts to verify.

## Files

- A lesson is `src/content/tutorials/<chapter>/<lesson>.md`. Its folder is its
  chapter (listed in `src/data/tutorials.ts`) and its file name is its slug.
- Screenshots live in `<chapter>/<lesson>/`, named in kebab-case
  (`create-your-map/new-map-dialog.png`). Capture PNGs at 16:9, ideally
  1600 × 900 or larger, cropped to what the note describes. Astro converts
  them to WebP.
- `next.md` is the closing page. Top-level pages have only `title` and
  `summary`.

## Frontmatter

    title: Painting tiles            # ≤ 80 characters; also the tab label
    summary: One sentence.           # ≤ 200 characters
    order: 1                         # position in the chapter, unique
    minutes: 10                      # time to read and follow along
    goals:                           # 1–5 items, "In this lesson you will…"
      - Paint ground tiles

## Directives

| Write | For |
| --- | --- |
| `:kbd[Ctrl+F9]` | Keys and key combinations |
| `:menu[Scenario > Map Options]` | Menu paths |
| `:::steps` around a numbered list | Procedures the reader follows |
| `:::tip`, `:::note`, `:::caution` (optional `[Title]`) | Asides; caution is for losing work or breaking the map |
| `:::checkpoint` | The last lesson of a chapter: what the map does now |
| `::shot[capture note]{src="./lesson/name.png" caption="…"}` | A screenshot |
| `<!-- verify: … -->` | An editor fact to confirm; removed from the page |

The capture note in `::shot[…]` is also the image's alt text: describe what
the screenshot shows and in which state ("The New Map dialog with Width and
Height set to 96 and the Lordaeron Summer tileset selected"). A missing file
renders as a placeholder showing the note. `caption` is optional and shown
under the image.

## Style

- Second person, present tense, short sentences. Explain why before how.
- British spelling in prose (colour, centre). Editor labels are written
  exactly as the editor shows them, in **bold** (**Tinting Color**).
- Menus with `:menu[…]`, keys with `:kbd[…]`, rawcodes and file names in
  `code`.
- Every lesson: a short intro paragraph with no heading, then two to five
  `##` sections. Procedures go in `:::steps`. Each procedure section has at
  least one screenshot. 500–1,200 words.
- No scripting: no JASS, Lua or TypeScript, and no "Custom Script" actions.
  Point to [the wc3.dev-framework](/framework/) only in the closing page.
- Links are plain Markdown. Link other lessons as `/learn/<chapter>/<lesson>/`,
  and only to pages that exist. Link to Hive Workshop at
  `https://www.hiveworkshop.com/` unless you know an exact page exists.
- When unsure of an editor fact (a menu name, a shortcut, a default value),
  write it as you believe it is and add `<!-- verify: … -->` on the next line.
  Never invent certainty.
- The target is the current Reforged World Editor. Mention Classic graphics
  only where it changes what the reader sees.

## The running project: Defend the Village

Every lesson builds on this map. Keep names and numbers exactly as listed.

**Map:** "Defend the Village", saved as `DefendTheVillage.w3x`; 96 × 96;
Lordaeron Summer. Suggested players: 1. Author: the reader.
Description: "Hold the village against five waves of gnolls and ogres. Build
towers, level your captain, and keep the town hall standing."
Loading screen: title "Defend the Village", subtitle "Hold the ford", text
"Waves of invaders cross the river every 45 seconds. Build Village Towers,
and use the Captain's Shield Throw to stop them before they reach the town
hall."

**Layout:** the village sits on a plateau one cliff level up in the
north-east, reached by a single ramp facing south-west. A dirt path runs
from the spawn in the south-west corner to the ramp. A deep river runs from
the north-west edge to the south-east edge between them; the path crosses it
at the only ford (shallow water). A forest lies west of the river, trees
frame the map edges.

**Players and forces:** Player 1 (Red), User, "Defender", force "Villagers".
Player 12 (Brown), Computer, "Invaders", force "Invaders", start location
near the spawn. Fixed player settings. No other slots.

**Village (Player 1):** Town Hall in the centre of the plateau, 4 Farms, a
Lumber Mill, 5 Peasants, the start location. No gold mine; gold comes from
the Setup trigger (500 gold, 200 lumber).

**Creep camps (Neutral Hostile), off the wave route:** gnoll camp in the
western forest (2 Gnolls, 1 Gnoll Poacher that drops a Potion of Healing);
murloc camp on the river bank north of the ford (2 Murloc Tiderunners).

**Regions:** `Spawn` at the south-west end of the path; `Village` around the
Town Hall.

**Object Editor:**
- Village Captain: custom hero copied from the Paladin; proper names Aldric,
  Maren, Tobin; Strength 22, Agility 14, Intelligence 16; abilities Shield
  Throw, Divine Shield, Devotion Aura, Resurrection. Placed for Player 1 next
  to the Town Hall.
- Shield Throw: copied from Storm Bolt; 3 levels; damage 60/120/180; stun
  1/1.5/2 seconds; cooldown 8 seconds; 60 mana.
- Village Tower: copied from the Guard Tower; 100 gold, 30 lumber; build time
  30 seconds; no requirements and no upgrades; built by Peasants.

**Triggers** (category "Defend the Village"; `Melee Initialization` is disabled in
chapter 1 and deleted in chapter 6):
- Variables: `WaveNumber` (Integer, 0), `WaveUnitType` (Unit-Type array,
  size 5), `WaveTimer` (Timer), `WaveWindow` (Timer Window).
- Welcome: Map initialization → display "Defend the village! The first wave
  arrives soon."
- Setup: Map initialization → WaveUnitType[1–5] = Gnoll, Gnoll Poacher,
  Gnoll Brute, Ogre Warrior, Ogre Mauler; Player 1 gold 500 and lumber 200;
  start WaveTimer (one-shot, 60 seconds); timer window "Next wave", stored in
  WaveWindow.
- Spawn Wave: WaveTimer expires → WaveNumber + 1; create WaveNumber + 3 of
  WaveUnitType[WaveNumber] for Player 12 at the centre of Spawn; message
  "Wave N is coming!"; order Player 12's units to attack-move to the centre of
  Village; if WaveNumber < 5, start WaveTimer (one-shot, 45 seconds).
- Defeat: the Town Hall dies → defeat Player 1, "The village has fallen."
- Victory: a unit owned by Player 12 dies, WaveNumber = 5, and no living
  units owned by Player 12 remain → victory for Player 1.
```
