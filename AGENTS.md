# Handover for coding agents

Read this first. It records the project's state, the owner's rules, and what
is left to do, as of 2026-09-25.

## The project

wc3.dev is a fully static Warcraft III: Reforged modding platform that
complements Hive Workshop and never competes with it. It is built with
Astro 7 + Starlight + Deno. Everything except the Starlight docs
(`/moonwell/docs/`) renders inside one desktop-app-style shell.

Related repositories (context only): `mdlsvensson/moonwell` (the Go CLI with
YueScript/Lua gameplay and Pkl data the docs describe),
`mdlsvensson/moonwell-wrappers` and `mdlsvensson/moonwell-systems` (opt-in Lua
libraries). The site documents Moonwell 0.9.1, wrappers v0.9.1 and systems
v0.5.1. The old `/framework/` overview and docs URLs redirect to `/moonwell/`.

## Owner's rules (non-negotiable)

- **Deno only (2.9).** Run everything with `deno task …`, install with
  `deno install`. Never use npm or node, never create npm lockfiles.
  Dependencies go in `package.json`, locked in `deno.lock`; CI runs
  `deno install --frozen`.
- **Styles go in global CSS under `src/styles/`**, never scoped `<style>`
  blocks: Starlight forces `scopedStyleStrategy: "where"`.
- **One feature branch per piece of work.** Don't merge into `main` or push
  without asking the owner first.
- **Process the owner follows:** brainstorm with options and a
  recommendation → spec in `docs/superpowers/specs/YYYY-MM-DD-<name>-design.md`
  (owner approves) → task-by-task plan in `docs/superpowers/plans/` (owner
  approves) → implement task by task with a review after each → final review,
  one fix wave, scoped re-review → verify in a browser (`deno task build` +
  `deno task preview`, port 4321) → ask before merging.
- **Hive Workshop:** `docs/hive-integration.md` is binding. No automated
  access to Hive (no fetching feeds, pages or images) until Hive staff agree;
  metadata only; credit authors; honour opt-outs.
- **Content with Windows paths** (`Textures\Footman.blp`,
  `Documents\Warcraft III\Maps`): write files directly, not through shell
  heredocs, which have mangled backslashes before.
- **No agent attribution.** Commit as the owner's git identity, with no
  `Co-Authored-By:` trailer or other agent attribution (Claude, Codex or any
  other tool) in commits, pull request descriptions, tags, releases or files.
  This is the owner's rule since 2026-10-03; older commits may still carry
  trailers.

## What exists (all merged on `main`)

The five roadmap sub-projects are done. Their specs and plans in
`docs/superpowers/` are the best record of decisions and conventions.

1. **App shell** — `src/layouts/Shell.astro`: title bar, activity rail, tabs
   (pages with `tab` open as tabs), collapsible/resizable side panel (`side`
   slot), status bar, Ctrl/Cmd+K Pagefind palette, `ClientRouter`.
   Code: `src/components/shell/`, `src/scripts/shell/`, `src/styles/shell.css`.
2. **Resource system** — view-only catalog (`/resources/…`), content
   collection `resources` (`src/lib/resource-schema.ts`,
   `src/content/resources/`, fixtures in `_fixtures/` loaded only with
   `RESOURCE_FIXTURES`), content-addressed asset store at `ASSET_BASE_URL`.
   Tooling: `resource:add`, `resource:check`, `assets:serve`, `game:sync`.
3. **Previewers** — `src/scripts/previewers/` (model via `mdx-m3-viewer-th`,
   BLP/DDS/TGA images, audio waveform, Shiki scripts), loaded on demand,
   contract `mount(preview, files) → Promise<dispose>`.
4. **Tutorials** — `/learn/`: "Getting started with Warcraft III: Reforged
   modding", 6 chapters / 21 World Editor lessons building one map, "Defend
   the Village", plus `/learn/next/`. No scripting in lessons.
   - Lessons: `src/content/tutorials/<chapter>/<lesson>.md`; chapters in
     `src/data/tutorials.ts`.
   - Markdown directives are a Sätteri mdast plugin,
     `src/markdown/tutorial-directives.ts` (Astro 7's default Markdown engine
     is Sätteri, registered in `astro.config.ts`): `:kbd[]`, `:menu[]`,
     `:::steps`, `:::tip|note|caution`, `:::checkpoint`, `::shot[note]{src}`,
     and `<!-- verify: … -->` author notes. Unknown directives fail the build.
   - `docs/tutorial-writing.md` is the writing guide and the running-project
     "bible" (every name and number in the map). Keep it in sync.
   - `deno task tutorial:check` validates lessons and lists missing
     screenshots and verify notes.
5. **Hive activity** — "New on Hive" on `/resources/` and a "Latest on Hive"
   card on `/`, from the committed snapshot `src/data/hive-activity.json`
   (empty today, so neither renders). Opt-outs in `src/data/hive-optout.json`
   (the build fails if the snapshot contains one). `deno task hive:import
   [<files>…] [--dry-run]` merges RSS/Atom files the owner saved in a browser;
   it has no network permission. Logic: `src/lib/hive-schema.ts`,
   `src/lib/hive.ts`, `src/lib/hive-data.ts`, `scripts/hive/`.
   `docs/hive-outreach.md` is a drafted message to Hive staff.

## Checks (what CI runs, `.github/workflows/check.yml`)

```sh
deno install --frozen
deno task check            # astro check: expect 0 errors
deno task resource:check
deno task tutorial:check
deno task test             # fixture build + all tests in scripts/ (168 pass)
deno task build            # production; must pass with ASSET_BASE_URL unset
```

`deno task test:unit` is the fast subset. Stop a running dev server before
`check`/`build`. Chromium for browser checks is at `/opt/pw-browsers` in the
cloud environment (drive it with `npm:playwright-core` from a scratch script,
never add it to the repo).

## Waiting on the owner (not code)

- Make the `mdlsvensson/wc3-dev` repository public: the Hive opt-out link
  (`HIVE_CONTACT_URL` in `src/lib/hive.ts`, GitHub issues) 404s while it is
  private. It must work before the Hive snapshot has entries or the outreach
  message is sent.
- Check whether Hive offers RSS/Atom feeds; run the first `hive:import`.
- Send `docs/hive-outreach.md`; record the reply in the Status section of
  `docs/hive-integration.md`.
- World Editor pass on the tutorials: capture the 85 screenshots (drop PNGs at
  the paths `::shot` names) and confirm the 117 `verify` notes, then remove the
  confirmed notes. Lesson text was written without access to the editor.

## Known small leftovers (fix only when asked)

- `src/scripts/previewers/script.ts`: the single-file script panel has an
  `aria-label` on a div with no role; add `role="region"`.
- Game textures that 404 are neither replaced with stand-ins nor listed as
  missing in the model viewer.
- `resource:add`/`resource:check` count a texture as "hosted" more loosely
  than the viewer does.
- `resource:check --remote` skips game-texture keys.
- Previewer fetches have no timeout.
- Large scripts are highlighted synchronously.
- Tutorials: some chapter 6 screenshot notes mix trigger lines with and
  without the category prefix; `players-and-forces` repeats a race-list reset
  that `creep-camps` already does; `tutorial:check` doesn't flag a misspelled
  `:kbd`/`:menu` (the site test does).
- Hive: `hive:import` can't be run in the browser-free sense until feeds are
  confirmed; screenshot `sizes` assume the 820px lesson column.

## Next

The roadmap in the specs is complete. Ask the owner what comes next; a later
Hive phase (automated sync) is only possible after Hive staff agree, and then
needs a self-serve opt-out first (see the Status section of
`docs/hive-integration.md`).
