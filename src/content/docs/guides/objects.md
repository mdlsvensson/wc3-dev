---
title: Objects
description: Declare units, heroes, items, abilities, buffs, destructables, doodads, and upgrades as C# classes.
---

## Declaring an object

In Moonwell, every custom or modified game object is a C# class that inherits from a generated standard class in `Moonwell.Objects` — or from another class in your map that does. All seven Warcraft III object-data kinds are covered:

| Kind | Standard namespaces | Runtime base |
|---|---|---|
| Units & Heroes | `Moonwell.Objects.Units.<Race>` (`Human`, `Orc`, `Undead`, `NightElf`, `Naga`, `Demon`, `Creeps`, `Critters`, `Campaign`, `Other`) | `Unit` / `Hero` |
| Abilities | `Moonwell.Objects.Abilities.<Race>` (`Human`, `Orc`, `Undead`, `NightElf`, `Naga`, `Creeps`, `Other`) | `Ability` |
| Buffs | `Moonwell.Objects.Buffs.<Race>` (`Human`, `Orc`, `Undead`, `NightElf`, `Other`) | `Buff` |
| Upgrades | `Moonwell.Objects.Upgrades.<Race>` (`Human`, `Orc`, `Undead`, `NightElf`, `Naga`, `Demon`, `Other`) | `Upgrade` |
| Items | `Moonwell.Objects.Items` | `Item` |
| Destructables | `Moonwell.Objects.Destructables` | `Destructable` |
| Doodads | `Moonwell.Objects.Doodads` | `Doodad` |

A declaration sets its fields and starting components in its parameterless constructor:

```csharp
using Moonwell.Objects.Abilities.Human;
using Moonwell.Objects.Units.Human;

namespace MyMap
{
    public sealed class Champion : Paladin
    {
        public Champion()
        {
            Name = "Champion";
            HitPoints = HitPoints + 200;
            Armor = Armor + 3;
            HeroAbilities.Remove<HolyLight>();
            HeroAbilities.Add<Smite>();
            Components.Add(new Fury());
        }
    }
}
```

Every standard class carries the game's values for the map's selected balance set (`DataSet` and `DataVersion` on `Map`). Any field you do not set keeps its base class's value, and reading a field in the constructor before setting it returns the base value — so `HitPoints = HitPoints + 200` adds 200 to the Paladin's standard hit points.

## Setting fields

Moonwell provides three ways to set object fields in a constructor:

1. **Hand-picked property names** for the 98 most common fields across the seven kinds (`Name`, `HitPoints`, `Mana`, `Armor`, `Speed`, `Damage`, `Cooldown`, `ManaCost`, `Range`, `Area`, `Duration`, `Tooltip`, `Icon`, `Model`, and so on — see [Objects & Natives API](/reference/objects-and-natives/#hand-picked-field-names)).
2. **Generated property names** from World Editor's English field labels for every other field in the game's metadata (such as `AnimationWalkSpeed` or `Attack1ProjectileArt`).
3. **Raw four-character field ids** via `Set(fieldId, value)` or `Set(fieldId, level, value)`:

```csharp
public sealed class HeavyFootman : Footman
{
    public HeavyFootman()
    {
        Set("uhpm", 650);
    }
}
```

`Set` checks at build time that the field id belongs to that object kind and that the value's type matches the field (`int`, `float`, `bool`, or `string`). For an ability-specific data field (such as Storm Bolt's `Htb1`), `Set` also checks that the field applies to your ability's standard root ability; setting a field from a different ability fails the build naming the class, field, and C# line.

### Per-level fields (`Levels` and `PerLevel`)

Fields on abilities and upgrades that vary by level have type `Levels<T>`. Set them either by listing each level's value from level 1 with `Levels(...)`, or by giving a formula of the 1-based level number with `PerLevel(level => ...)`:

```csharp
using Moonwell.Objects.Abilities.Human;

namespace MyMap
{
    public sealed class Smite : StormBolt
    {
        public Smite()
        {
            Name = "Smite";
            LevelCount = 3;
            ManaCost = Levels(60, 70, 80);
            Cooldown = PerLevel(level => 10f - level);
            Damage = Levels(75f, 150f, 225f);
            Tooltip = PerLevel(level => $"Smite - [|cffffcc00Level {level}|r]");
            ExtendedTooltip = PerLevel(level =>
                $"Hurls a magical hammer that deals {Damage[level]} damage and stuns for {Duration[level]} seconds.");
        }
    }
}
```

- `Levels<T>` is indexed **from 1** (`Damage[1]`, `Damage[2]`, `Damage[3]`). Accessing level `0` or a level above `Count` throws `ArgumentOutOfRangeException`.
- When you use `PerLevel(level => ...)`, the build resolves the formula for each level from `1` to the ability's or upgrade's `LevelCount`.
- To change a single level of a per-level field by raw field id without touching the other levels, call `Set("Htb1", 2, 250f)`.

### Object lists (`ObjectList<T>`)

Fields that hold a list of other object types — such as `Abilities`, `HeroAbilities`, `Requires`, `Trains`, `Builds`, `Sells`, and `SellsUnits` on a unit, `Abilities` and `Requires` on an item, `Buffs` and `Requires` on an ability, or `Requires` on an upgrade — have type `ObjectList<T>`.

An `ObjectList<T>` starts with the standard base object's entries and is modified by type parameter rather than raw id strings:

```csharp
public sealed class TownKeep : Keep
{
    public TownKeep()
    {
        Trains.Remove<Footman>();
        Trains.Add<Champion>();
        Abilities.Add<TownBell>();
    }
}
```

- `Add<TObject>()` appends `TObject` to the list if it is not already present.
- `Remove<TObject>()` removes `TObject` from the list if present.
- `Contains<TObject>()` returns `true` when `TObject` is in the list.
- `Count` returns the number of entries in the list.

### Single-object references (`ObjectRef<T>`)

Fields that point to a single object type — such as a unit's `DefaultActiveAbility` (`udaa`) — have type `ObjectRef<T>`:

- `Set<TObject>()` points the field to `TObject` (a standard or declared class).
- `Is<TObject>()` returns `true` when the field points to `TObject`.

## Rules for object constructors

At build time, `moonwell build` constructs every non-abstract declared object class on .NET to read the fields its constructor changed. At run time in Warcraft III, the constructor runs when an instance of that unit, item, destructable, ability, or buff is created.

- **Constructors may compute:** you can use arithmetic, string interpolation, constants, loops, and helper methods inside a constructor.
- **Constructors must never call the game:** calling `Natives.*` or any runtime method that touches the game world during declaration fails the build and reports the exact C# file and line:

```text
Map.cs:9: MyMap.BadUnit calls the game while it is declared; game work starts from a reaction or the game's start
```

## Object ids, `ids.json`, and `[ObjectId]`

Every declared object class is a new custom object in the map by default, even if its constructor changes no fields.

On the first build that sees a class, `moonwell build` assigns it a four-character id following World Editor's prefix rules and records it in `ids.json` in your project root:

| Kind | Id prefix and sequence |
|---|---|
| Heroes | `H001`, `H002`, ..., `H009`, `H00A`, ..., `H00Z`, `H010`, ... |
| Units (non-hero) | `h001`, `h002`, ... |
| Items | `I001`, `I002`, ... |
| Abilities | `A001`, `A002`, ... |
| Buffs | `B001`, `B002`, ... (plus `<ClassName>#carrier` with an `A` id for its hidden carrier ability) |
| Destructables | `B001`, `B002`, ... (separate `B` id space from buffs) |
| Doodads | `D001`, `D002`, ... |
| Upgrades | `R001`, `R002`, ... |

Any id that clashes with a standard Warcraft III object id, an id already in `ids.json`, or an id in `map/`'s object files is skipped automatically.

Commit `ids.json` to version control so every build keeps the same object ids.

### Pinning an id with `[ObjectId]`

To give a declared class a specific four-character id, mark the class with `[ObjectId("...")]` from `Moonwell.Objects`:

```csharp
using Moonwell.Objects;
using Moonwell.Objects.Units.Human;

namespace MyMap
{
    [ObjectId("H001")]
    public sealed class Champion : Paladin
    {
    }
}
```

The id must be four ASCII characters and must not be a standard object id or shared with another declared class.

### Renaming a declared class

Because `ids.json` is keyed by full C# class name (`Namespace.ClassName`), renaming or moving a class to a new namespace makes the old key disappear and a new key appear. When a build sees an old class disappear while a new class of the same kind has no id yet:

- If nothing in `map/` (`war3mapUnits.doo` or `war3map.doo`) places the old id on the terrain, the build prints a warning showing the `[ObjectId("...")]` attribute to add if it was a rename, and assigns a new id.
- If the source map places the old id on the terrain, the build stops with an error so preplaced objects on the map never silently break:

```text
MyMap.OldHero was H001, which is placed in the map, and no class declares it now; if it was renamed to MyMap.Champion, add [ObjectId("H001")] to MyMap.Champion
```

## Replacing a standard object (`[Replaces]`)

By default, `class CustomFootman : Footman` creates a new unit type (`h001`) copied from `Footman` (`hfoo`).

Marking the class with `[Replaces]` modifies the standard object `hfoo` itself instead of creating a new object id:

```csharp
using Moonwell.Objects;
using Moonwell.Objects.Units.Human;

namespace MyMap
{
    [Replaces]
    public sealed class ToughFootman : Footman
    {
        public ToughFootman()
        {
            HitPoints = 550;
            Components.Add(new ShieldWall());
        }
    }
}
```

With `[Replaces]`:

- The changed fields are written onto the standard object's own id (`hfoo`).
- Every instance of that standard object in the game — whether preplaced in World Editor, trained at a Barracks, or spawned by a native — is created in the runtime as an instance of `ToughFootman` with its starting components and reactions.
- Declaring two `[Replaces]` classes for the same standard base object, or combining `[Replaces]` with `[ObjectId]`, is a build error.

## Reading declared fields in the game

Declared fields are **class defaults**. You can read any declared field in your game code (in reactions, components, or helpers) without repeating constants in two places:

```csharp
public override void OnCast(Cast cast)
{
    var damage = Damage[cast.Level];
    // ...
}
```

- The build scans your compiled assembly for which field getters your map code actually calls, and embeds only those values in the map's Lua script.
- Declared fields are **read-only after declaration**. Calling a declared field's setter, `ObjectList<T>.Add` / `Remove`, `ObjectRef<T>.Set`, or `Set(...)` from any method outside a constructor is rejected at build time:

```text
MyMap.Smite.OnCast sets Name; declared fields are set only in the constructor
```

## Doodads and upgrades

Warcraft III gives no runtime handle for doodads or upgrades, so `Doodad` and `Upgrade` are data-only classes rather than actors (they do not take components or reactions).

Declare an upgrade by inheriting from a standard upgrade in `Moonwell.Objects.Upgrades.*`, and read a player's researched level of that upgrade in the game with `player.LevelOf<T>()`:

```csharp
using Moonwell.Objects.Upgrades.Human;

namespace MyMap
{
    public sealed class TemperedBlades : IronForgedSwords
    {
        public TemperedBlades()
        {
            Name = PerLevel(level => $"Tempered Blades (Rank {level})");
        }
    }
}
```

```csharp
var rank = player.LevelOf<TemperedBlades>();
var id = ObjectTypes.IdOf<TemperedBlades>();
```
