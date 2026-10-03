# Moonwell Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old framework documentation with accurate Moonwell 0.9.1 guides at `/moonwell/`.

**Architecture:** Move the existing overview and eleven Starlight guides to `/moonwell/` and `/moonwell/docs/`, preserving guide slugs. Rewrite the guides from current Moonwell sources, update site navigation and branding, and redirect incoming old URLs. Keep the existing static site and shell.

**Tech Stack:** wc3.dev uses Deno 2.9, Astro 7.3.3, Starlight 0.42.2, Sätteri and Shiki. The documented Moonwell release uses a Go CLI, Pkl and YueScript/Lua.

**Spec:** `docs/superpowers/specs/2026-10-03-moonwell-documentation-design.md` (approved 2026-10-03).

**Status:** Approved by the owner on 2026-10-03; native execution in progress.

**Recommended execution:** Native execution in this session, reviewing each task against the spec and current source before moving on, followed by an independent final review. The tasks share guide terminology and examples. No upstream repository changes are required.

## Global Constraints

- The overview will be `/moonwell/`; documentation will live under `/moonwell/docs/`.
- Moonwell is an installed Go executable. End users do not need Go, Deno, Node.js, a clone of the framework, or its contributor test commands.
- Release installers support Windows and Linux on x86-64.
- Moonwell 0.9.1 uses Pkl 0.32 or newer from PATH, or downloads pinned Pkl 0.32.1 when it is missing or older.
- Gameplay uses YueScript, compiled with pinned YueScript 0.34.3 to Lua 5.3, and can import plain Lua modules.
- Wrappers v0.9.1 and systems v0.5.1 are separate opt-in libraries. Declare both for systems; commit `moonwell.lock`.
- Teal and Fennel are future work. Multiplayer checks remain deferred; do not claim they passed.
- Use `text` fences labeled with filenames for YueScript if the installed highlighter lacks a compatible grammar. Do not label YueScript as Lua or introduce a new grammar/dependency.
- Run the existing project checks with Deno only. Stop preview/dev before checks and builds.
- No Hive access is needed. No application dependencies, resource catalog assets, or tutorial lesson/map behavior need to change.
- Do not push or merge without the owner's approval. Use branch `codex/moonwell-docs-refresh`.
- Write files directly using file tools, preserving Windows paths. New styles, if needed, belong in `src/styles/`.
- Commit reviewed task changes with `Co-Authored-By: Codex <noreply@openai.com>` attribution. Do not include unrelated files.

## Review Focus

1. Incoming old bookmarks must reach the corresponding new page, and active links must use `/moonwell/` (Task 1: built redirect/navigation checks and browser navigation).
2. Tutorial-to-docs navigation must reload Starlight, retaining link titles and leaving other links alone (Task 1: existing directive test).
3. A new user without Pkl or YueScript must receive the current managed-tool setup instructions; version mismatches must have a workable upgrade path (Tasks 2 and 4: source comparison and example review).
4. Builds change staged objects/settings/assets; only explicit asset sync changes the source map. Generated object IDs must be integers and refreshed by the correct commands (Tasks 2 and 3: compare pipeline and object command behavior).
5. Library examples must install both dependencies, use correct call syntax, and clean up owned resources without claiming completed multiplayer verification (Task 4: compare current APIs and trace the example).

## File Structure

| Files | Responsibility |
| --- | --- |
| `src/pages/moonwell/index.astro` | Moved and rewritten Moonwell overview |
| `src/content/docs/moonwell/docs/*.md` | Eleven moved and rewritten guides |
| `astro.config.ts` | Moonwell metadata, Starlight sidebar and explicit static redirects |
| `src/components/GuideNav.astro`, `src/data/guides.ts` | Moonwell guide panel including libraries |
| `src/components/shell/{ActivityRail,TitleBar,StatusBar}.astro`, `src/pages/index.astro` | Moonwell section, homepage card and source links |
| `src/content/tutorials/next.md`, `src/markdown/tutorial-directives.ts` | Current next-step pointer and docs reload boundary |
| `scripts/site_test.ts`, `scripts/tutorials/directives_test.ts` | Updated route, shell, local-link and tutorial navigation verification |
| `README.md`, `AGENTS.md` | Current site paths and project context; retain historical attribution |

Upstream roots are `C:/Users/mdlsvensson/Repo/moonwell`, `C:/Users/mdlsvensson/Repo/moonwell-wrappers`, and `C:/Users/mdlsvensson/Repo/moonwell-systems`. Read them; do not edit them. Recheck their versions at execution time and report any change from the spec's baseline.

---

### Task 1: Move routes and present Moonwell throughout the site

**Files:** Move `src/pages/framework/index.astro` and all eleven files in `src/content/docs/framework/docs/` to their Moonwell counterparts. Modify `astro.config.ts`, `src/pages/index.astro`, `src/components/GuideNav.astro`, `src/data/guides.ts`, the three shell components, `src/content/tutorials/next.md`, `src/markdown/tutorial-directives.ts`, `scripts/site_test.ts`, and `scripts/tutorials/directives_test.ts`.

**Interfaces:** Consumes the existing guide slugs and shell/Starlight layouts. Produces the new overview, docs prefix, navigation and incoming redirects used by every later task.

- [x] Update the existing built-route test to cover the new overview and all eleven docs routes, assert Moonwell on the homepage, and update shell/docs tests to use the new paths. Preserve the independent w3ts resource assertion and TypeScript highlighting checks.
- [x] Add the following behavior check to `scripts/site_test.ts` using its existing `root` and `htmlFiles` helpers. It checks incoming bookmarks and outgoing links rather than duplicating document prose:

```ts
Deno.test('old framework bookmarks redirect and active pages link to Moonwell', async () => {
  const slugs = ['', 'installation', 'custom-maps', 'map-making', 'assets',
    'map-settings', 'library', 'object-data', 'architecture', 'reference', 'troubleshooting'];
  const pairs = [['framework/', 'moonwell/'], ...slugs.map((slug) => {
    const suffix = slug ? `${slug}/` : '';
    return [`framework/docs/${suffix}`, `moonwell/docs/${suffix}`];
  })];
  for (const [from, to] of pairs) {
    const html = await Deno.readTextFile(new URL(`${from}index.html`, root));
    assert.match(html, /http-equiv="refresh"/i, `Missing static redirect at /${from}`);
    assert(html.includes(`/${to}`), `Wrong destination at /${from}`);
    assert((await Deno.stat(new URL(`${to}index.html`, root))).isFile);
  }
  for (const file of await htmlFiles(root)) {
    if (file.href.slice(root.href.length).startsWith('framework/')) continue;
    assert(!/href="\/framework(?:\/|\")/.test(await Deno.readTextFile(file)),
      `Old active link in ${file.href}`);
  }
});
```

- [x] Change the existing directive test inputs and expected URLs to `/moonwell/docs/`. Run `deno task test:unit` and confirm that the docs reload assertion fails before changing the plugin. The built route test will fail against the old site until the route migration is built.
- [x] Move the overview and guides with literal filesystem paths; confirm the old source files are removed. Rewrite all active internal links to `/moonwell/`. In `astro.config.ts`, set the Starlight title to `wc3.dev / Moonwell`, description to `YueScript gameplay, Pkl data, and a Go toolchain for Warcraft III.`, and update sidebar labels/slugs.
- [x] Configure all twelve explicit redirects in `astro.config.ts`. The mapping can be constructed from the exact list of slugs in the test above:

```ts
redirects: {
  '/framework/': '/moonwell/',
  '/framework/docs/': '/moonwell/docs/',
  ...Object.fromEntries([
    'installation', 'custom-maps', 'map-making', 'assets', 'map-settings',
    'library', 'object-data', 'architecture', 'reference', 'troubleshooting',
  ].map((slug) => [`/framework/docs/${slug}/`, `/moonwell/docs/${slug}/`])),
},
```

- [x] Change the directive plugin's prefix to `node.url.startsWith('/moonwell/docs/')`. Retain its existing properties-preserving implementation. Update the activity item to `{ id: 'moonwell', href: '/moonwell/', label: 'Moonwell', Icon: FileCode }`, the docs button, guide links, and source links to `https://github.com/mdlsvensson/moonwell`.
- [x] Rewrite the overview and homepage card for Moonwell. Keep existing layout/classes; replace the TypeScript sample with the native-only YueScript sample below, rendered with `lang="text"` if necessary. Describe YueScript/Lua gameplay, Pkl data and the Go CLI. Show the release installer followed by `moonwell init my-map`, `cd my-map`, and `moonwell build`. State Teal/Fennel only as future work if mentioned. Replace the tutorial's final pointer with Moonwell and its new docs URLs.

```text
import "moonwell" as mw
import "moonwell.macros" as {:$FourCC}

mw.on_main ->
  footman = CreateUnit Player(0), $FourCC("hfoo"), 0, 0, 270
  SetUnitName footman, "Vanguard"
```

- [x] Add `{ label: 'Libraries', slug: 'library' }` to the guide panel. Set the panel label and source-link labels to Moonwell. Do not alter independent resource entries or existing status-bar styles.
- [x] Run `deno task test:unit`, then `deno task test`. Confirm new routes, redirects, local links and search indexing pass. Review Task 1 against the spec, fix findings, and commit only its files.

### Task 2: Write the installation and first-map workflow

**Files:** Modify `src/content/docs/moonwell/docs/{index,installation,custom-maps,map-making}.md`.

**Interfaces:** Consumes Task 1's new URLs. Produces the installation prerequisites and native-only gameplay example referenced by the remaining guides.

**Sources:** Moonwell `README.md` sections Quickstart, Installing and upgrading, A project, Editor setup, Unknown globals, Macros and Lua modules; `template/src/main.yue`, `template/objects/units.pkl`, `schema/Project.pkl`, `internal/cli/{initcmd,setup,check,dev}.go`, and `internal/pipeline/pipeline.go`.

- [x] Rewrite the introduction's title/description, reading order and upstream contributing/changelog links for Moonwell. Explain YueScript entry points and optional plain Lua modules.
- [x] Write numbered installation steps: run the upstream Windows or Linux release installer; reopen the terminal if PATH needs it; run `moonwell --version`, `init`, `check`, `build`; set `launch.gameExecutable` in `moonwell.local.pkl`; run `test`; run `setup` for editor integration. Copy installer lines from the current committed README. Explain automatic Pkl/YueScript downloads, supported architectures and the VS Code YueScript/Lua extensions.
- [x] Rewrite the custom-map guide around complete Lua folder-format maps, `map { folder = "MyMap.w3x" }`, source/stage/archive separation and refreshing editor globals. Keep the accurate existing explanation of extraction as an alternative when folder saving is unavailable. Explain that changing script language does not convert handwritten JASS.
- [x] Use this object/gameplay pair for the first custom unit, with filenames in fence titles. Explain that a project already merges `objects/**.pkl`; new objects must have unique IDs. `build` or `dev` updates generated IDs before the subsequent `check`:

```pkl
amends "@moonwell/ObjectFile.pkl"
units {
  ["vanguard"] {
    id = "h001"
    base = "hfoo"
    name = "Vanguard"
    hitPointsMaximumBase = 350
  }
}
```

```text
import "moonwell" as mw
import "generated.objects" as objects

mw.on_main ->
  CreateUnit Player(0), objects.units.vanguard, 0, 0, 270
```

- [x] Explain module naming (`src/helpers.yue` and `lua/helpers.lua` collide), `require`/`import`, editor globals, `$FourCC`, startup hooks and iteration. Note that `src/**/*.lua` belongs to the editor extension; handwritten Lua belongs in `lua/`.
- [x] Review every command and example against the listed sources. Check that installation makes no manual Pkl/Go/Deno requirement, generated IDs are used directly, and `check` is not described as writing IDs. Run `deno task build` and review the four rendered guides and their anchors. Fix findings, then commit these four files.

### Task 3: Document Pkl objects, assets and map settings

**Files:** Modify `src/content/docs/moonwell/docs/{object-data,assets,map-settings}.md`.

**Interfaces:** Consumes the Task 2 manifest and generated-ID workflow. Produces authoring references linked by architecture, command reference and troubleshooting.

**Sources:** Moonwell README sections Objects, Assets, Icons and Map settings; `schema/{Project,ObjectFile,Objects,MapSettings}.pkl`, generated property schemas, `internal/cli/{objects,assets,assetspaths,settingscheck}.go`, `internal/pipeline/pipeline.go`, and asset/settings/object implementation tests.

- [ ] Replace old schema/base-constant/inheritance instructions with `@moonwell/ObjectFile.pkl`, `Objects.merge`, the seven categories, standard bases, unique rawcodes, friendly field names and `properties`. Explain per-level lists, literal text, null inheritance, duplicate fields and source-map collisions. Show `objects:check` and JSON-printing `objects:eval` accurately.
- [ ] Write the assets guide for the manifest's `assets.paths`/`exclude`, icon folder conventions, hidden files, reserved internal filenames, library assets, project overrides and conflicting libraries. Use Pkl raw strings for Windows map paths. Give the `assets:check` → build → close World Editor → `assets:sync` workflow, ownership/rollback rules and `assets:paths` classifications.
- [ ] Write settings examples under `settings` in `moonwell.pkl`: metadata, loading screen, gameplay, players/forces and environment. Explain null/false/zero/empty values, existing-slot constraints, custom forces, supported map-info versions, editor Lua rewriting and raw mapping conflicts. Link to assets when settings refer to imported models.
- [ ] Add the preview example `settings { info { preview = "preview.png" } }`. Document PNG/TGA/BLP1 constraints, 256/512 square sizes, placing the input outside `assets/`, preserved in-game minimap, start-location marker behavior and the measured single-player scope. Explain reserved files and `settings:check`.
- [ ] Trace which files each operation writes using pipeline and command sources. Confirm staged changes do not become source-map changes except for explicit asset sync. Check path backslashes, per-level semantics, and preview output filenames against current tests. Run `deno task build`, inspect these guides and links, fix findings, then commit.

### Task 4: Document libraries, architecture, commands and recovery

**Files:** Modify `src/content/docs/moonwell/docs/{library,architecture,reference,troubleshooting}.md`.

**Interfaces:** Consumes Tasks 2 and 3's authoring terminology. Produces a complete reference and recovery path for the current CLI and libraries.

**Sources:** All three READMEs and changelogs; Moonwell `schema/Project.pkl`, `internal/cli/{cli,args,build,testcmd,dev,setup}.go`, `internal/pipeline/pipeline.go`, `internal/project/`, `internal/layout/`, `internal/pkl/`, and current library module implementations.

- [ ] Show this committed library configuration and its local-path overrides; explain layout metadata, library keys versus module names, the lockfile and restart requirements for adding local libraries:

```pkl
libraries {
  ["wrappers"] { github = "mdlsvensson/moonwell-wrappers"; tag = "v0.9.1" }
  ["systems"] { github = "mdlsvensson/moonwell-systems"; tag = "v0.5.1" }
}
```

- [ ] Provide a wrapper example using `Unit.create` and `Player.fromIndex`, with `unit\remove!` inside a timed callback. Provide a Scheduler/Scope example with explicit `start` and later `dispose`. Copy and adapt the current upstream examples, importing every name used. Explain factories versus methods, live handles, idempotent cleanup, `Unit.autoDispose`/`sweep`, explicit ownership and multiplayer limitations. List the systems modules and link upstream API reference instead of duplicating it.
- [ ] Replace the architecture's TypeScript/Deno pipeline with the current manifest evaluation, library sync, object validation/IDs, compilation/bundling, stage creation, objects/settings/assets, Lua integration and packing/launch order confirmed in `pipeline.go`. Document `dist/stage/<map.folder>`, compile caches, `.moonwell/`, source ownership, hooks, local configuration and failed-build archive removal.
- [ ] Build the command table from `internal/cli/cli.go`, including all twelve commands, `--entry`, `--minify`, help/version and contributor-only `init --link`. Describe `test` as the launcher and `dev` as checking, not building/launching. Document exact schema defaults, environment/cache paths and generated files. Use the actual layout implementation for paths rather than inventing bundle filenames.
- [ ] Explain Pkl package/CLI major-minor matching, reinstalling to upgrade, resolving `PklProject`, and `setup` before `pkl project resolve` when managed Pkl is needed. Distinguish upgrading old Moonwell 0.7 projects from porting TypeScript framework projects.
- [ ] Add recovery tables for PATH and tool downloads, wrong package version, editor workspace root, unknown globals, stale IDs, duplicate modules, invalid object fields, source-map/settings/assets failures, game path and stale locks/output. Include YueScript bitwise limitations and the floor-division fix in 0.34.3 where relevant.
- [ ] Compare commands/defaults/version pins with source and trace both library examples through cleanup. Ensure all fresh-project instructions work without relying on an already installed Pkl or global `yue`. Run `deno task build`, inspect all four guides, fix review findings, then commit.

### Task 5: Review the complete update and verify it in a browser

**Files:** Modify `README.md` and `AGENTS.md`; fix only issues in files from Tasks 1–4 and record verification in this plan.

**Interfaces:** Consumes the finished Moonwell documentation and redirects. Produces the reviewed branch and evidence for the owner's integration decision.

- [ ] Update the README's paths, current documentation description and text-fence guidance. Preserve the original migration/license history without presenting old TypeScript docs as the current product. Update the handover's active docs path and related-repository context without rewriting historical roadmap records.
- [ ] Review the complete diff against every spec requirement. Request one independent reviewer to compare the guides and examples with current upstream code, check routing/reload behavior and scope, and report actionable findings. Run one fix wave, then re-review only the fixes and any unresolved concerns.
- [ ] Stop any preview/dev started for this task. Run the following sequentially from wc3.dev, with `ASSET_BASE_URL` unset for the final production build. If dependency installation is needed, use `deno install --frozen` first:

```text
deno task check
deno task resource:check
deno task tutorial:check
deno task test
deno task build
```

- [ ] Confirm zero Astro errors, successful resource/tutorial validation, passing fixture/site tests and a successful production build. Record existing missing tutorial screenshots/verify notes as existing authoring state if reported; they are outside this update.
- [ ] Start `deno task preview --port 4321`. Inspect `/moonwell/`, installation, gameplay, libraries and reference with the available browser tool. Follow homepage/rail/tutorial links into docs; verify the shell-to-Starlight transition, readable code blocks and sidebar at desktop and narrow widths. Navigate to an old overview URL and an old guide URL and confirm both reach their Moonwell targets. Inspect the new canonical URLs. Do not access Hive.
- [ ] Run `git diff --check`. Search active source and site-maintainer docs for `/framework/`, old source repositories and TypeScript-first claims; remaining occurrences must be redirects, their tests, explicit migration history or unrelated resource descriptions. Confirm upstream repositories' status is unchanged.
- [ ] Record actual command/browser results in the plan, mark completed checkboxes, and commit reviewed handover/QA fixes with attribution. Report the branch and verification to the owner; ask before pushing or merging.

## Plan self-review

All eleven guides have an owning task; routing, branding, tutorial reloads,
redirects, source links, upstream-state limitations, handover updates, final
review and browser checks are covered. Prose changes use source comparison and
existing build/link checks. Additional automated checks are limited to route
migration behavior; do not add tests that merely repeat documentation text.

The source-root paths and snippets are concrete. Task 1 establishes all new
URLs before the content tasks use them. No task requires changes to Moonwell,
its libraries, the site dependencies, Hive data or tutorial map behavior.

## Execution approval

The owner approved the spec with “Go” on 2026-10-03. This plan is now ready for
the separate plan approval required by `AGENTS.md`. After approval, use native
execution unless the owner selects subagent-driven execution.
