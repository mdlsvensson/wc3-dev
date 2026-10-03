---
title: How Moonwell works
description: Understand Moonwell source ownership, compilation, staged maps, and runtime hooks.
---

Moonwell is one installed Go executable. It evaluates Pkl, runs the pinned
YueScript compiler, bundles Lua modules, and writes a separate map. The
World Editor source remains authoritative for terrain and placements.

## Source ownership

| Path | Responsibility |
| --- | --- |
| `moonwell.pkl` | Shared manifest, amending the published Project schema |
| `moonwell.local.pkl` | Ignored machine-specific overrides, amending the shared manifest |
| `PklProject`, `PklProject.deps.json` | Schema package selection and resolved Pkl dependencies |
| `maps/<map.folder>/` | Complete Lua folder-format source map |
| `src/main.yue`, `src/**/*.yue` | Gameplay entry and YueScript modules |
| `lua/**/*.lua` | Handwritten Lua modules |
| `objects/**/*.pkl` | Custom object definitions merged by the manifest |
| `src/generated/objects.yue` | Generated integer object IDs; commit with definitions |
| `assets/` | Project imports, optionally mapped/excluded by the manifest |
| `.asset-state/` | Source-map import ownership; commit with synced map files |
| `moonwell.lock` | GitHub library tags resolved to commits; commit it |
| `.moonwell/` | Ignored libraries, library assets, editor declarations and macro module |
| `dist/` | Replaceable compile cache, staging, archive output and log |

The local manifest is evaluated when present; otherwise Moonwell evaluates
the shared manifest. Pkl amendment handles overrides. Lists such as
`launch.args` replace the inherited list instead of appending.

## Build stages

```text
PklProject + moonwell.pkl / moonwell.local.pkl
                 |
       validate and plan object data
                 |
   refresh object IDs and editor declarations
                 |
     sync libraries + compile YueScript
                 |
     resolve imported modules + lint globals
                 |
maps/<folder> -> dist/stage/<folder> (fresh copy)
                 |
       apply object, setting and asset plans
                 |
       integrate runtime and gameplay Lua
                 |
       package <build.folder>/<map.folder>
```

1. Load the manifest through Pkl and check its Moonwell package version.
2. Acquire the project build lock. Validate objects against metadata and the
   source map, generate `objects.yue`, and refresh editor declarations.
3. Synchronize libraries and their assets. Compile YueScript into
   `dist/stage/lua/`, reusing unchanged outputs by content hash and compiler
   settings. Resolve the entry's import graph and check unknown globals.
4. Replace `dist/stage/<map.folder>/` with a complete source-map copy.
5. Apply object tables, then map settings, then asset imports to that copy.
   Settings may update editor Lua calls as well as binary/text data.
6. Integrate the Moonwell runtime and reachable modules with the editor Lua.
   Preserve the editor's map initialization and invoke registered hooks around it.
7. Pack an MPQ `.w3x` archive at `<build.folder>/<map.folder>`.

`moonwell test` uses the same staging pipeline and launches the staged map
directory, without packing a fresh archive. `moonwell check` validates and
compiles without staging; it requires current object IDs. `dev` repeatedly
checks and refreshes IDs when needed, without building or launching.

Only `assets:sync` writes imports into the source map and updates ownership
state. Pkl objects and settings have no source-map sync command.

## Modules and hooks

The entry is a `.yue` file under `src/`, defaulting to `src/main.yue`.
`src/helpers.yue` and `lua/helpers.lua` both claim `helpers`; duplicate names
fail. `init.lua` modules answer to their containing folder's name. Library
modules share that namespace. Only modules reachable through `import` or
`require` enter the bundle.

Plain Lua modules are bundled as written. Editor-generated `.lua` files beside
`.yue` source are ignored as build input. The game provides Lua 5.3 with a
restricted standard library: no `collectgarbage`, `dofile`, `loadfile`, `debug`,
`io`, or `package`, and only selected `os` functions. Moonwell supplies its
bundled module loading; do not assume the desktop Lua environment exists.

```text title="src/main.yue · YueScript"
import "moonwell" as mw

mw.on_main ->
  print "Moonwell is running."
```

Available hooks are `before_config`, `on_config`, `before_main`, and `on_main`.
Module top-level code executes while the script loads, so allocate game
objects inside a hook or subsequent gameplay. A failing hook prints its source
error and allows the other hooks to run.

## Editor support and lint

`setup` prepares the pinned `yue` executable on the editor's PATH and adds
missing settings files. `.moonwell/types/` contains declarations for natives,
Blizzard.j, object IDs, and source-map globals. Library Lua appears in
`.moonwell/lua/`. `check`, `build`, `test`, and `dev` refresh these inputs.

Unknown-global checking applies to reachable project YueScript modules, not
handwritten Lua or library source. A required Lua/library module's detected
top-level global definitions can still make names known to project YueScript.
For undetected externally supplied names use `lint.globals` explicitly.

## Failure and generated state

Commands return a nonzero exit code for failure and report a file plus a hint
where available. Project command logs go to `dist/moonwell.log`. A build removes
its target archive before building and again on failure; staging or cached
outputs can remain, so use the command result to judge success.

Run operations serially in a project. `dist/.lock` records the active process;
a concurrent operation fails rather than racing shared staging and generated
files. After a crash, follow the lock diagnostic only once that process is
no longer running. The next build replaces the staged map from source.

Normal YueScript errors map to the `.yue` source and line. With minification
they retain the filename but lose the line. Handwritten Lua remains unminified
and keeps its source lines. Generated editor files and compile caches are
outputs, not places to repair source problems.
