---
title: Commands and configuration
description: Reference Moonwell CLI commands, Pkl configuration, generated files, caches, and upgrades.
---

Run project commands from the folder containing `moonwell.pkl`. Moonwell is
an installed executable; map projects no longer use Deno task definitions.

## Commands

| Command | Effect |
| --- | --- |
| `moonwell init <dir>` | Create a project in a new or empty folder and resolve its Pkl dependencies |
| `moonwell setup` | Prepare missing local/editor files, managed tool binaries and library editor inputs |
| `moonwell build [--entry src/x.yue] [--minify]` | Compile, stage, and pack `<build.folder>/<map.folder>` |
| `moonwell test [--entry src/x.yue] [--minify]` | Compile, stage, and launch the map folder in Warcraft III |
| `moonwell dev` | Run a check immediately, then recheck watched changes and refresh object IDs |
| `moonwell check` | Validate and compile without staging a map; fail on stale generated IDs |
| `moonwell assets:check` | List the changes asset sync would make to the source map |
| `moonwell assets:sync` | Write project/library imports into the source map; close it in World Editor first |
| `moonwell assets:paths [file]` | Inspect model references and classify game/custom import paths |
| `moonwell settings:check` | List the internal map files settings would change, without applying them |
| `moonwell objects:check` | Validate objects, list affected tables, and check generated IDs |
| `moonwell objects:eval` | Print validated resolved objects as JSON; no ID generation or map writes |

`test` is the game launcher, not an automated regression suite, and does not
refresh the packed archive. `dev` does not build an archive or launch the game.
`--entry` temporarily overrides the gameplay entry for a build or playtest.
`--minify` enables YueScript minification for that invocation; it loses runtime
line numbers. Handwritten Lua modules remain unminified.

Use `moonwell --help` (`-h`) and `moonwell --version` (`-v`) for CLI information.
Contributor-only `moonwell init <dir> --link` scaffolds against a local Moonwell
checkout; ordinary users should use the release package without `--link`.

## Configuration

The shared manifest starts with `amends "@moonwell/Project.pkl"`. The ignored
local manifest starts with `amends "moonwell.pkl"` and can override any setting.
The local file is evaluated when present. Assigning a list replaces it whole.

| Setting | Schema default | Meaning |
| --- | --- | --- |
| `map.folder` | `"map.w3x"` | Source folder relative to `maps/`, ending in `.w3x` |
| `map.entry` | `"src/main.yue"` | Project-relative YueScript entry under `src/` |
| `build.folder` | `"dist/bin"` | Relative archive-output folder |
| `build.minify` | `false` | Minify compiled YueScript Lua |
| `launch.gameExecutable` | `null` | Warcraft III executable; `init`/`setup` supply the default Battle.net path in the local manifest |
| `launch.args` | `List("-launch", "-windowmode", "windowed")` | Arguments before generated `-loadfile <map>` |
| `yue.version` | `"0.34.3"` | Compiler pin; only versions whose checksums the CLI knows are accepted |
| `yue.path` | `null` | Use your own compiler executable; normally a local override |
| `lint.unknownGlobals` | `"error"` | Fail unknown-global checks, or use `"warning"` to continue with reports |
| `lint.globals` | `List()` | Explicit extra global names |
| `assets.paths` | Empty mapping | Project asset file to exact imported path |
| `assets.exclude` | `List()` | Project asset files/folders to omit |
| `libraries` | Empty mapping | GitHub-tag or local module/asset libraries |
| `settings` | Null everyday fields, empty raw mappings | Overrides inherited from the source map |
| `objects` | Empty category mappings | Filled through `Objects.merge` in the template |

Folder paths must be relative, without parent traversal. `build.folder` cannot
be under `maps/`, `src/`, or `dist/stage/`; keep archives apart from source and
staging. Project paths resolve from the project root.

```pkl title="moonwell.local.pkl · launch overrides"
amends "moonwell.pkl"

launch {
  gameExecutable = #"C:\Games\Warcraft III\_retail_\x86_64\Warcraft III.exe"#
  args = List("-launch", "-windowmode", "fullscreen")
}
```

Asset mappings and settings now live in this manifest, rather than separate
`assets.pkl` or `map-settings.pkl` files. See [Assets](/moonwell/docs/assets/),
[Settings](/moonwell/docs/map-settings/), and [Objects](/moonwell/docs/object-data/).

Library entries have optional `github`, `tag`, `path`, and `dir` fields.
Use `github = "owner/repo"` with a tag, or `path` for a local library root.
`path` wins over the remote source. `dir` overrides a library's layout metadata;
leave it unset for current wrappers and systems. See [Libraries](/moonwell/docs/library/).

## Tools and caches

Moonwell uses Pkl 0.32 or newer on PATH, falling back to checksum-pinned
Pkl 0.32.1. It downloads the pinned YueScript compiler when needed. Downloads
support the published Windows/Linux x86-64 targets and are cached per version:

| Environment/path | Role |
| --- | --- |
| `MOONWELL_CACHE` | Explicit managed-tools cache root |
| `%LOCALAPPDATA%\moonwell` | Default Windows cache |
| `$XDG_CACHE_HOME/moonwell`, otherwise `~/.cache/moonwell` | Default Linux cache |
| `<cache>/bin` | `setup`'s editor `yue` and managed shell `pkl` binaries |
| `PATH` | Finds `moonwell` and an eligible installed Pkl; the editor finds `yue` here |

On Windows the release installer puts `moonwell.exe` in `<cache>/bin` and adds
it to user PATH. Linux's installer puts Moonwell in `~/.local/bin`; editor
tool setup may need the separate cache `bin` folder on PATH. Follow setup's
printed command and restart the terminal/editor. Projects with different
compiler pins share that editor `yue` copy, and each `setup` replaces it.

## Generated and local files

| Path | Producer | Git treatment |
| --- | --- | --- |
| `PklProject.deps.json` | `init`, `pkl project resolve` | Commit resolved schema dependencies |
| `src/generated/objects.yue` | `build`, `test`, `dev` | Commit alongside Pkl objects; `check` verifies freshness |
| `moonwell.lock` | Library synchronization | Commit tag-to-commit locks |
| `.asset-state/` | `assets:sync` | Commit with synchronized source-map imports |
| `moonwell.local.pkl` | `init`, `setup` if missing | Ignored machine configuration |
| `yueconfig.yue`, `.luarc.json`, `.vscode/extensions.json` | Project template, missing files added by `setup` | Shared editor configuration |
| `src/**/*.lua` beside `.yue` files | VS Code YueScript extension | Ignored completion outputs |
| `.moonwell/types/`, `.moonwell/yue/`, `.moonwell/lua/` | Editor/macro/library preparation | Ignored generated inputs |
| `.moonwell/libraries/`, `.moonwell/library-assets/` | Library synchronization | Ignored copies |
| `dist/stage/lua/` | Compiler and lint caches | Ignored |
| `dist/stage/<map.folder>/` | `build`, `test` | Ignored staged map |
| `<build.folder>/<map.folder>` | `build` | Ignore archive output; default is `dist/bin/map.w3x` |
| `dist/moonwell.log`, `dist/.lock` | Project CLI operations | Ignored log and operation lock |

Repair generated files by changing their sources and regenerating. `setup`
adds missing editor files rather than overwriting existing ones; it can merge
required Lua language-server paths into plain JSON `.luarc.json`.

## Upgrades

Run the release installer again; there is no update command. `PklProject`
selects a package like this:

```pkl title="PklProject"
amends "pkl:Project"

dependencies {
  ["moonwell"] {
    uri = "package://pkg.pkl-lang.org/github.com/mdlsvensson/moonwell/moonwell@0.9.1"
  }
}
```

The CLI and package must match in major and minor version. Patch versions can
differ: CLI 0.9.1 reads a 0.9.0 project. To change the package pin, install the
matching CLI, edit `PklProject`, and run `pkl project resolve`. If you have no
usable shell Pkl, first run `moonwell setup` to expose Moonwell's managed copy;
it prepares Pkl before trying to load an incompatible project. Follow its PATH
instructions even if the later project-loading step reports a version mismatch.

For **Moonwell 0.7 and earlier**, install the current CLI, move the package pin
to the matching version, resolve dependencies, and remove the old `deno.json`
and `deno.lock`. Replace `deno task build` with `moonwell build`, and likewise
for the other project commands. The 0.8 migration preserved the project's
manifest, map data, libraries, and caches.

The earlier **wc3-dev-framework TypeScript project** is a different workflow.
Its gameplay and JSON/Pkl schemas require porting; changing command names alone
does not migrate it. Preserve its map source and use a new Moonwell project
as the starting point.
