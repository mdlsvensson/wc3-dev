---
title: Wrappers and systems
description: Add Moonwell's optional Lua wrappers and gameplay systems with explicit ownership and cleanup.
---

Moonwell bundles only the modules your map imports. Two optional libraries add
annotated Lua 5.3 APIs with editor completion:

- [moonwell-wrappers](https://github.com/mdlsvensson/moonwell-wrappers) **v0.9.1**
  wraps Warcraft handles and provides damage events, sync, and input modules.
- [moonwell-systems](https://github.com/mdlsvensson/moonwell-systems) **v0.5.1**
  provides scheduling, ownership, buffs, damage, movement, and save files.
  The port from wc3-lib is complete.

Systems needs wrappers v0.7.0 or later and Moonwell 0.5.2 or later. These
examples use current tags with Moonwell 0.9.1. The libraries' in-game gates
passed on Reforged 3.0.0.24268; multiplayer checks remain deferred until before
Moonwell 1.0.

## Add libraries

Change the `libraries` block in your committed manifest:

```pkl title="moonwell.pkl · libraries"
libraries {
  ["wrappers"] { github = "mdlsvensson/moonwell-wrappers"; tag = "v0.9.1" }
  ["systems"] { github = "mdlsvensson/moonwell-systems"; tag = "v0.5.1" }
}
```

Declare both when using systems: libraries cannot declare transitive
dependencies. A wrappers-only map can omit systems. Run `moonwell check` to
download and synchronize them, then commit the resulting **`moonwell.lock`**.
It records each tag's commit; a moved tag fails instead of silently changing
your map's code. Upgrade by changing `tag` and checking again.

Both current libraries describe their own `src/` module folder in
`moonwell-library.json`, so no `dir = "src"` is needed. Older tags without
that metadata need `dir` in the manifest. The configuration key names a cache
folder; actual imports follow paths in the library, such as `wrappers.unit`.

## Spawn a unit with wrappers

```text title="src/main.yue · YueScript"
import "moonwell" as mw
import "moonwell.macros" as {:$FourCC}
import "wrappers.player" as Player
import "wrappers.unit" as Unit
import "wrappers.timer" as Timer

mw.on_main ->
  footman = Unit.create Player.fromIndex(0), $FourCC("hfoo"), 0, 0, 270
  footman\setLife 250
  lifetime = Timer.create!
  lifetime\start 5, false, (self) ->
    footman\remove!
    self\destroy!
```

Factories use dot calls. Instance methods use `\` in YueScript and `:` in Lua.
Each module exports its own class table; there is no umbrella import or new
global. Native functions remain available through `getHandle()`:

```lua title="lua/demo.lua"
local Unit = require('wrappers.unit')
local Player = require('wrappers.player')

return {
    spawn = function()
        local footman = Unit.create(Player.fromIndex(0), FourCC('hfoo'), 0, 0, 270)
        SetUnitInvulnerable(footman:getHandle(), true)
        footman:remove()
    end,
}
```

Call `demo.spawn` from a startup hook or later gameplay. The module defines
the function without creating game objects while the map script loads.

## Handles and cleanup

`fromHandle(raw)` returns the live cached wrapper, or nil for nil. It does
not create a game object. Keep references to Unit, Item, and Destructable
wrappers when identity matters: those classes use weak caches. Other owned
classes remain cached until explicit cleanup; players remain for the session.

Use `remove()` for units, items, and destructables; `destroy()` for timers,
triggers, groups, effects and other owned handles. Repeated cleanup is harmless.
Most other methods reject disposed wrappers; `isDisposed()` and a widget's
`exists()` can answer after disposal. `kill()` is not removal: a unit corpse
or a dead hero waiting for revival still has a valid wrapper.

Destroy wrapped handles through the wrapper. A raw native destruction bypasses
tracking. Groups do not own their units, and effects do not own their targets.
Garbage collection never destroys game objects. Do not key weak tables with
widget wrappers for shared game state: each client's collection timing differs.

For units removed by the game, `Unit.sweep()` performs one cleanup scan.
`Unit.autoDispose(interval?)` starts a single repeating scan timer, defaulting
to 0.25 seconds, and returns a stop function. It is opt-in; importing Unit
starts nothing. Removed units become detectable after the removal frame, so
ask `unit\exists!` before using a unit held across time. Items and destructables
are not swept. See the [wrappers reference](https://github.com/mdlsvensson/moonwell-wrappers#readme)
for ownership exceptions such as game-owned frames.

## Own systems with a Scope

```text title="src/main.yue · YueScript"
import "moonwell" as mw
import "moonwell.macros" as {:$FourCC}
import "wrappers.player" as Player
import "wrappers.unit" as Unit
import "systems.scheduler" as Scheduler
import "systems.scope" as Scope

mw.on_main ->
  scope = Scope.new!
  clock = scope\add Scheduler.new!
  scope\own clock\start!
  scope\add Unit.create Player.fromIndex(0), $FourCC("hfoo"), 0, 0, 270
  clock\every 1, -> print "tick", clock\getElapsed!
  clock\after 5, -> scope\dispose!
```

`Scope.add` owns an object's `dispose`, `destroy`, or `remove` method, checked
in that order. `Scope.own` owns a release function. Disposal releases in reverse
order, once: here it removes the unit, stops the clock, and disposes the
scheduler. The scheduler cancels its pending tasks when disposed.

Systems start explicitly and have idempotent cleanup. Importing a module calls
no native and creates nothing. Scheduler delays round up to ticks; equal due
times run in creation order. A failing task or callback is isolated so others
continue, with errors sent to an optional `onError` callback or printed.

## Available systems

| Modules | Purpose |
| --- | --- |
| `systems.scheduler`, `systems.signal`, `systems.scope`, `systems.time` | Deterministic scheduling, events, ownership, and time helpers |
| `systems.buffs`, `systems.aura`, `systems.dummy` | Script buffs, auras, and dummy casters |
| `systems.damage` | Damage pipeline built on wrapper damage events |
| `systems.geometry`, `systems.terrain` | Geometry and terrain helpers |
| `systems.missile`, `systems.knockback` | Missiles and knockback movement |
| `systems.codec`, `systems.sync`, `systems.savefile` | Encoding, synchronized data, and save files |

Use the [systems API reference](https://github.com/mdlsvensson/moonwell-systems#api-reference)
for options and complete examples. Warcraft numbers have game-specific limits;
local machine time, input, and file data need the libraries' synchronization
rules before influencing shared gameplay.

## Work on a local library

Keep checkouts next to the map and override their source in the ignored local
manifest:

```pkl title="moonwell.local.pkl"
amends "moonwell.pkl"

libraries {
  ["wrappers"] { path = "../moonwell-wrappers" }
  ["systems"] { path = "../moonwell-systems" }
}
```

`path` wins over `github`/`tag` and preserves the published lock entry. Module
and asset files are copied into `.moonwell/`, so errors may name the copy.
`dev` watches configured local libraries; restart it after adding one. Checks
and builds refresh the Lua editor view under `.moonwell/lua/`.

To remove a library, remove its imports and manifest entry, then check and build.
To return from a local checkout to a published tag, remove the `path` override;
the retained lock still checks that tag's commit.
