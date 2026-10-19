---
title: Objects & Natives API
description: Reference for Moonwell.Objects base classes, wrapper types, attributes, naming rules, all 98 hand-picked field names, and Moonwell.Natives bindings.
---

## `Moonwell.Objects` base classes and helpers

Every generated standard object class in `Moonwell.Objects` inherits from one of eight kind base classes:

| Base class | Runtime base | Used for |
| --- | --- | --- |
| `StandardUnit` | `Moonwell.Unit` | Standard and custom non-hero units |
| `StandardHero` | `Moonwell.Hero` (`: Unit`) | Standard and custom heroes |
| `StandardItem` | `Moonwell.Item` | Standard and custom items |
| `StandardDestructable` | `Moonwell.Destructable` | Standard and custom destructables |
| `StandardDoodad` | `Moonwell.Doodad` | Standard and custom doodads |
| `StandardAbility` | `Moonwell.Ability` | Standard and custom abilities |
| `StandardBuff` | `Moonwell.Buff` | Standard and custom buffs with in-game status icons |
| `StandardUpgrade` | `Moonwell.Upgrade` | Standard and custom upgrades |

Each kind base class provides four `protected` helper methods for use inside object constructors:

| Method | Description |
| --- | --- |
| `protected static Levels<T> Levels<T>(params T[] values)` | Creates a `Levels<T>` from explicit level values (`level 1`, `level 2`, ...). |
| `protected static Levels<T> PerLevel<T>(Func<int, T> formula)` | Creates a lazy `Levels<T>` evaluated for each 1-based level (`1..LevelCount`). |
| `protected void Set(string field, object value)` | Sets a single-value object field by its raw 4-character field id (for example, `Set("uhpm", 800)`). |
| `protected void Set(string field, int level, object value)` | Sets a leveled object field at 1-based `level` by its raw 4-character field id (for example, `Set("Htb1", 2, 250f)`). |

## Wrapper types and attributes

### `Levels<T>`

`public sealed class Levels<T>`

Represents a per-level field on an ability, upgrade, or doodad.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public int Count { get; }` | Yes | Number of explicit values passed to `Levels(...)` (`0` when created via `PerLevel`). |
| `public T this[int level] { get; }` | Yes | Returns the value at 1-based `level` (`level >= 1`). |

### `ObjectList<T>`

`public sealed class ObjectList<T>`

Represents a comma-separated list of object ids (such as `Abilities`, `HeroAbilities`, `Requires`, `Trains`, `Builds`, `Sells`, `SellsUnits`, or `Buffs`).

| Member | Local-safe | Description |
| --- | --- | --- |
| `public int Count { get; }` | Yes | Number of object ids currently in the list. |
| `public bool Contains<TObject>() where TObject : T` | Yes | Returns `true` if `TObject` is in the list. |
| `public void Add<TObject>() where TObject : T` | No | Appends `TObject` to the list if not already present (constructor-only). |
| `public void Remove<TObject>() where TObject : T` | No | Removes `TObject` from the list if present (constructor-only). |

### `ObjectRef<T>`

`public sealed class ObjectRef<T>`

Represents a single typed object reference field.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public bool Is<TObject>() where TObject : T` | Yes | Returns `true` if this reference currently points to `TObject`. |
| `public void Set<TObject>() where TObject : T` | No | Points this reference at `TObject` (constructor-only). |

### `[ObjectId]` and `[Replaces]`

| Attribute | Target | Description |
| --- | --- | --- |
| `[ObjectId(string id)]` | `class` | Pins the 4-character object id (such as `[ObjectId("H001")]`) for a declared custom object class. |
| `[Replaces]` | `class` | Writes the declared class's modified fields directly onto its standard base class's own id and registers the declared class for that standard id at run time. |

## Standard object namespaces and naming

### Namespaces by kind

| Object kind | Namespaces |
| --- | --- |
| Units & Heroes | `Moonwell.Objects.Units.Human`, `.Orc`, `.Undead`, `.NightElf`, `.Naga`, `.Demon`, `.Creeps`, `.Critters`, `.Campaign`, `.Other` |
| Abilities | `Moonwell.Objects.Abilities.Human`, `.Orc`, `.Undead`, `.NightElf`, `.Naga`, `.Creeps`, `.Other` |
| Buffs | `Moonwell.Objects.Buffs.Human`, `.Orc`, `.Undead`, `.NightElf`, `.Other` |
| Upgrades | `Moonwell.Objects.Upgrades.Human`, `.Orc`, `.Undead`, `.NightElf`, `.Naga`, `.Demon`, `.Other` |
| Items | `Moonwell.Objects.Items` |
| Destructables | `Moonwell.Objects.Destructables` |
| Doodads | `Moonwell.Objects.Doodads` |

### Class naming rules

1. Each standard object class is named in PascalCase after its English in-game name (`Footman`, `Archmage`, `StormBolt`, `ClawsOfAttack15`, `SummerTreeWall`).
2. When a campaign or special hero has a single `Propernames` entry (`Hjai` → `"Jaina"`), that proper name is used as the class name (`Jaina`). When several campaign heroes share a proper name, all of them keep their id (`ArthasHart`, `ArthasUear`).
3. Among objects in one namespace that share a name, each gets its id appended, except the one with the first id when it isn't a campaign object (for example, `WaterElemental` for `hwat`, `WaterElementalHwt2` for `hwt2`, and `WaterElementalHwt3` for `hwt3`). A name that is a C# keyword, the namespace's last part, or a reserved type name also gets its id appended.

## Hand-picked property names (98 fields)

Every standard object class exposes all of its World Editor fields as typed properties. The 98 most common fields across the seven kinds have short hand-picked names; all remaining fields are named in PascalCase after their World Editor display labels.

### Units and heroes (`unit` — 41 fields)

| Property | Field id | Type |
| --- | --- | --- |
| `Name` | `unam` | `string` |
| `HitPoints` | `uhpm` | `int` |
| `HitPointRegen` | `uhpr` | `float` |
| `Mana` | `umpm` | `int` |
| `ManaRegen` | `umpr` | `float` |
| `Armor` | `udef` | `int` |
| `Speed` | `umvs` | `int` |
| `SightRange` | `usid` | `int` |
| `CollisionSize` | `ucol` | `float` |
| `GoldCost` | `ugol` | `int` |
| `LumberCost` | `ulum` | `int` |
| `Food` | `ufoo` | `int` |
| `FoodProduced` | `ufma` | `int` |
| `BuildTime` | `ubld` | `int` |
| `Level` | `ulev` | `int` |
| `Abilities` | `uabi` | `ObjectList<Ability>` |
| `HeroAbilities` | `uhab` | `ObjectList<Ability>` |
| `Requires` | `ureq` | `ObjectList<object>` |
| `Model` | `umdl` | `string` |
| `Scale` | `usca` | `float` |
| `Icon` | `uico` | `string` |
| `Tooltip` | `utip` | `string` |
| `ExtendedTooltip` | `utub` | `string` |
| `Hotkey` | `uhot` | `string` |
| `AttackType` | `ua1t` | `string` |
| `Damage` | `ua1b` | `int` |
| `DamageDice` | `ua1d` | `int` |
| `DamageSides` | `ua1s` | `int` |
| `AttackCooldown` | `ua1c` | `float` |
| `AttackRange` | `ua1r` | `int` |
| `Strength` | `ustr` | `int` |
| `Agility` | `uagi` | `int` |
| `Intelligence` | `uint` | `int` |
| `StrengthPerLevel` | `ustp` | `float` |
| `AgilityPerLevel` | `uagp` | `float` |
| `IntelligencePerLevel` | `uinp` | `float` |
| `PrimaryAttribute` | `upra` | `string` |
| `Trains` | `utra` | `ObjectList<Unit>` |
| `Builds` | `ubui` | `ObjectList<Unit>` |
| `Sells` | `usei` | `ObjectList<Item>` |
| `SellsUnits` | `useu` | `ObjectList<Unit>` |

### Items (`item` — 15 fields)

| Property | Field id | Type |
| --- | --- | --- |
| `Name` | `unam` | `string` |
| `HitPoints` | `ihtp` | `int` |
| `GoldCost` | `igol` | `int` |
| `LumberCost` | `ilum` | `int` |
| `Level` | `ilev` | `int` |
| `Abilities` | `iabi` | `ObjectList<Ability>` |
| `Model` | `ifil` | `string` |
| `Scale` | `isca` | `float` |
| `Icon` | `iico` | `string` |
| `Tooltip` | `utip` | `string` |
| `ExtendedTooltip` | `utub` | `string` |
| `Description` | `ides` | `string` |
| `Hotkey` | `uhot` | `string` |
| `Requires` | `ureq` | `ObjectList<object>` |
| `Charges` | `iuse` | `int` |

### Abilities (`ability` — 21 fields)

Plus per-ability data fields (such as `Damage` on `StormBolt`), which are named after the ability's own `MetaData` labels.

| Property | Field id | Type |
| --- | --- | --- |
| `Name` | `anam` | `string` |
| `LevelCount` | `alev` | `int` |
| `Cooldown` | `acdn` | `Levels<float>` |
| `ManaCost` | `amcs` | `Levels<int>` |
| `Range` | `aran` | `Levels<float>` |
| `Area` | `aare` | `Levels<float>` |
| `Duration` | `adur` | `Levels<float>` |
| `HeroDuration` | `ahdu` | `Levels<float>` |
| `CastTime` | `acas` | `Levels<float>` |
| `Buffs` | `abuf` | `ObjectList<Buff>` |
| `Targets` | `atar` | `Levels<string>` |
| `Icon` | `aart` | `string` |
| `Tooltip` | `atp1` | `Levels<string>` |
| `ExtendedTooltip` | `aub1` | `Levels<string>` |
| `LearnTooltip` | `aret` | `string` |
| `LearnExtendedTooltip` | `arut` | `string` |
| `Hotkey` | `ahky` | `string` |
| `LearnHotkey` | `arhk` | `string` |
| `Requires` | `areq` | `ObjectList<object>` |
| `Order` | `aord` | `string` |
| `RequiredLevel` | `arlv` | `int` |

### Buffs (`buff` — 4 fields)

| Property | Field id | Type |
| --- | --- | --- |
| `Name` | `fnam` | `string` |
| `Tooltip` | `ftip` | `string` |
| `ExtendedTooltip` | `fube` | `string` |
| `Icon` | `fart` | `string` |

### Upgrades (`upgrade` — 7 fields)

| Property | Field id | Type |
| --- | --- | --- |
| `Name` | `gnam` | `Levels<string>` |
| `Tooltip` | `gtp1` | `Levels<string>` |
| `ExtendedTooltip` | `gub1` | `Levels<string>` |
| `Hotkey` | `ghk1` | `Levels<string>` |
| `Icon` | `gar1` | `Levels<string>` |
| `LevelCount` | `glvl` | `int` |
| `Requires` | `greq` | `ObjectList<object>` |

### Destructables (`destructable` — 7 fields)

| Property | Field id | Type |
| --- | --- | --- |
| `Name` | `bnam` | `string` |
| `HitPoints` | `bhps` | `float` |
| `Model` | `bfil` | `string` |
| `BuildTime` | `bbut` | `int` |
| `RepairTime` | `bret` | `int` |
| `RepairGoldCost` | `breg` | `int` |
| `RepairLumberCost` | `brel` | `int` |

### Doodads (`doodad` — 3 fields)

| Property | Field id | Type |
| --- | --- | --- |
| `Name` | `dnam` | `string` |
| `Model` | `dfil` | `string` |
| `Scale` | `ddes` | `float` |

## `Moonwell.Natives`

`Moonwell.Natives` (`Moonwell.Natives.dll`) provides direct C# bindings for Warcraft III's `common.j` and `Blizzard.j` in the `Moonwell` namespace. Import `Moonwell` and call functions and constants through `Natives`:

```csharp
using Moonwell;

// ...
Natives.CreateUnit(player.Handle, id, x, y, facing);
```

> [!WARNING]
> Do not use `using static Moonwell.Natives;`. Using a handle constant (such as `ATTACK_TYPE_MAGIC`, `DAMAGE_TYPE_MAGIC`, `DAMAGE_TYPE_FIRE`, or `WEAPON_TYPE_WHOKNOWS`) through a `using static` import crashes `moonwell build` 0.1.2 with `NullReferenceException`, and the static import also makes `Player.Get(0)` fail with `CS0119` because `Natives.Player(int)` shadows `Moonwell.Player`.

### `Natives` static class

`public static class Natives` (in the `Moonwell` namespace) contains:

- All **2,796 functions** from `common.j` and `Blizzard.j` (Warcraft III `3.0.1.24370`) with their exact JASS names (`CreateUnit`, `GetTriggerUnit`, `UnitDamageTarget`, `AddSpecialEffect`, `SetUnitPosition`, `BlzGetUnitMaxHp`, etc.).
- All **`common.j` and `Blizzard.j` constants** (`PLAYER_NEUTRAL_AGGRESSIVE`, `ATTACK_TYPE_HERO`, `DAMAGE_TYPE_NORMAL`, `EVENT_PLAYER_UNIT_DEATH`, `bj_RADTODEG`, etc.).
- All **`bj_*` global variables** exposed as static properties (`bj_lastCreatedUnit`, `bj_mapInitialPlayableArea`, etc.).
- Sync attributes (`[CreatesHandle]`, `[ChangesState]`, `[MachineLocal]`, `[Desyncs]`) on the natives and `Blizzard.j` functions that create handles, change game state, read machine-local state, or desync (untagged natives also exist).

### Handle types (`namespace Moonwell`)

All JASS handle types are generated in `namespace Moonwell` (in `Moonwell.Natives.dll`) with their lowercase JASS names and inheritance hierarchy:

- **`handle`** — root handle type.
  - **`agent : handle`** — reference-counted handle types (`player`, `widget`, `unit`, `item`, `destructable`, `timer`, `trigger`, `group`, `force`, `rect`, `region`, `location`, `effect`, `sound`, `dialog`, `button`, `quest`, `timerdialog`, `leaderboard`, `multiboard`, `multiboarditem`, `hashtable`, `framehandle`, `boolexpr`, `conditionfunc : boolexpr`, `filterfunc : boolexpr`, `fogmodifier`, etc.).
  - **Non-agent handles (`: handle`)** — enum-like and lightweight handles (`alliancetype`, `attacktype`, `damagetype`, `weapontype`, `armortype`, `race`, `playercolor`, `playerslotstate`, `unitevent`, `playerunitevent`, `widgetevent`, `limitop`, `texttag`, `lightning`, `image`, `ubersplat`, `originframetype`, `framepointtype`, `textaligntype`, `oskeytype`, etc.).
