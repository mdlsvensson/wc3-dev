---
title: "Using the library"
description: "Add wc3-lib to a map and use only the systems you need, with no cost for the rest."
---

[wc3-lib](https://github.com/mdlsvensson/wc3-lib) (`@mdlsvensson/wc3-lib` on JSR) is a set of
Warcraft III systems for maps built with this framework: a fixed-step scheduler, script buffs and
auras, dummy casters, a damage pipeline, missiles and knockback, save codes and time helpers.

It is **opt-in**. Nothing is added to your map until your code imports it, and nothing runs until
your code starts it:

- **Script size:** only the library files your code imports are compiled into `war3map.lua`. A
  system you don't import adds 0 bytes.
- **Runtime:** importing a module calls no natives. A system creates its triggers, timers and
  groups only when you call its `start()`, `create…()` function or constructor. The template's
  `src/main.ts` doesn't use the library, and the framework never starts anything on your behalf.

## 1. Add the dependency

```powershell
deno add --frozen=false jsr:@mdlsvensson/wc3-lib
```

(`--frozen=false` lets `deno add` update the template's frozen `deno.lock`. Deno only resolves
versions published at least a day ago; to take a newer one right away, add `--minimum-dependency-age=0`.) Then list the package
in `config.json`, so the build compiles it into the map:

```json
{
  "mapFolder": "map.w3x",
  "libraries": ["@mdlsvensson/wc3-lib"]
}
```

The next `deno task build`, `deno task test` or `deno task typecheck` copies the library's
TypeScript sources into `.lib/@mdlsvensson/wc3-lib/` and adds its entry points to `tsconfig.json`
`paths`. You can also run it yourself with `deno task lib:sync`. Keep in mind:

- **`.lib/` is git-ignored.** It is recreated from `deno.lock`, so commit `deno.json`, `deno.lock`,
  `config.json` and `tsconfig.json`, not `.lib/`.
- **The `paths` entries don't contain the version**, so upgrading the library doesn't change
  `tsconfig.json`.
- **Sync only runs when something changed** (the list in `config.json` or the version in
  `deno.lock`). It needs network access only then. Files are checked against JSR's checksums.
- **Your editor resolves imports through `paths`**, so go-to-definition opens the library's
  TypeScript source in `.lib/`.

Why a copy? TypeScriptToLua has to compile the library's TypeScript as part of your map, so that
it can leave out what you don't import. Deno's own cache stores JSR files under hashed names that
TypeScript can't resolve. The library is never listed in `tsconfig.json` `include`: anything listed
there is compiled into the map whether it's imported or not.

## 2. Import a feature

Import one entry point per feature. Each pulls in only what that feature needs:

| Import `@mdlsvensson/wc3-lib/…` | Gives you |
| --- | --- |
| `core` | `Scheduler`, `startWarcraftClock` |
| `core/scope`, `core/signal` | `Scope`, `Signal` |
| `buffs` | `BuffStore`, `trackWarcraftBuffTargets` |
| `buffs/aura` | `Aura` |
| `dummy` | `DummyManager`, `createWarcraftDummies` |
| `damage` | `createWarcraftDamage`, `DamageSystem`, `isLethal` |
| `physics/knockback` | `KnockbackSystem`, `knockbackVelocity`, `WarcraftKnockbackPort` |
| `physics/missile` | `MissileSystem`, `WarcraftMissilePort`, `WarcraftMissileVisual` |
| `physics/geometry`, `physics/warcraft-terrain` | `turnToward` and vector helpers; `WarcraftTerrain` |
| `persistence/codec`, `persistence/local-file`, `persistence/sync` | save codes; Preload files; multiplayer sync |
| `time`, `time/warcraft` | calendar and formatting; `readWarcraftUtc` |

Every file is also importable on its own, for example `@mdlsvensson/wc3-lib/damage/system` for the
pure damage pipeline with your own port. There is deliberately no barrel for the whole library, or
for `physics` or `persistence`: each would pull in systems you may not use.

Check what went into your map with:

```powershell
deno task build
Select-String -Path dist/tstl_output.lua -Pattern '^\["'
```

A map that imports only knockback lists `core.scheduler` (if you use the scheduler) and the
`physics` knockback modules, and no damage, buffs, missile or persistence modules.

## 3. Create it and own it with a Scope

Create each system in your own start-up code and give it an owner. `Scope` releases everything it
owns in reverse order, and keeps going if one release fails:

```ts title="src/runtime.ts"
import { Scheduler, startWarcraftClock } from "@mdlsvensson/wc3-lib/core";
import { Scope } from "@mdlsvensson/wc3-lib/core/scope";
import { BuffStore, trackWarcraftBuffTargets } from "@mdlsvensson/wc3-lib/buffs";
import { createWarcraftDamage } from "@mdlsvensson/wc3-lib/damage";
import { KnockbackSystem, WarcraftKnockbackPort } from "@mdlsvensson/wc3-lib/physics/knockback";

export function startRuntime() {
  const report = (context: string, error: unknown) => print(`|cffff4040[${context}]|r ${tostring(error)}`);
  const clock = new Scheduler(1 / 32, error => report("clock", error));
  const scope = new Scope(error => report("dispose", error));

  const buffs = scope.add(new BuffStore<unit>(clock));
  scope.own(trackWarcraftBuffTargets(buffs, clock));

  const damage = scope.add(createWarcraftDamage<{ kind: string }>({
    onError: issue => report(`damage:${issue.code}`, issue.error ?? ""),
  }));

  const knockback = scope.add(new KnockbackSystem<unit>(new WarcraftKnockbackPort({ pathing: "terrain-point" })));
  scope.own(clock.every(clock.stepSeconds, () => knockback.update(clock.stepSeconds)));

  // Natives last: only these two allocate handles.
  damage.start();                        // damage triggers, 2 per player
  scope.own(startWarcraftClock(clock));  // the one 1/32 s timer

  return {
    clock, buffs, damage, knockback,
    dispose() { scope.dispose(); clock.dispose(); },
  };
}
```

```ts title="src/main.ts"
import { W3TS_HOOK, addScriptHook } from "w3ts/hooks";
import { startRuntime } from "./runtime";

addScriptHook(W3TS_HOOK.MAIN_AFTER, () => {
  const runtime = startRuntime();
  runtime.damage.beforeArmor(ctx => {
    if (runtime.buffs.has(ctx.target, "stone-skin")) ctx.amount *= 0.5;
  });
});
```

Leave out any line you don't need. Without the `damage` lines, for example, the damage system isn't
compiled into the map and no damage triggers exist.

## 4. Why nothing starts automatically

The library could create a global clock or damage system when it's imported, but then every map
that imports it would pay for it. The damage system alone registers two triggers per player and
runs code on every hit. So the rules are:

- importing never allocates, registers or calls a native (the library's tests load every module in
  a Lua VM with every Warcraft native replaced by one that throws);
- there are no global singletons: you create each system and choose its owner;
- start-up order is visible in your own code, top to bottom.

Code at the top level of a module also runs during map initialisation, sometimes before natives are
safe to use. Explicit starts keep all of that inside `MAIN_AFTER`.

## Writing code for Lua

Your map and the library are compiled to Lua 5.3 by TypeScriptToLua 1.31. A few things don't mean
the same there as in JavaScript. `deno task lint` checks your `src/` for the three most common ones:

| Rule | Catches |
| --- | --- |
| `lua-no-finally` | `finally`, which TypeScriptToLua 1.31 miscompiles. Use `try { … } catch (e) { cleanup(); throw e; } cleanup();` |
| `lua-loop-closure` | Closures over a `for (let i …)` variable: every closure sees the last value. Copy it first (`const index = i;`) |
| `lua-truthiness` | A number or string on the left of `\|\|`, `&&` or under `!`: `0` and `""` are truthy in Lua |

Warcraft's Lua also has 32-bit numbers and `NaN == NaN` is true. See the library's
[AGENTS.md](https://github.com/mdlsvensson/wc3-lib/blob/main/AGENTS.md) for the full list.

## Run the library's in-game testbed

The library ships a testbed that exercises every system through chat commands. Build and launch
it instead of your `src/main.ts`:

```powershell
deno task test --entry .lib/@mdlsvensson/wc3-lib/testbed/main.ts
```

In game, type `-help`, then `-selftest` (17 checks in Warcraft's own Lua), and the other commands
it lists. `--entry` works for `deno task build` too, and your `src/main.ts` is unchanged. The
testbed uses only built-in units and abilities, so it runs in the template map.

## Work on the library next to your map

To change the library and see the result in your map, check out both repositories and link the
library from your map's `deno.json`:

```json
{
  "links": ["../wc3-lib"]
}
```

Run `deno install --frozen=false` once after adding the link. While linked, every build copies the
library from your checkout, leaving out what the package doesn't publish (tests, tools). Remove the
link and run `deno install --frozen=false` again to go back to the published version.

## Upgrade or remove

- **Upgrade:** `deno add --frozen=false jsr:@mdlsvensson/wc3-lib@<version>`. The next build
  re-syncs `.lib/`.
- **Remove:** delete it from `config.json` `libraries` and run `deno task lib:sync`. This removes
  `.lib/` and the library's `paths` entries. Then `deno remove --frozen=false @mdlsvensson/wc3-lib`.
