# Tutorials design

Date: 2026-09-24
Status: Approved design, awaiting spec review
Sub-project: 4 of 5 in the wc3.dev platform roadmap (see `2026-09-22-app-shell-design.md`)

## Goal

`/learn/` hosts a "Getting started with Warcraft III: Reforged modding" track
inside the app shell: a beginner who has never opened the World Editor follows
one path of lessons and ends with a small, playable map. The track teaches the
World Editor only (terrain, placement, map setup, the Object Editor, and GUI
triggers). It teaches no scripting, and closes with a page pointing onward to
Hive Workshop, the resource catalog, and the w3ts framework.

## Decisions

- **World Editor only.** No JASS, Lua, or TypeScript in the track. Scripting
  lives in the framework docs; the track only points there at the end.
- **One running project.** Every lesson builds the same map, "Defend the
  Village". Each chapter ends with a checkpoint describing what the map does
  at that point.
- **Markdown with directives.** Lessons are plain `.md` files with a small set
  of directives, not MDX components.
- **Claude drafts, the owner captures.** All lesson text is written in this
  sub-project. Screenshots are declared in the text with a capture note, render
  as visible placeholders until the owner adds the image, and are listed by a
  check command.
- **No progress tracking.** No completion state, checkmarks, or stored
  progress; navigation is previous/next and the side-panel outline.
- **Screenshots in the repository**, next to their lesson, processed by Astro's
  image pipeline.
- **Plain links** to resources, framework docs, and Hive; no embed directives.
  The existing site test already fails on broken internal links.
- **Target editor:** the current Reforged World Editor (patch 2.0.x). Lessons
  note where Classic graphics mode looks or behaves differently.

## Non-goals

- Progress tracking, accounts, quizzes.
- Scripting content of any kind, including "Custom Script" GUI actions.
- Downloadable checkpoint maps, video, translations.
- Embedding resource cards or live previewers in lessons.
- Changes to the Starlight docs.

## Curriculum: "Defend the Village"

The map: a village in a Lordaeron Summer clearing, one human player (with a
second optional user slot) against waves of creeps that walk from a spawn
region to the village. The player wins by surviving every wave and loses if
the town hall falls.

| # | Chapter (`slug`) | Lessons (`slug`: title) | Checkpoint: your map now… |
| --- | --- | --- | --- |
| 1 | Editor basics (`editor-basics`) | `install-and-open`: Install and open the World Editor · `editor-tour`: A tour of the editor · `create-your-map`: Create and test your map | …exists as a 96×96 Lordaeron Summer map that launches with Test Map |
| 2 | Terraining (`terrain`) | `painting-tiles`: Painting tiles · `height-and-cliffs`: Height, cliffs and ramps · `water`: Water and the river · `finishing-touches`: Finishing touches | …has a village clearing on a plateau, a river with a ford, and a path from the spawn |
| 3 | Placing units and doodads (`placement`) | `doodads`: Doodads and the village · `units-and-buildings`: Units, buildings and start locations · `creep-camps`: Creep camps and item drops · `regions`: Regions | …has a village, a start location, creep camps, and the Spawn and Village regions |
| 4 | Map setup (`map-setup`) | `map-options`: Description, options and loading screen · `players-and-forces`: Players and forces | …shows its own name, description and loading screen, with the players and forces set |
| 5 | Object Editor (`object-editor`) | `object-editor-tour`: A tour of the Object Editor · `custom-hero`: A custom hero · `custom-ability`: A custom ability · `village-tower`: A village tower | …has the Defender hero with a custom ability, and a buildable village tower |
| 6 | GUI triggers (`triggers`) | `trigger-basics`: Events, conditions and actions · `wave-timer`: Variables and a wave timer · `spawning-waves`: Spawning waves · `win-and-lose`: Winning and losing | …is a playable game: waves spawn on a timer, attack the village, and end in victory or defeat |
| – | Where to go next (`next`) | A single page, not a chapter | – |

21 lessons plus the closing page. Lesson titles and the exact editor steps can
be refined while writing. Chapter slugs, their order, and the running project
are fixed by this spec.

## Content model

### Files

```
src/content/tutorials/
  editor-basics/
    install-and-open.md
    create-your-map.md
    create-your-map/new-map-dialog.png   ← screenshots in a folder named after the lesson
  terrain/…
  next.md                                ← the closing page
```

- A lesson's chapter is its folder; its slug is its file name. URLs are
  `/learn/<chapter>/<lesson>/`; the closing page is `/learn/next/`.
- Two content collections read this folder: `tutorials` (lessons,
  `*/*.md`) and `tutorialPages` (top-level pages such as `next.md`, `*.md`),
  each with its own schema.
- Screenshots live in a folder named after the lesson, beside it, and are
  referenced relative to the lesson file.

### Chapters

`src/data/tutorials.ts` lists the chapters in order, like `src/data/guides.ts`:

```ts
export const chapters = [
  { slug: 'editor-basics', title: 'Editor basics', summary: '…' },
  …
] as const;
```

### Frontmatter

The `tutorials` content collection validates it with a Zod schema in
`src/lib/tutorial-schema.ts`, shared by Astro and the Deno check script.

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string, 1–80 chars | Page title and tab label |
| `summary` | string, 1–200 chars | Header lede, meta description, and chapter lists |
| `order` | positive integer | Position within the chapter; unique per chapter |
| `minutes` | positive integer | Estimated reading and doing time |
| `goals` | string[], 1–5 items | "In this lesson you will…" list |

`next.md` carries only `title` and `summary`.

## Directives

Written as Sätteri mdast plugins, since Sätteri is Astro 7's default Markdown
engine (Starlight enables its directive syntax). The plugins run only on files
under `src/content/tutorials/` and leave every other Markdown file untouched.
Directives they do not recognise are left for Starlight's restoration plugin,
which prints them back as text, and the site test catches that.

| Syntax | Output |
| --- | --- |
| `:kbd[Ctrl+F9]` | `<kbd>` keycaps, one per `+`-separated key |
| `:menu[Scenario > Map Options]` | A menu path: `<span class="menu-path">` with a separator between items |
| `:::steps` wrapping an ordered list | The list, styled as numbered steps |
| `:::tip`, `:::note`, `:::caution` (optional `[Title]`) | A callout `<aside class="tutorial-callout">` with an icon and a title, the same syntax as the Starlight docs, styled for the shell |
| `:::checkpoint` | A "Checkpoint: your map now…" box closing a chapter's last lesson |
| `<!-- verify: … -->` | Nothing: an author's note marking an editor fact to confirm in the editor. Removed from the output and listed by `tutorial:check` |
| `::shot[alt text]{src="./lesson/file.png" caption="…"}` | See Screenshots |

### Screenshots

`::shot` declares a screenshot: `alt` is the alt text, and it also serves as
the capture note: what to show and in which state.

- **File present:** an optimised image (WebP, responsive sizes, width and
  height set) inside a `<figure>` with the caption.
- **File missing:** a placeholder `<figure class="shot-missing">` with the
  same 16:9 proportions, a camera icon, "Screenshot needed", and the
  alt text as the capture note. It builds without error.

## Views

### `/learn/`, the track landing

- **Workspace:** a heading ("Getting started with Warcraft III: Reforged
  modding"), an intro to the running project and what you need (Warcraft III:
  Reforged installed, no programming), "Start the track" (links to the first
  lesson), then one card per chapter listing its lessons with minutes, and a
  "Where to go next" card. The chapter total time is the sum of its lessons.
- **Side panel:** the track outline (below) with nothing current.
- No tab (section landing page, per the app shell spec).

### `/learn/<chapter>/<lesson>/`, a lesson

A shell page with `tab` set, so it opens as a workspace tab labelled with the
lesson title.

- **Header:** eyebrow "Chapter N · <chapter title>", the title, the summary,
  "N min", and the goals list.
- **Body:** the rendered Markdown, with `h2` headings carrying ids.
- **Footer:** previous and next links with their titles, crossing chapter
  boundaries; the last lesson's next is `/learn/next/`, the first lesson's
  previous is `/learn/`.

### `/learn/next/`, where to go next

Links to Hive Workshop (tutorials, forums, the map section), the resource
catalog, and the w3ts framework docs, with one sentence on each. It opens as
a tab and its previous link is the last lesson.

### Side panel: the track outline

```
GETTING STARTED
▾ 1 Editor basics
    Install and open
    A tour of the editor
▾ 2 Terraining
    Painting tiles
  ● Height, cliffs and ramps       ← aria-current="page"
      · The height brush           ← the lesson's h2 headings
      · Cliffs and ramps
    Water and the river
▸ 3 Placing units and doodads
…
  Where to go next
```

- Every chapter is a `<details>` element: the current lesson's chapter is open,
  the others closed. Clicking a chapter's summary toggles it without
  navigating.
- The current lesson is marked `aria-current="page"` and lists its `h2`
  headings as anchor links.
- **Scroll-spy:** a small client module highlights the heading whose section
  is in view (`aria-current="location"`), from a passive scroll listener on
  `.app-scroll` throttled with `requestAnimationFrame`. It is bound on
  `astro:page-load` and removed on `astro:before-swap`. Without
  JavaScript the outline still works as plain links.

## Modules

| Unit | Responsibility |
| --- | --- |
| `src/lib/tutorial-schema.ts` | Zod frontmatter schemas (lesson, closing page) |
| `src/lib/tutorials.ts` | Pure track logic: order lessons by chapter then `order`, previous/next, chapter minutes, outline model |
| `src/data/tutorials.ts` | Chapter list |
| `src/content.config.ts` | Adds the `tutorials` (id `<chapter>/<slug>`) and `tutorialPages` collections |
| `src/markdown/tutorial-directives.ts` | The Sätteri plugins for the directives |
| `astro.config.ts` | Registers the plugins on the Markdown processor |
| `src/components/learn/{TrackOutline,LessonHeader,LessonPager,ChapterCard}.astro` | View building blocks |
| `src/pages/learn/index.astro`, `[chapter]/[lesson].astro`, `next.astro` | Landing, lessons, closing page |
| `src/scripts/learn/outline.ts` | Scroll-spy |
| `src/styles/learn.css` | All tutorial styles (global CSS, per the Starlight constraint) |
| `scripts/tutorials/check.ts` | `deno task tutorial:check` |

## Tooling

### `deno task tutorial:check`

Reads `src/content/tutorials/` directly (no Astro build) and:

1. Validates every lesson's frontmatter against the shared schema.
2. Errors when a lesson's folder is not a chapter in `src/data/tutorials.ts`,
   when an `order` repeats within a chapter, when a chapter has no lessons, or
   when a lesson has no `h2` heading.
3. Lists every `::shot` whose file is missing, grouped by lesson, with its
   capture note, and ends with a count ("14 of 83 screenshots captured").
   Missing screenshots are warnings, never errors.
4. Lists every `<!-- verify: … -->` note, grouped by lesson, as a checklist
   for the owner's pass through the editor.

It exits non-zero only for errors. CI runs it next to `resource:check`.

## Dependencies

- `@astrojs/markdown-satteri` (0.4.1, already installed with Astro) becomes a
  direct dependency so `astro.config.ts` can register the directive plugins
  with `satteri({ mdastPlugins })`.
- `sharp` (0.35.4, Astro's supported range) becomes a direct dependency: it is
  Astro's image service, and no page optimised images before.

## Testing

- **Unit** (`deno test`): track ordering and previous/next across chapter
  boundaries, chapter minutes, outline model; each directive's output on
  small mdast inputs, including a present and a missing screenshot; the check
  command's validation and missing-shot listing against a temp folder.
- **Build** (`scripts/site_test.ts`): `/learn/`, every lesson, and
  `/learn/next/` exist; lesson pages carry the `wc3-tab` meta and the landing
  page does not; each lesson's outline marks exactly one `aria-current="page"`
  link pointing at itself; previous/next links form one chain from `/learn/`
  through every lesson to `/learn/next/`; no lesson HTML contains raw
  directive text (`:::` or `::shot`); every `h2` in a lesson has an id. The
  existing link check covers every lesson link.
- **Browser:** the landing, a lesson with a present and a missing screenshot,
  scroll-spy while scrolling, the outline and tabs across client-side
  navigation, and the layout at desktop, tablet, and mobile widths.

## Risks

- **Editor accuracy.** Lessons are written without access to the World
  Editor. The owner verifies each lesson's steps while capturing its
  screenshots; the capture notes double as a checklist.
- **Sätteri plugins and Astro's image pipeline:** resolved by a probe during
  planning. A leaf-directive visitor that returns an `image` node inside a
  `figure` is collected by Astro and emitted as an optimised WebP with width
  and height; unknown directives fall through to Starlight's restoration and
  print as text.
- **Plugin scoping.** The directive plugins must not change any Starlight
  docs page. A build test asserts that no page under `/framework/docs/`
  contains the tutorial classes (`menu-path`, `shot`, `tutorial-callout`).
