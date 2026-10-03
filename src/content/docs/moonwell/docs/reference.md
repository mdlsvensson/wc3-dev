---
title: "Commands and configuration"
description: "Commands and configuration for the Warcraft III TypeScript framework."
---

Run every command from the repository root. `deno.json` owns task definitions;
`package.json` includes optional aliases for most tasks, but Deno is the supported
installer and runner.

## Commands

| Command | Effect | Requirements beyond Deno/dependencies |
| --- | --- | --- |
| `deno install --frozen` | Install dependencies using `deno.lock` | Registry access for uncached packages |
| `deno task build` | Evaluate Pkl, apply map settings, compile, inject objects, package the selected map | Pkl, source map |
| `deno task build -minify` | Same build with Lua minification enabled | Pkl, source map |
| `deno task build --entry <file>` | Same build with another entry point instead of `src/main.ts` (e.g. a library testbed) | Pkl, source map |
| `deno task test` | Compile and launch the staged map directory | Pkl, source map, Warcraft III |
| `deno task test --entry <file>` | Same launch with another entry point | Pkl, source map, Warcraft III |
| `deno task test:unit` | Automated regression suite | No Pkl or game required |
| `deno task test:assets:pkl` | Real Pkl configuration and asset CLI integration test | Pkl; no game required |
| `deno task test:settings:pkl` | Real Pkl map-settings schema integration test | Pkl; no game required |
| `deno task settings:check` | Validate map settings without writing map files | Source map; Pkl when `map-settings.pkl` exists |
| `deno task assets:check` | Validate asset paths, ownership, and planned changes | Source map; Pkl when `assets.pkl` exists |
| `deno task assets:sync` | Sync imports into the source map | Same as check; close the map in World Editor first |
| `deno task typecheck` | Check tools and gameplay types (syncs map libraries first when needed) | Current generated gameplay inputs |
| `deno task lib:sync` | Copy the map libraries in `config.json` `libraries` into `.lib/` and map them in `tsconfig.json` `paths` | Registry access unless linked; see [Using the library](/moonwell/docs/library/) |
| `deno task lint` | Deno/custom lint followed by JSON/config validation | No Pkl or game required |
| `deno task lint:json` | JSON/config validation only | No Pkl or game required |
| `deno task objects:eval` | Regenerate `src/generated/objects.json` | Pkl |
| `deno task build:defs` | Regenerate editor-global TypeScript declarations | Source-map Lua |
| `deno task dev` | Watch object Pkl and map Lua changes; regenerate outputs and validate map-settings edits | Pkl for Pkl edits, source map |
| `deno task schema:gen` | Regenerate Pkl property schemas | Installed object-data metadata |
| `deno task bases:gen` | Regenerate Pkl base constants, then property schemas | Installed object-data metadata |

`test` is a game launcher, not the regression suite. It does not refresh the packed
archive. `-minify` is supported by `build`; to minify a `test` launch, set
`minifyScript` in configuration. `dev` does not perform an initial build or start
Warcraft III. Restart it after changing `mapFolder`.

## Configuration

See [Import assets](/moonwell/docs/assets/) for the separate `assets.pkl` schema,
folder layout, and editor synchronization workflow.
See [Map settings](/moonwell/docs/map-settings/) for `map-settings.pkl`, which
overrides metadata, loading screens, gameplay constants, and interface settings
in the staged map during build and playtest.

`config.json` supplies shared defaults. An optional ignored `config.local.json`
replaces any supplied top-level values. This is a shallow merge: `launchArgs`
replaces the entire array, not individual entries.

| Key | Type / default | Meaning |
| --- | --- | --- |
| `mapFolder` | String, `map.w3x` | A `.w3x` directory name directly under `maps/`; no path separators |
| `minifyScript` | Boolean, `false` | Minify the combined editor/gameplay Lua |
| `gameExecutable` | Nonempty string, example Windows installation path | Warcraft III executable used for launching |
| `outputFolder` | Nonempty string, `./dist/bin` | Directory for packaged archives |
| `launchArgs` | String array, `-launch -windowmode windowed` | Arguments appended after the generated `-loadfile` argument |
| `winePath` | Optional string | Wine executable; enables the Wine launch branch |
| `winePrefix` | Optional string | `WINEPREFIX` environment value for the launched process |
| `libraries` | Optional string array, e.g. `["@mdlsvensson/wc3-lib"]` | JSR packages compiled into the map; each must also be a `deno.json` dependency. See [Using the library](/moonwell/docs/library/) |

Keep `outputFolder` separate from both your source-map folder and the staging
directory, normally under `dist/`. Changing it does not move staging or the Lua
bundle. Relative paths resolve from the working directory, so run tasks at root.

Configuration validation checks values, not the existence of the game executable;
building does not require Warcraft III. Pkl is configured separately through
`PKL_EXECUTABLE`, falling back to `pkl` on `PATH`. Do not include shell quotes in
the environment variable's value; spaces in the executable path are supported.

Wine support constructs a `Z:` map path and can set a Wine prefix. This is an
experimental path, not a tested Linux installation recipe. macOS/Linux builds
also require platform-appropriate Deno/Pkl executables and independent validation.

## Generated files

| Path | Producer | Git treatment |
| --- | --- | --- |
| `src/generated/objects.json` | `objects:eval`, `build`, `test`, watcher | Tracked; regenerate after definition changes |
| `.asset-state/<mapFolder>.json` | `assets:sync` | Tracked with source-map changes; managed import ownership |
| `src/war3map.d.ts` | `build:defs`, watcher | Tracked; regenerate after editor-global changes |
| `objects/bases.pkl` | `bases:gen` | Tracked; review dependency-driven changes |
| `objects/schema/generated/*.pkl` | `schema:gen`, `bases:gen` | Tracked; do not hand-edit |
| `dist/<mapFolder>/` | `build`, `test` | Ignored; staging replaced per build |
| `dist/tstl_output.lua` | Compiler | Ignored; gameplay bundle |
| `<outputFolder>/<mapFolder>` | `build` | Ignored with the default output folder |
| `tsconfig.build.<pid>.json` | Compiler orchestration | Ignored; normally removed automatically |
| `project.log` | CLI logging | Ignored; useful for diagnosing builds |
| `.lib/<@scope>/<name>/` | `lib:sync`, `build`, `test`, `typecheck` | Ignored; TypeScript sources of each map library |
| `tsconfig.json` `paths` entries into `./.lib/` | `lib:sync` | Tracked; version-less, change only when a library's entry points do |
| `node_modules/` | Deno dependency installation | Ignored |

Do not edit generated JSON or declarations as the source of a fix. Change Pkl or
the World Editor map, then regenerate. Include changed tracked outputs when
committing source changes that affect them.

## Lint behavior

The custom plugin checks direct calls such as `FourCC("hfoo")`. It permits expressions
such as `FourCC(objects.units.vanguard.id)` without evaluating them. Pkl rawcode
constraints are stricter than the lint rule: Pkl requires alphanumeric IDs with
category-specific prefixes, while lint accepts four printable ASCII characters.

In `src/`, three more rules catch TypeScriptToLua 1.31 hazards: `lua-no-finally`, `lua-loop-closure`
and `lua-truthiness` (see [Using the library](/moonwell/docs/library/#writing-code-for-lua)).

Generated files, map assets, `.lib/` and build output are excluded from normal linting.
`deno task lint` also validates JSON syntax and the merged project configuration.

