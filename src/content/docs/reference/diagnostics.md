---
title: Diagnostics & Errors
description: Reference for Moonwell.Analyzers diagnostics (MW0001–MW0006), sync attributes, C# string literal build checks, and build errors.
---

## Multiplayer analyzer diagnostics (`MW0001`–`MW0006`)

`Moonwell.Analyzers` runs automatically during `dotnet build` and `moonwell build`. All six rules have severity `Error`.

| ID | Message | Where it triggers |
| --- | --- | --- |
| `MW0001` | `'X' creates a handle; inside Local.For it runs on one machine only, which desyncs the game` (variants: `'X' changes game state; ...` and, for untagged members, `'X' may change game state (it is not marked ...`) | Inside `Local.For` or a `[MachineLocal]` method |
| `MW0002` | `'X' gives a different answer on each machine; use it only inside Local.For or a [MachineLocal] method` | Outside `Local.For` and `[MachineLocal]` methods |
| `MW0003` | `Handle ids differ between machines; key by the handle itself, or by a number the map assigns` | Anywhere in map code (`GetHandleId`, `GetHandleIdBJ`) |
| `MW0004` | `A Dictionary loops in no fixed order, which can differ between machines; use OrderedMap or OrderedSet` (or `A HashSet ...`) | Looping over or converting `Dictionary<,>` or `HashSet<>` to `IEnumerable` |
| `MW0005` | `'double' is a single-precision float in the game's Lua; use float` (also `'long' is a 32-bit integer in the game's Lua; use int` and `'uint' arithmetic becomes a float in the game's Lua; use int`) | Variables, parameters, return types, or uncast calls returning `long`, `ulong`, `uint`, or `double` |
| `MW0006` | `'X' changes the game inside its own GetLocalPlayer() block, so it desyncs wherever it runs` | Calling a `[Desyncs]` function such as `SelectGroupForPlayerBJ` |

### `MW0001` — State change or handle creation inside `Local.For`

```csharp
// Rejected (MW0001):
Local.For(player, () =>
{
    Unit.Create<Footman>(player, 0, 0, 0);
});

// Fix: create handles and mutate state outside Local.For, and keep only local camera/UI/sound work inside Local.For
Unit unit = Unit.Create<Footman>(player, 0, 0, 0);
Local.For(player, () =>
{
    Natives.PanCameraToTimed(0, 0, 0);
});
```

### `MW0002` — Machine-local read outside `Local.For`

```csharp
// Rejected (MW0002):
int width = Natives.BlzGetLocalClientWidth();

// Fix: call inside Local.For or mark the helper method [MachineLocal]
Local.For(player, () =>
{
    int width = Natives.BlzGetLocalClientWidth();
});
```

### `MW0003` — `GetHandleId` / `GetHandleIdBJ`

```csharp
// Rejected (MW0003):
int id = Natives.GetHandleId(unit.Handle);

// Fix: key collections by the handle or Moonwell actor directly
OrderedMap<Unit, int> stacks = new();
stacks[unit] = 3;
```

### `MW0004` — Non-deterministic `Dictionary` or `HashSet` iteration

```csharp
// Rejected (MW0004):
Dictionary<Player, int> scores = new();
foreach (var pair in scores) { }

// Fix: use OrderedMap<TKey, TValue> or OrderedSet<T>
OrderedMap<Player, int> scores = new();
for (int i = 0; i < scores.Count; i++)
{
    Player p = scores.KeyAt(i);
    int score = scores.ValueAt(i);
}
```

### `MW0005` — 64-bit or unsigned numbers (`long`, `ulong`, `uint`, `double`)

```csharp
// Rejected (MW0005):
double dist = Math.Sqrt(dx * dx + dy * dy);

// Fix: use int and float, and cast double-returning math calls immediately to float or int
float dist = (float)Math.Sqrt(dx * dx + dy * dy);
```

### `MW0006` — Desyncing `Blizzard.j` functions

```csharp
// Rejected (MW0006):
Natives.SelectGroupForPlayerBJ(group, player.Handle);

// Fix: select unit by unit inside Local.For (ForGroup inside Local.For is rejected with MW0001)
Local.For(player, () =>
{
    Natives.ClearSelection();
    Natives.SelectUnit(unit.Handle, true);
});
```

---

## Sync attributes (`namespace Moonwell`)

| Attribute | Targets | Meaning |
| --- | --- | --- |
| `[CreatesHandle]` | Method, Property, Constructor | Marks a native or member that allocates a Warcraft III handle (forbidden inside `Local.For` — `MW0001`). |
| `[ChangesState]` | Method, Property, Constructor | Marks a native or member that mutates synchronized game state (forbidden inside `Local.For` — `MW0001`). |
| `[MachineLocal]` | Method, Property, Constructor | Marks a native or helper member that reads machine-local state (must only be called inside `Local.For` or another `[MachineLocal]` method — `MW0002`). |
| `[Desyncs]` | Method, Property, Constructor | Marks a `Blizzard.j` helper that desyncs on its own (`MW0006`). |
| `[LocalSafe]` | Class, Method, Property, Constructor | Marks a Moonwell runtime type or member as safe to call inside `Local.For`. |
| `[SyncUnchecked]` | Method, Constructor, Property | Suppresses `MW0001`–`MW0006` inside the attributed member, or on a lambda/local function. |

---

## C# string literal build checks

CSharp.lua translates C# string literals directly into Lua string literals, where several C# escape sequences and literal forms have different meanings or fail to parse. `Moonwell.Build` scans your `.cs` files before Lua compilation and stops with the exact file and line if it finds any of the following:

| Rejected C# string construct | Why it is rejected | What to write instead |
| --- | --- | --- |
| `\e` | Lua does not recognize `\e` (`0x1B`). | Write `\u001b`. |
| `\Uxxxxxxxx` | CSharp.lua does not convert 8-digit `\U` escapes. | Write the character itself. |
| `\x` not followed by 2 hex digits (e.g., `\x9`) | Lua's `\x` requires exactly two hex digits (`\x09`). | Write a 4-digit `\uXXXX` escape (e.g., `\u0009`). |
| `\0` followed by a digit (`0`–`9`) | Lua reads `\0` + digits as a multi-digit decimal byte escape (`\01`). | Write `\u0000` before a digit. |
| Plain raw string literals (`"""..."""`) | CSharp.lua strips the outer quotes without unindenting or escaping inner quotes (raw *interpolated* strings such as `$"""{x}"""` are allowed). | Use a regular `"..."` or verbatim `@"..."` string (or a raw interpolated string `$"""{x}"""`). |
| UTF-8 string literals (`"..."u8`) | CSharp.lua emits the `u8` suffix into Lua where it is a syntax error. | Use a regular `string` or `byte[]`. |
| Verbatim string `@"..."` starting with `\r\n` | Lua long strings `[[...]]` strip an immediate leading newline after `[[`. | Write that line end as `"\r\n" + ...` or start the text on the first line after `@"`. |

---

## Common build errors

| Message | Cause and fix |
| --- | --- |
| `Map.cs:9: MyMap.BadUnit calls the game while it is declared; game work starts from a reaction or the game's start` | A constructor called the game. Move the call into a reaction such as `OnGameStart`. |
| `MyMap.Smite.OnCast sets Name; declared fields are set only in the constructor` | A declared field, `ObjectList.Add/Remove`, `ObjectRef.Set` or `Set(...)` was used outside a constructor. |
| `MyMap.X's constructor threw: StormBolt has no field Hbz1, which other abilities have` | `Set` named another ability's field. |
| `MyMap.X's constructor threw: StandardUnit field uhpm holds int, not float` | `Set` was given the wrong value type. |
| `... holds Levels<float>, not float; give the value of one level with Set(field, level, value)` | A per-level field was set without a level. |
| `no map class: declare one class that derives from Moonwell.Map` / `more than one map class: A, B` | The project needs exactly one class deriving from `Map`. |
| `MyMap.P.Main: a map declares no Main; the build writes it` | Remove your own `Main`. |
| `A and B both replace Moonwell.Objects.Units.Human.Footman` | Two `[Replaces]` classes have the same base. |
| `MyMap.X replaces hfoo and cannot pin an id` | `[Replaces]` together with `[ObjectId]`. |
| `MyMap.Old was H001, which the map places, and no class declares it now; if it was renamed to MyMap.New, add [ObjectId("H001")] to MyMap.New` | A class was renamed and its id is placed in the map. Add the `[ObjectId]` it names. Don't edit `ids.json`. |
| `common.j and Blizzard.j are not in <folder>` | Put `common.j` and `Blizzard.j` in `Documents\Warcraft III\JassHelper`. |
| `<package> <version> has no source in <folder>; CSharp.lua reads packages only from there (is NUGET_PACKAGES set?)` | Unset `NUGET_PACKAGES`. |
