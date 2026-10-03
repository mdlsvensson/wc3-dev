---
title: Troubleshooting Moonwell
description: Resolve installation, editor, gameplay, Pkl data, and game-launch problems.
---

Start with the first diagnostic's file and hint. Run commands from the project
folder containing `moonwell.pkl`. Project logs are in `dist/moonwell.log`.

## Tools and installation

| Symptom | What to check |
| --- | --- |
| `moonwell` is not recognized | Reopen the terminal after installation. Windows uses `%LOCALAPPDATA%\moonwell\bin` or `MOONWELL_CACHE\bin`; Linux uses `~/.local/bin` |
| Pkl or YueScript download fails | First use needs access to release downloads and a writable cache. Check the named download/cache error, then retry; checksums must match |
| An older Pkl on PATH is reported | Moonwell falls back to its managed Pkl. Run `moonwell setup`, follow PATH instructions, and check which Pkl your shell runs |
| `pkl project resolve` is not recognized | `setup` exposes the managed Pkl in `<cache>/bin`. Open a new terminal after adding that folder to PATH |
| CLI/package version mismatch | Compare `moonwell --version` and the package pin in `PklProject`; match major/minor and resolve dependencies after changing the pin |
| Old project cannot get far enough through `setup` | Setup prepares managed shell Pkl before loading the project. Follow its PATH instructions even if project loading subsequently fails |

See [Installation](/moonwell/docs/installation/) for installer lines and
[Upgrades](/moonwell/docs/reference/#upgrades) for package-version changes.
End users do not need Go or Deno. Supported release downloads are Windows and
Linux x86-64; that does not establish game-launch support on Linux.

## Editor completion

| Symptom | Recovery |
| --- | --- |
| Natives/imports are unrecognized | Install both recommended YueScript and Lua extensions, run `moonwell setup`, and restart VS Code |
| Completion works in another project only | Open this project itself as the first workspace folder; the language server reads `.luarc.json` there |
| Editor finds the wrong `yue` version | Run `setup` for this project and follow its PATH command. Different projects can replace the shared editor compiler copy |
| Editor-created `gg_`/`udg_` globals are missing | Save the source map, then run `moonwell check` or save a watched source while `dev` runs |
| Pkl extension cannot find the schema | Sync Pkl projects after `init`/package changes, and set the extension's Pkl CLI path if needed |
| Lua declarations omit a required library | Run `check` or `build` to synchronize and compile it. `setup` alone does not compile library YueScript |

Ignored `.lua` files beside `.yue` files are normal editor outputs. Do not put
handwritten Lua there; use `lua/`.

## Source maps

| Diagnostic | Recovery |
| --- | --- |
| Source folder not found | Check `map.folder` and any local override. The complete source directory belongs under `maps/` |
| No `war3map.lua` | Save/export a complete map with Lua script mode; a JASS map has a different script |
| No `war3map.w3i` | Export the entire map, not just its Lua file, and remove accidental extra folder nesting |
| Script structure refused by settings | Re-save in World Editor so its initialization functions use the expected structure |
| Map-info version unsupported | Re-save in a current Lua-capable World Editor, then export the complete folder again |
| Source Object Editor does not show Pkl changes | Pkl objects apply to the staged map. Open a built copy to inspect them |

Packed `.w3x` archives are not source directories or ZIP files. Follow
[Use your own map](/moonwell/docs/custom-maps/) for folder-format/export setup.

## Objects and settings

| Symptom | Recovery |
| --- | --- |
| `objects.yue` is stale or missing | Run `moonwell build`, `test`, or `dev`, then commit the generated IDs with your object definitions. `objects:eval` only prints JSON |
| Object ID already exists | Choose a rawcode absent from standard objects, your other Pkl objects, and source-map custom objects |
| Invalid base | Use a standard base in the correct category; custom objects cannot be bases. Check suggested IDs |
| Unknown or duplicate property | Check the friendly name/rawcode and whether it applies to the base. Do not set one field both typed and in `properties` |
| Level list rejected | Keep the list within the object's level count; use null to inherit, not an empty level list |
| Player/force override rejected | Configure existing slots/teams in World Editor first; enable custom forces before force overrides |
| Raw and typed setting conflict | Make the raw string match the typed setting's serialized value exactly, or set only one |
| Preview image rejected | Use a readable 256×256 or 512×512 PNG, true-color TGA, or BLP1 outside `assets/`; keep source minimap filenames free of conflicts |

Use `moonwell objects:check` and `moonwell settings:check` for focused
validation. Changes remain staged; reopening the source map does not show them.
See [Objects](/moonwell/docs/object-data/) and [Settings](/moonwell/docs/map-settings/).

## Gameplay and libraries

**Unknown global:** correct the spelling first. Known names include game
natives, Blizzard.j, Lua libraries provided by the game, editor globals,
explicit YueScript `global` declarations, and detected top-level global
definitions from required modules. Only reachable project YueScript is
checked. For globals the scanner cannot recognize, add the actual name to
`lint.globals`; `lint.unknownGlobals = "warning"` reports without failing.

**Missing or duplicate module:** imports follow file paths, not manifest cache
keys. `src/foo.yue`, `lua/foo.lua`, and a library module `foo` compete for one
name. Check spelling, the library's `dir`/metadata, and the entry's import
graph. The module name `moonwell` belongs to the built-in runtime.

**YueScript compiled but could not rewrite Lua:** its rewrite step cannot
read bitwise operators. Move that code to a handwritten module under `lua/`.
Old YueScript 0.34.2 also produced empty output for floor division (`//`);
upgrade the project's package to get the current 0.34.3 compiler.

**Disposed wrapper:** avoid using a handle after wrapper cleanup. Use
`exists()` for widgets held across time and destroy wrapped objects through
their wrapper. Automatic unit disposal is opt-in; corpses are not removals.

**Systems imports fail:** declare both wrappers and systems in the map
manifest. Libraries do not install their own dependencies. Commit the lockfile
and restart `dev` after adding a local library. See [Libraries](/moonwell/docs/library/).

**Runtime error lacks a line:** rebuild without `--minify` and with
`build.minify = false`. Normal YueScript errors map to source lines;
handwritten Lua remains unminified in either mode.

## Assets, launch and output

| Symptom | Recovery |
| --- | --- |
| Model is missing a texture | Run `moonwell assets:paths` and supply every `custom path, not imported` file at the expected path |
| Assets work in a build but not World Editor | Close the source map, run `assets:sync`, then reopen it |
| Sync refuses an existing/edited file | Review the named ownership conflict. Do not discard state to overwrite unrelated editor imports |
| Two libraries claim the same asset path | Fix the libraries' path layout; project overrides replace a library file, not a conflicting pair of libraries |
| Game cannot launch | Correct `launch.gameExecutable` in the local manifest and verify it names the game executable. `build` works without a game installation |
| Staging cannot replace files | Close Warcraft III/World Editor if either has the staged map open, then retry |
| Operation already running | Let the named process finish or stop it. Remove a stale `dist/.lock` only after confirming the recorded process is no longer running |
| Playtest changed but archive did not | `test` launches staging; run `build` to refresh the distributable archive |

Judge success by the command's exit result. A failed build removes its target
archive, but compile caches and staging can remain. Repair source files and
rerun the build rather than editing generated output.
