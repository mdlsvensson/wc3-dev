---
title: Make your first map with Moonwell
description: Define a Pkl unit, spawn it from YueScript, and iterate on your map.
---

Start with a working [installation](/moonwell/docs/installation/). This guide
adds a Vanguard unit to the template and spawns it with Warcraft natives;
the optional wrappers and systems are not required.

## 1. Define a custom unit

Create `objects/vanguard.pkl`:

```pkl title="objects/vanguard.pkl"
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

`hfoo` is the standard Footman. `h001` is the new object's rawcode; choose
another if your map already uses it. The category key `vanguard` names the
object in gameplay code. Unset fields keep the base object's values.

The template already merges all object files through these lines in
`moonwell.pkl`; keep them when reorganizing definitions:

```pkl title="moonwell.pkl · object imports"
import "@moonwell/Objects.pkl"
objects = Objects.merge(import*("objects/**.pkl"))
```

## 2. Spawn the Vanguard

Replace the template's demo gameplay with:

```text title="src/main.yue · YueScript"
import "moonwell" as mw
import "generated.objects" as objects

mw.on_main ->
  CreateUnit Player(0), objects.units.vanguard, 0, 0, 270
```

The build generates `src/generated/objects.yue`. `objects.units.vanguard`
is already an integer ID suitable for `CreateUnit`; do not wrap it in `FourCC`
or read an `.id` field. Player IDs are zero-based, so `Player(0)` is Player 1
in the editor. The unit appears at the map origin; adjust the coordinates to
a playable part of your map.

Create game objects inside `mw.on_main`, after editor initialization. Module
top-level code runs when the map script loads. Other available hooks are
`before_config`, `on_config`, and `before_main`.

## 3. Build and play

```powershell
moonwell build
moonwell check
moonwell test
```

`build` and `test` update the generated IDs and apply your objects to a staged
copy. Commit `src/generated/objects.yue` with the Pkl definitions. `check`
fails if those IDs are stale; it does not regenerate them. `objects:eval`
prints validated JSON for inspection, not the generated gameplay module.

The source map remains unchanged. World Editor's Object Editor will therefore
not show this Pkl unit in the source; open a built copy to inspect the injected
data. See [Object data](/moonwell/docs/object-data/) for levels and other categories.

## 4. Add gameplay modules

Split gameplay into `.yue` modules under `src/`. For example:

```text title="src/greetings.yue · YueScript"
return {
  announce: -> print "Welcome to the village."
}
```

```text title="src/main.yue · YueScript"
import "moonwell" as mw
import "greetings" as greetings

mw.on_main ->
  greetings.announce!
```

For handwritten Lua, put a module such as `lua/greetings.lua` under `lua/` and
import it by the same path-based name. `src/`, `lua/`, and libraries share one
module namespace: both of those greeting files cannot coexist. Only modules
reachable through `import` or `require` enter the bundle. Leave `src/**/*.lua`
for the editor extension's generated output.

For standard object IDs, use the compile-time macro:

```text title="YueScript · standard Footman"
import "moonwell.macros" as {:$FourCC}

-- Put this call inside a startup hook.
CreateUnit Player(0), $FourCC("hfoo"), 0, 0, 270
```

`$FourCC` accepts exactly four printable ASCII characters in a literal string,
without escapes or interpolation. Custom objects use their generated IDs.

## 5. Use World Editor globals

Editor-created regions, units, and variables appear as `gg_` and `udg_`
globals. Refer to the actual names in your source map's `war3map.lua`. After
an editor save, run `moonwell check` to refresh `.moonwell/types/` and catch
references to globals that no longer exist.

Unknown globals fail `check`, `build`, `test`, and `dev` by default. Declare
your own with YueScript's `global`, or list externally provided names in
`lint.globals`; avoid suppressing a typo that should be fixed.

## 6. Iterate

```powershell
moonwell dev
```

`dev` checks changes and refreshes object IDs. It watches gameplay, Pkl objects,
manifests, assets, preview pictures, and configured local libraries. It does
not rebuild an archive or launch Warcraft III. Run `build` for a distributable
map and `test` for a new playtest.

YueScript 0.34.3 supports floor division (`//`). Its Lua rewrite step still
rejects bitwise operators; put that code in a handwritten Lua module instead.
Normal builds report runtime errors with source files and lines; minified
YueScript loses line numbers. Lua modules remain unminified.

Continue with [assets](/moonwell/docs/assets/), [map settings](/moonwell/docs/map-settings/),
or [wrappers and systems](/moonwell/docs/library/).
