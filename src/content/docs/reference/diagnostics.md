---
title: Diagnostics & Errors
description: Reference for Moonwell.Analyzers diagnostics (MW0001–MW0006), sync attributes, C# string literal build checks, and build errors.
---

## Multiplayer analyzer diagnostics (`MW0001`–`MW0006`)

`Moonwell.Analyzers` runs automatically during `dotnet build` and `moonwell build`. All six rules have severity `Error`.

| ID | Summary | Where it triggers |
| --- | --- | --- |
| `MW0001` | `'X' creates a handle or changes game state and cannot be called inside Local.For` | Inside `Local.For` or a `[MachineLocal]` method |
| `MW0002` | `'X' returns a machine-local value and can only be called inside Local.For` | Outside `Local.For` and `[MachineLocal]` methods |
| `MW0003` | `'X' returns a handle id that can differ between machines in multiplayer` | Anywhere in map code (`GetHandleId`, `GetHandleIdBJ`) |
| `MW0004` | `'X' iterates in memory-address order in Lua and desyncs in multiplayer; use OrderedMap or OrderedSet` | Looping over or converting `Dictionary<,>` or `HashSet<>` to `IEnumerable` |
| `MW0005` | `'X' is not supported in Warcraft III's 32-bit Lua; use int or float` | Variables, parameters, return types, or uncast calls returning `long`, `ulong`, `uint`, or `double` |
| `MW0006` | `'X' desyncs in multiplayer` | Calling a `[Desyncs]` function such as `SelectGroupForPlayerBJ` |

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
    PanCameraToTimed(0, 0, 0);
});
```

### `MW0002` — Machine-local read outside `Local.For`

```csharp
// Rejected (MW0002):
int width = BlzGetLocalClientWidth();

// Fix: call inside Local.For or mark the helper method [MachineLocal]
Local.For(player, () =>
{
    int width = BlzGetLocalClientWidth();
});
```

### `MW0003` — `GetHandleId` / `GetHandleIdBJ`

```csharp
// Rejected (MW0003):
int id = GetHandleId(unit.Handle);

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
SelectGroupForPlayerBJ(group, player.Handle);

// Fix: run local selection calls inside Local.For
Local.For(player, () =>
{
    ClearSelection();
    ForGroup(group, () => SelectUnit(GetEnumUnit(), true));
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
| `\e` | Lua does not recognize `\e` (`0x1B`). | Use `\u001B`. |
| `\Uxxxxxxxx` | CSharp.lua does not convert 8-digit `\U` escapes. | Use a surrogate pair of `\uXXXX` escapes or a literal UTF-8 character. |
| `\x` not followed by 2 hex digits (e.g., `\x9`) | Lua's `\x` requires exactly two hex digits (`\x09`). | Use `\u0009` or a 4-digit `\uXXXX` escape. |
| `\0` followed by a digit (`0`–`9`) | Lua reads `\0` + digits as a multi-digit decimal byte escape (`\01`). | Use `\u0000` before a digit. |
| Raw string literals (`"""..."""`) | CSharp.lua strips the outer quotes without unindenting or escaping inner quotes. | Use a regular `"..."` or verbatim `@"..."` string. |
| UTF-8 string literals (`"..."u8`) | CSharp.lua emits the `u8` suffix into Lua where it is a syntax error. | Use a regular `string` or `byte[]`. |
| Verbatim string `@"..."` starting with `\r\n` | Lua long strings `[[...]]` strip an immediate leading newline after `[[`. | Start the text on the first line after `@"` or use explicit `\n` escapes in `"..."`. |

---

## Common build errors

| Error message | Cause and resolution |
| --- | --- |
| `Object constructor called a game native at <File>:<Line>. Declare fields and components in constructors; move game calls into a reaction method (OnGameStart, OnEnter, OnCast, ...).` | `Moonwell.Build` runs your `Map` and object constructors on .NET during the build to extract object data. Move runtime calls (`Unit.Create`, `CreateUnit`, `DisplayTextToPlayer`, etc.) into a reaction method such as `OnGameStart()` or `OnEnter()`. |
| `<File>(<Line>,<Col>): error: Setting '<Prop>' on '<Type>' is only allowed inside its constructor.` | Object fields and `ObjectList` / `ObjectRef` mutations (`Add`, `Remove`, `Set`) are build-time object data and are read-only in game code. Mutate them only inside the declaring class's constructor. |
| `<Type>: unknown field '<id>'` or `field '<id>' is a leveled field; use Set("<id>", level, value)` | The 4-character field id passed to `Set(...)` does not exist on that object kind, has the wrong value type, or requires a 1-based level argument. |
| `Expected a single class inheriting Moonwell.Map, found none` (or `found N`) | Every map project must have exactly one non-abstract class inheriting `Moonwell.Map`. |
| `Project defines its own Main entry point (<Type>.Main).` | Remove your custom `Main` method or top-level statements; `Moonwell.Build` generates `Moonwell.Generated.MapMain.Main` in `build\generated\MapMain.g.cs`. |
| `ids.json has stale class(es) [Old] and new class(es) [New] of the same kind.` | A declared object class was renamed. Update its key in `ids.json` to preserve its 4-character id in placed map data, or delete the old key from `ids.json` to assign a new id. |
| `Both <A> and <B> have [Replaces] on standard object '<id>'.` | Only one declared class in a map can replace a given standard object id. |
| `Expected common.j and Blizzard.j in ...\Documents\Warcraft III\JassHelper.` | Launch Warcraft III World Editor and save any map once so it extracts `common.j` and `Blizzard.j` into `Documents\Warcraft III\JassHelper`. |
| `Moonwell uses the default NuGet cache (~/.nuget/packages); custom NUGET_PACKAGES is not supported.` | Unset the `NUGET_PACKAGES` environment variable so `Moonwell.Build` can locate package source files in `~/.nuget/packages`. |
