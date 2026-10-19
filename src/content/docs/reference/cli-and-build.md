---
title: CLI & Build
description: Reference for the moonwell CLI commands, exit codes, build pipeline stages, and development vs. release builds.
---

The `moonwell` command-line tool (`Moonwell.Cli`) compiles your C# map project, generates Warcraft III object data and Lua script, stages the map folder, and packs the playable `.w3x` archive.

## Synopsis

```powershell
moonwell build [folder] [--release]
moonwell run [folder] [--release] [--game <exe>]
moonwell --version
```

## Commands and options

### `moonwell build [folder] [--release]`

Builds the map project and writes both the staged map directory (`build\<Name>\`) and the packed map archive (`build\<Name>.w3x`).

| Argument / Option | Default | Description |
| --- | --- | --- |
| `[folder]` | `.` (current directory) | Path to the map project folder or directly to its `.csproj` file. |
| `--release` | `false` | Builds with the `Release` configuration instead of `Debug` (omits `DEBUG`, runtime argument checks, on-screen exception messages, and Lua comments). |

### `moonwell run [folder] [--release] [--game <exe>]`

Runs a full `moonwell build` and, if the build succeeds, launches Warcraft III directly into the built `.w3x` archive.

| Argument / Option | Default | Description |
| --- | --- | --- |
| `[folder]` | `.` (current directory) | Path to the map project folder or directly to its `.csproj` file. |
| `--release` | `false` | Builds in `Release` mode before launching the game. |
| `--game <exe>` | `C:\Program Files (x86)\Warcraft III\_retail_\x86_64\Warcraft III.exe` | Path to the Warcraft III executable. |

When launching Warcraft III, `moonwell run` passes:

```text
-launch -windowmode windowed -loadfile "<full-path-to-build\Name.w3x>"
```

### `moonwell --version`

Prints the installed `Moonwell.Cli` version (for example, `0.1.2`) and exits.

## Exit codes

| Exit code | Meaning |
| --- | --- |
| `0` | Build done, `run` launched Warcraft III, or `--version` printed. |
| `1` | Build error, analyzer error (`MW0001`–`MW0006`), object declaration failure, or missing game executable. |
| `2` | Anything not understood on the command line (prints the usage and exits `2`). |

## Build pipeline

When you run `moonwell build` or `moonwell run`, `Moonwell.Build` executes the following steps in order:

1. **Locate project and base map:**
   - Finds the single `.csproj` in the target folder and verifies that `map\war3map.w3i` exists.
2. **Compile C# (`dotnet build`):**
   - Runs `dotnet build -c Debug` (or `-c Release` with `--release`), which also runs `Moonwell.Analyzers` (`MW0001`–`MW0006`).
3. **Verify NuGet package sources (`PackageSources.Check`):**
   - Verifies that every referenced `Moonwell*` package exists in `~/.nuget/packages` alongside its bundled `contentFiles/cs/any/` source files (which CSharp.lua compiles into the map script).
4. **Evaluate `Map` and declared objects (`MapLoadContext`):**
   - Scans the compiled assembly (`SetterScan`) to ensure no declared object properties or mutating collection methods (`Add`, `Remove`, `Set`) are called outside a constructor.
   - Loads the assembly in an isolated `AssemblyLoadContext`, instantiates the single `Map` subclass, and runs each non-abstract object class constructor against the standard object tables for the map's `DataSet` and `DataVersion`.
   - Rejects any constructor that calls a `Moonwell.Natives` function, naming the exact C# file and line.
5. **Assign and validate object ids (`ids.json`):**
   - Reads and updates `ids.json` in the project root.
   - Assigns deterministic four-character ids (`H001`, `h001`, `I001`, `A001`, `B001`, `D001`, `R001`...) to newly declared classes, validates `[ObjectId("...")]` attributes, and checks for duplicate `[Replaces]` declarations. If a class appears to have been renamed, stops the build when the old id is placed in the map (`war3mapUnits.doo` or `war3map.doo`), or prints a warning suggesting `[ObjectId("...")]` and gives a new id otherwise.
   - For each declared `StandardBuff`, generates a carrier ability (`Aasl` Slow Aura base with `abuf:1`, `atar:1 = "self"`, and `aare:1 = 1f`, hidden at run time with `BlzUnitHideAbility`) so the buff's icon and art appear in-game.
6. **Generate C# glue (`build\generated\`):**
   - Writes `build\generated\MapMain.g.cs` (`Moonwell.Generated.MapMain.Main()`), which calls `Runtime.Start(new <MapClass>(), ObjectRegistry.Register)`.
   - Writes `build\generated\ObjectRegistry.g.cs` (`ObjectRegistry.Register()`), which registers every declared unit, item, destructable, ability, buff carrier, upgrade, and doodad with `ObjectTypes` (or deletes `ObjectRegistry.g.cs` and `ObjectStubs.g.cs` when the map does not reference `Moonwell.Objects`).
   - Writes `build\generated\ObjectStubs.g.cs` holding stubs of the `Moonwell.Objects` classes the map uses, with only the members the map's assembly names. CSharp.lua compiles these instead of the library's generated classes, which it skips (they sit inside `#if !MOONWELL_LUA`).
7. **Check string literals and mark C# lines:**
   - Scans user `.cs` files (`LiteralCheck`) for C# string escapes or literal forms that CSharp.lua miscompiles.
   - Copies user source files into a temporary shadow project and inserts a comment marker `/*[[--@mw <file>:<line>]]*/` before each statement. The build turns these markers into the `MoonwellLines` table so runtime error reports point to the exact C# file and line.
8. **Compile C# to Lua and write the map (`build\<Name>\` and `build\<Name>.w3x`):**
   - Compiles the shadow project to `war3map.lua` via War3Net / CSharp.lua using `common.j` and `Blizzard.j` from `Documents\Warcraft III\JassHelper`.
   - Links the Lua class definitions for only the `Moonwell.Objects` standard classes referenced by the map, and appends the `MoonwellObjectValues` and `MoonwellLines` tables.
   - Copies `map\` (including `war3map.wts` unchanged), writes the updated `war3map.w3i` and the generated object files (`war3map.w3u`, `.w3t`, `.w3b`, `.w3d`, `.w3a`, `.w3h`, `.w3q` and their `war3mapSkin.*` counterparts), and copies `assets\` into `build\<Name>\`, then packs `build\<Name>.w3x`.

## Development vs. release builds

| Feature | Development (`moonwell build`) | Release (`moonwell build --release`) |
| --- | --- | --- |
| MSBuild configuration | `Debug` (`DEBUG` symbol defined) | `Release` |
| Runtime argument checks (`Dev.Check`) | Enabled (checks for: a component already on an actor or not on this one; an owned object adopted twice; a buff `Duration`/`Tick` below 0; `Timer.After` seconds below 0 or `Timer.Every` seconds not above 0) | Stripped |
| Lua comments in `war3map.lua` | Preserved | Stripped |
| On-screen error message | `\|cffff4040Moonwell: <Class>.<Hook> failed:\|r <message> (<file>:<line>)` | `\|cffff4040Moonwell: <Class>.<Hook> failed\|r (<file>:<line>)` |
| Log file (`CustomMapData\Moonwell\log.txt`) | Written | Written |

### Runtime error reporting and log file

When a reaction method or timer callback throws an exception at run time:

1. Moonwell catches the exception so other reactions and timers continue to run.
2. In development builds, Moonwell displays the failing class, hook name, C# source file and line, and exception message on screen for 30 seconds; in release builds, the exception message is omitted from the on-screen notice.
3. Moonwell appends a detailed entry (including the caller C# file and line where a failing timer was scheduled) to:
   ```text
   Documents\Warcraft III\CustomMapData\Moonwell\log.txt
   ```
   The log file keeps up to 200 lines per session and is written through `PreloadGenEnd`.
4. If the same reaction site throws repeatedly (for example, inside a fast periodic timer), Moonwell reports occurrences `1`, `10`, `100`, `1000`, and so on (powers of ten) to avoid flooding the screen and log.
