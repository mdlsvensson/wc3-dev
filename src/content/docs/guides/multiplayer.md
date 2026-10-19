---
title: Multiplayer
description: Write desync-free multiplayer maps with Local.For, deterministic collections, and Moonwell's compile-time Roslyn analyzer.
---

Warcraft III runs your map script on every player's machine in lockstep. If one machine creates a handle, changes game state, iterates a table in a different order, or branches on a machine-local value that other machines did not see, that player's game diverges and drops with a **desync**.

Moonwell catches the common causes of desyncs at compile time with `Moonwell.Analyzers` (`MW0001`–`MW0006`).

## Machine-local code with `Local.For`

Sometimes you want to pan the camera, play a sound, show a floating message, or update a custom UI frame for only one player. Wrap that work in `Local.For(player, () => ...)`:

```csharp
using Moonwell;

public class QuestAlert : GameComponent
{
    public void Notify(Player player, float x, float y, string message)
    {
        Local.For(player, () =>
        {
            Natives.PanCameraToTimed(x, y, 0.5f);
            Natives.ClearTextMessages();
            Natives.DisplayTimedTextToPlayer(player.Handle, 0, 0, 5f, message);
        });
    }
}
```

At run time, `Local.For(player, action)` checks `GetLocalPlayer() == player.Handle` and runs `action` only on that player's machine.

### What is allowed inside `Local.For`

Inside a `Local.For` callback (or a `[MachineLocal]` helper method), every call is checked by `Moonwell.Analyzers`:

1. **Untagged natives** — read-only queries (`GetUnitX`, `GetUnitY`, `GetWidgetLife`) and local visual, camera, sound, or UI frame natives (`PanCameraToTimed`, `StartSound`, `BlzFrameSetVisible`, `BlzGetLocalClientWidth`) are allowed.
2. **`[LocalSafe]` Moonwell members** — read-only properties and lookups such as `unit.Handle`, `unit.Player`, `player.Slot`, `actor.Get<T>()`, `actor.Has<T>()`, `cast.Caster`, `damage.Amount` (getter), `OrderedSet<T>`, and `OrderedMap<TKey, TValue>` are marked `[LocalSafe]` and allowed.
3. **Map helper methods** — the analyzer walks the call graph of your own methods, local functions, and lambdas. A helper method is allowed inside `Local.For` if everything it calls is also allowed inside `Local.For`.

### `[MachineLocal]` helper methods

If a helper method calls machine-local read natives (such as `BlzGetLocalClientWidth()` or `GetCameraTargetPositionX()`) that are only valid inside `Local.For`, mark the method with `[MachineLocal]`:

```csharp
using Moonwell;

public static class HudLayout
{
    [MachineLocal]
    public static float AspectRatio()
    {
        return (float)Natives.BlzGetLocalClientWidth() / Natives.BlzGetLocalClientHeight();
    }
}
```

A `[MachineLocal]` method is checked by the same rules as `Local.For` and can only be called from inside `Local.For` or another `[MachineLocal]` method.

## Compile-time rules (`MW0001`–`MW0006`)

### 1. No state changes or handle creation inside `Local.For` (`MW0001`)

Creating a handle (`CreateUnit`, `AddSpecialEffect`, `CreateTimer`, `Location`, `Unit.Create`, `Timer.After`) or changing game state (`SetUnitX`, `KillUnit`, `UnitAddAbility`, `unit.Add`, `unit.Apply`, `Owned.End`) on only one machine desyncs the handle table or simulation immediately.

```csharp
// Error MW0001: 'AddSpecialEffect' creates a handle; inside Local.For it runs on one machine only, which desyncs the game
Local.For(player, () =>
{
    Natives.AddSpecialEffect(@"Abilities\Spells\Human\Thunderclap\ThunderClapCaster.mdl", x, y);
});
```

### 2. No machine-local reads outside `Local.For` (`MW0002`)

Natives marked `[MachineLocal]` return values that differ from one machine to another — such as `GetLocalPlayer`, `BlzGetLocalClientWidth`, `BlzGetLocalClientHeight`, `BlzGetLocale`, `GetCameraTargetPositionX`, `GetCameraEyePositionX`, and `BlzGetTriggerPlayerMouseX`. Calling them in shared code risks branching or mutating game state on a value that other machines don't share.

```csharp
// Error MW0002: 'BlzGetLocalClientWidth' gives a different answer on each machine; use it only inside Local.For or a [MachineLocal] method
int width = Natives.BlzGetLocalClientWidth();
```

Call them inside `Local.For` or a `[MachineLocal]` method where game state cannot be modified.

### 3. No `GetHandleId` (`MW0003`)

Handle ids can differ between machines (the usual explanation is that each machine frees ids on its own). Calling `GetHandleId` or `GetHandleIdBJ` is rejected with `MW0003`.

In C#, handle objects (`unit`, `item`, `player`, `timer`, etc.) and Moonwell actors (`Unit`, `Item`, `Player`, etc.) can be used directly as keys in `OrderedMap<TKey, TValue>` or `Dictionary<TKey, TValue>`, and `Unit.Of(handle)` / `Item.Of(handle)` / `Destructable.Of(handle)` wrap handles directly without `GetHandleId`.

### 4. Deterministic iteration with `OrderedMap` and `OrderedSet` (`MW0004`)

In Lua, `pairs()` over a table visits entries in no fixed order, which can differ between machines. Because `Dictionary<TKey, TValue>` and `HashSet<T>` compile to Lua tables, `Dictionary` and `HashSet` point lookups (`dict[key]`, `dict.TryGetValue`, `set.Contains`, `Count`) are safe, **but looping over them (`foreach`), calling `.GetEnumerator()`, or passing them to `IEnumerable<T>` / LINQ is rejected with `MW0004`**.

Use `OrderedMap<TKey, TValue>` and `OrderedSet<T>` whenever you need to iterate over a collection in deterministic insertion order:

```csharp
using Moonwell;

public class WaveTracker : GameComponent
{
    private readonly OrderedSet<Unit> _alive = new();
    private readonly OrderedMap<Player, int> _scores = new();

    public void RegisterWaveUnit(Unit unit)
    {
        _alive.Add(unit);
    }

    public void AwardKill(Player killer)
    {
        _scores.TryGetValue(killer, out int current);
        _scores[killer] = current + 1;

        for (int i = 0; i < _scores.Count; i++)
        {
            Player player = _scores.KeyAt(i);
            int score = _scores.ValueAt(i);
            // Visits entries in exact insertion order on every machine
        }
    }
}
```

When looping over an `OrderedSet<T>` while reactions inside the loop might add or remove elements, iterate by index or over `_alive.Snapshot()`.

### 5. 32-bit `int` and `float` numbers (`MW0005`)

Warcraft III's Lua runtime uses 32-bit signed integers and 32-bit single-precision IEEE 754 floats. Using `long`, `ulong`, `uint`, or `double` in map code silently truncates precision or overflows differently from .NET, so `MW0005` rejects them.

Use `int` and `float` instead. Calling a .NET math helper that returns `double` is allowed when you cast its return value immediately to `float` or `int`:

```csharp
float distance = (float)Math.Sqrt(dx * dx + dy * dy);
float angle = (float)Math.Atan2(dy, dx);
```

### 6. No desyncing `Blizzard.j` helpers (`MW0006`)

Some `Blizzard.j` functions desync on their own because they mutate state or call `ClearSelection()` inside an internal `GetLocalPlayer()` check (for example, `SelectGroupForPlayerBJ`). Calling a `[Desyncs]` function is rejected with `MW0006`. Select or clear units inside `Local.For(player, () => ...)` using the local-safe selection natives instead.

## Opting out with `[SyncUnchecked]`

If you have verified by hand that a method, constructor, property, lambda, or local function is safe across all machines, apply `[SyncUnchecked]` to silence `MW0001`–`MW0006` within that scope:

```csharp
using Moonwell;

public static class LocalEffects
{
    [SyncUnchecked]
    public static void SpawnLocalModel(Player toPlayer, string modelPath, float x, float y)
    {
        string path = "";
        if (Natives.GetLocalPlayer() == toPlayer.Handle)
        {
            path = modelPath;
        }
        Natives.DestroyEffect(Natives.AddSpecialEffect(path, x, y));
    }
}
```

See [Diagnostics & Errors](/reference/diagnostics/) for the full reference of `MW0001`–`MW0006` and all six sync attributes.
