# Moonwell documentation update

Date: 2026-10-03
Status: Approved by the owner on 2026-10-03; implementation plan pending
Branch: `codex/moonwell-docs-refresh`

## Goal

Replace wc3.dev's documentation for the old TypeScript framework with usable
documentation for the current Moonwell project. A visitor must be able to
install Moonwell, build and play the template, bring in an editor map, author
objects and gameplay, import assets, configure settings, and use the optional
wrappers and systems libraries without following obsolete instructions.

The owner explicitly requested `/moonwell/` URLs. The overview will be
`/moonwell/`; documentation will live under `/moonwell/docs/`.

## Approaches considered

1. **Recommended: replace the guides and move them to `/moonwell/`.** Update
   the overview, all eleven documentation pages, navigation, source links,
   and the tutorial's next-steps pointer together. This produces one coherent
   current workflow. Old framework URLs redirect to their corresponding new
   pages; they no longer serve framework documentation.
2. **Move and minimally rename the existing content.** Less editing, but it
   leaves incorrect commands, configuration, object schemas, and gameplay
   examples. This does not meet the requested project-state update.
3. **Keep separate old and new documentation.** Preserves the historical
   workflow but introduces a second documentation section and leaves visitors
   choosing between projects. That additional maintenance is outside scope.

## Verified project state

The local project sources, schemas, command implementation, template,
changelogs, and handovers are authoritative for this update. These repositories
are read-only inputs; their files will not be changed.

| Project | Current state inspected |
| --- | --- |
| `moonwell` | CLI 0.9.1, released 2026-10-03; checkout `4ff9e1d` |
| `moonwell-wrappers` | v0.9.1; checkout `8402e5f` |
| `moonwell-systems` | v0.5.1; checkout `9cf0eed` |

Important corrections:

- Moonwell is an installed Go executable. End users do not need Go, Deno,
  Node.js, a clone of the framework, or its contributor test commands.
- Release installers support Windows and Linux on x86-64. Warcraft III and
  a Lua-capable World Editor are needed for editing and playtesting. Do not
  imply that the Linux installer establishes a tested game-launch setup.
- Moonwell 0.9.1 uses Pkl 0.32 or newer from PATH, or downloads pinned Pkl
  0.32.1 when it is missing or older. `setup` exposes the managed Pkl and
  YueScript compiler for the shell/editor.
- Gameplay uses YueScript, compiled with pinned YueScript 0.34.3 to Lua 5.3,
  and can import plain Lua modules. The current schema requires a `.yue`
  entry under `src/`; plain Lua modules belong in `lua/`.
- Teal and Fennel are future work in the handover and are absent from the
  implemented project entry configuration. Do not present them as supported
  merely because the README's introductory feature list names them.
- `moonwell.pkl` and ignored `moonwell.local.pkl` replace the old JSON
  configuration and separate Pkl files. `PklProject` pins the schema package;
  the CLI and package must match in major and minor version.
- Runtime hooks come from `moonwell`: `before_config`, `on_config`,
  `before_main`, and `on_main`. w3ts and TypeScriptToLua are not part of the
  current Moonwell workflow.
- Objects amend `@moonwell/ObjectFile.pkl`; the project merges them through
  `Objects.merge`. Generated `objects.yue` exposes integer object IDs, not
  the old JSON object records. `check` detects stale generated IDs;
  `objects:eval` prints validated JSON rather than updating that file.
- Wrappers and systems are separate opt-in Lua libraries, pinned by GitHub
  tag in the manifest and commit in `moonwell.lock`. Both must be declared
  when using systems; libraries do not declare transitive dependencies.
- Libraries now declare their layout in `moonwell-library.json`. Current
  wrappers and systems tags need no explicit `dir = "src"`.
- Asset imports include library assets, model-path inspection, icon folders,
  and source-map synchronization with ownership tracking.
- Settings include existing player/force overrides, editor Lua changes, and
  map-list preview pictures in PNG, TGA, or BLP1 at 256 or 512 pixels square.
- Gameplay/library game gates passed on Warcraft III 3.0.0.24268 where
  recorded. Multiplayer checks remain deferred; do not claim they passed.

The Moonwell working tree also contains untracked `docs/learning/`; this update
uses committed public documentation and executable behavior as its baseline.

## Page changes

Keep the existing guide slugs under the new documentation prefix. Rework prose
and examples for Moonwell rather than mechanically replacing product names.

| New page | Content |
| --- | --- |
| `/moonwell/` | Moonwell overview, current capabilities, native-based YueScript example, release install and first build |
| `/moonwell/docs/` | Reading order, supported languages and tools, links to current upstream docs and changelog |
| `installation/` | Release installer, `init`, local launch path, `check`/`build`/`test`, `setup`, VS Code and managed tools |
| `custom-maps/` | Lua folder-format source map, `map.folder`, template-specific gameplay/globals, refresh and build |
| `map-making/` | Custom Pkl object, generated integer ID, YueScript startup hook, modules, editor globals and iteration |
| `assets/` | Paths, manifest mappings/exclusions, icons, library assets, `assets:paths`, check/build/source sync and ownership |
| `map-settings/` | Manifest settings, inheritance/clearing, metadata, players, forces, environment, constants and preview images |
| `library/` | Wrappers v0.9.1 and systems v0.5.1, tag/local configuration, lockfile, imports, handles, cleanup and Scope ownership |
| `object-data/` | Seven categories, base objects/rawcodes, field names, lists/levels, properties, collisions, generated IDs and diagnostics |
| `architecture/` | Source ownership, manifest/package/tools, stages and outputs, imported modules/hooks, generated state and failure behavior |
| `reference/` | Implemented CLI commands/flags, schema defaults, paths/cache/environment, generated files and upgrades |
| `troubleshooting/` | Installation/PATH/version mismatch, editor setup, unknown globals, module collisions, stale objects, settings/assets and launch failures |

The library page includes practical wrapper and scheduler/scope examples and a
concise inventory of available systems with upstream reference links. It does
not duplicate the libraries' entire API reference. Examples use native gameplay
for the first map so installing libraries remains optional.

Installation/reference also explain upgrading older Moonwell Deno projects.
They must not claim that old wc3-dev-framework TypeScript projects migrate by
renaming commands: those use different schemas, languages and libraries.

## Site integration and routing

- Move `src/pages/framework/index.astro` to `src/pages/moonwell/index.astro`.
- Move the eleven Markdown guides from
  `src/content/docs/framework/docs/` to `src/content/docs/moonwell/docs/`.
- Change Starlight title, description, sidebar slugs and overview link.
- Change the homepage card, activity rail, guide panel, title-bar source
  link, and status-bar source link to Moonwell names and URLs.
- Update `src/data/guides.ts`, including a visible libraries guide.
- Update the scripting pointer in `src/content/tutorials/next.md`.
- Update route-aware scripts/tests and docs reload handling wherever the old
  prefix was special-cased. Search the full active source tree for old paths.
- Configure explicit static redirects from the old overview and eleven guide
  URLs to corresponding Moonwell URLs. All active navigation and canonical
  content use `/moonwell/`; redirects exist only for incoming old links.
- Keep the established shell, Starlight layout, global styles and resource
  catalog. w3ts remains a valid independent resource-catalog entry.
- Use `text` fences labeled with filenames for YueScript if the installed
  highlighter lacks a compatible grammar. Do not label YueScript as Lua or
  introduce a new grammar/dependency as part of this documentation task.
- Update the wc3.dev handover's active docs-path/project-context references
  to match the resulting site. Do not rewrite historical specs and plans.

## Validation

Review each task's result against the corresponding Moonwell source and schema.
Run the existing project checks with Deno only; wc3.dev retains its Deno
toolchain even though the documented Moonwell CLI is Go.

Before finishing implementation:

1. Confirm all code examples, command effects, file paths, defaults and version
   pins against the inspected current upstream files.
2. Update existing site checks for new routes, branding and links. Check all
   eleven docs routes, incoming redirects, navigation and internal anchors.
3. Run `deno task check`, `resource:check`, `tutorial:check`, `test`, and
   production `build` with `ASSET_BASE_URL` unset. Stop preview/dev before
   checks and builds.
4. Run `deno task preview` on port 4321 and inspect the overview, installation,
   gameplay, libraries and reference in a browser. Verify readable examples,
   working navigation and an old-URL redirect.
5. Complete final review, one fix wave if needed, and a review scoped to those
   fixes. Report verification evidence and any remaining limitations.

No Hive access is needed. No application dependencies, resource catalog assets,
or tutorial lesson/map behavior need to change. Do not push or merge without
the owner's approval.

## Approval and next stage

After the owner approves this spec, write a task-by-task implementation plan
in `docs/superpowers/plans/` and request approval of that concrete plan before
editing the site. Follow the repository's task review and final verification
process during implementation.
