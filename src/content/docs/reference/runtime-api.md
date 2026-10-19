---
title: Runtime API
description: Complete API reference for all public classes, enums, properties, methods, and hooks in the Moonwell namespace.
---

All runtime types live in the `Moonwell` namespace (`Moonwell.dll`). The **Local-safe** column indicates whether a property or method is marked `[LocalSafe]` (or is on a `[LocalSafe]` class) and can therefore be called inside `Local.For(player, () => ...)`.

## Map configuration

### `Map`

`public abstract class Map`

Subclass `Map` once in your project to configure `war3map.w3i` metadata, choose the standard object balance dataset, and register starting `GameComponent` instances.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public string Name { get; protected set; } = ""` | No | Map name written to `war3map.w3i`; when empty (`""`), keeps the value already stored in `map\war3map.w3i`. |
| `public string Author { get; protected set; } = ""` | No | Map author written to `war3map.w3i`; when empty (`""`), keeps the value already stored in `map\war3map.w3i`. |
| `public string Description { get; protected set; } = ""` | No | Map description written to `war3map.w3i`; when empty (`""`), keeps the value already stored in `map\war3map.w3i`. |
| `public string RecommendedPlayers { get; protected set; } = ""` | No | Recommended players text; when empty (`""`), keeps the value already stored in `map\war3map.w3i`. |
| `public DataSet DataSet { get; protected set; } = DataSet.Default` | No | Balance dataset (`Default`, `Custom`, or `Melee`). |
| `public DataVersion DataVersion { get; protected set; } = DataVersion.ForsakenKingdom` | No | Game data version (`ReignOfChaos`, `FrozenThrone`, or `ForsakenKingdom`). |
| `protected List<GameComponent> Components { get; }` | No | Starting `GameComponent` instances attached to `Game.Instance` when the map starts. |

### `DataSet`

`public enum DataSet`

| Value | Integer | Description |
| --- | --- | --- |
| `DataSet.Default` | `0` | Default balance dataset (`GameDataSet = 0`, default). |
| `DataSet.Custom` | `1` | Custom balance data (`GameDataSet = 1`). |
| `DataSet.Melee` | `2` | Melee patch balance (`GameDataSet = 2`). |

### `DataVersion`

`public enum DataVersion`

| Value | Integer | Description |
| --- | --- | --- |
| `DataVersion.ReignOfChaos` | `0` | Reign of Chaos (`GameDataVersion = 0`). |
| `DataVersion.FrozenThrone` | `1` | The Frozen Throne (`GameDataVersion = 1`). |
| `DataVersion.ForsakenKingdom` | `2` | Forsaken Kingdom (`GameDataVersion = 2`, default). |

---

## Ownership

### `Owned`

`public abstract class Owned`

Base class for objects that belong to an `Owner` and end when their owner ends.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public Owner? Owner { get; }` | Yes | The `Owner` that adopted this object (retained after the object ends), or `null` if unowned (`Game.Instance`, `Player`, or unowned `Unit`/`Item`/`Destructable`). |
| `public bool HasEnded { get; }` | Yes | `true` once `End()` has completed on this object. |
| `public void End()` | No | Calls `OnEnd()`, ends all owned children (newest-first), sets `HasEnded = true`, and unlinks from `Owner`'s active child list. Idempotent. |
| `protected virtual void OnEnd()` | No | Called once by `End()` before owned children are ended. |

### `Owner`

`public abstract class Owner : Owned`

An `Owned` object that can also own child `Owned` objects (`Timer`, `Buff`, `Component`, `Cast`, `Unit`, `Item`).

| Member | Local-safe | Description |
| --- | --- | --- |
| `public static Owner Current { get; }` | Yes | The currently active `Owner` (the running reaction's `Component`, `Unit`, `Cast`, `Buff`, or `Game.Instance` at the root). |
| `public int OwnedCount { get; }` | Yes | Number of active `Owned` children currently attached to this owner. |
| `public void Run(Action action)` | No | Runs `action` with `Owner.Current` temporarily set to this `Owner` (if `HasEnded` is `true`, any `Owned` child created during `action` is ended immediately upon adoption). |

---

## Actors and widgets

### `Actor`

`public abstract class Actor : Owner`

Base class for `Game`, `Player`, and `Widget`. Holds attached `Component` instances.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public int ComponentCount { get; }` | Yes | Number of components currently attached to this actor. |
| `public T? Get<T>() where T : Component` | Yes | Returns the first attached component assignable to `T`, or `null`. |
| `public List<T> GetAll<T>() where T : Component` | Yes | Returns a new list of all attached components assignable to `T` in add order. |
| `public bool Has<T>() where T : Component` | Yes | Returns `true` if at least one attached component is assignable to `T`. |
| `public void Remove(Component component)` | No | Ends `component`, which runs its `OnRemoved()` and removes it from this actor. Throws `MoonwellException` in a development build if `component` is not on this actor. |
| `public int RemoveAll<T>() where T : Component` | No | Removes all attached components assignable to `T` in add order and returns how many were removed. |
| `protected TComponent AddComponent<TComponent>(TComponent component) where TComponent : Component` | No | Attaches `component` to this actor, sets its `Actor` and ownership, registers lazy event triggers, and calls `OnAdded()`. |

### `Widget`

`public abstract class Widget : Actor`

Base class for `Unit`, `Item`, and `Destructable`.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public bool IsGone { get; }` | Yes | `true` once the widget has been removed from the game (`Remove()` or engine removal). |

### `Game`

`public sealed class Game : Actor`

The map-wide actor and root `Owner`.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public static Game Instance { get; }` | Yes | Singleton `Game` instance for the map. |
| `public T Add<T>(T component) where T : GameComponent` | No | Attaches `component` to `Game.Instance` and returns it. |

### `Player`

`public sealed class Player : Actor`

Represents one of Warcraft III's 28 player slots (`0` to `27`).

| Member | Local-safe | Description |
| --- | --- | --- |
| `public const int MaxSlots = 28` | Yes | Total number of player slots (`0`..`27`). |
| `public int Slot { get; }` | Yes | Zero-based player slot (`0` is Player 1). |
| `public player Handle { get; }` | Yes | Underlying `common.j` `player` handle (`Natives.Player(Slot)`). |
| `public static Player Get(int slot)` | Yes | Returns the `Player` for `slot` (`0 <= slot < MaxSlots`). |
| `public static Player? Of(player? handle)` | Yes | Returns the `Player` for `handle`, or `null` if `handle` is `null` or out of range. |
| `public int LevelOf<T>() where T : Upgrade` | Yes | Current researched level of upgrade `T` for this player (`GetPlayerTechCount(Handle, IdOf<T>(), true)`). |
| `public T Add<T>(T component) where T : PlayerComponent` | No | Attaches `component` to this player and returns it. |

### `Unit` and `Hero`

`public class Unit : Widget`
`public class Hero : Unit`

Represents a unit or hero in the game. Standard units in `Moonwell.Objects.Units.*` inherit `StandardUnit : Unit`, and standard heroes inherit `StandardHero : Hero`.

| Member | Local-safe | Description |
| --- | --- | --- |
| `protected List<UnitComponent> Components { get; }` | No | Starting components added in the unit's constructor. |
| `public unit Handle { get; }` | Yes | Underlying `common.j` `unit` handle. |
| `public int TypeId { get; }` | Yes | Four-character unit type id (`GetUnitTypeId(Handle)`). |
| `public Player Player { get; }` | Yes | Owning `Player` (`GetOwningPlayer(Handle)`). |
| `public static Unit? Of(unit? handle)` | No | Returns the `Unit` wrapper for `handle` (creating and initializing it if first seen), or `null` if `handle` is `null` or invalid. |
| `public static Unit Create(int typeId, Player player, float x, float y, float facing, Owner? owner = null)` | No | Creates a unit with `CreateUnit` and returns its `Unit` instance. |
| `public static T Create<T>(Player player, float x, float y, float facing, Owner? owner = null) where T : Unit` | No | Creates a unit of declared or standard type `T` (`ObjectTypes.IdOf<T>()`) and returns it typed as `T`. |
| `public Ability AbilityOf(int abilityId)` | No | Returns (and caches) the `Ability` instance for `abilityId` on this unit. |
| `public T AbilityOf<T>() where T : Ability` | No | Returns (and caches) the `Ability` instance of type `T` on this unit. |
| `public T Add<T>(T component) where T : UnitComponent` | No | Attaches `component` to this unit and returns it. |
| `public T Apply<T>(T buff, Unit? source = null) where T : Buff` | No | Applies `buff` to this unit according to `buff.Stacking` and returns the active `T` instance. |
| `public void Remove()` | No | Ends the unit, calls `OnLeave()`, and removes the underlying handle with `RemoveUnit`. |
| `protected virtual void OnEnter()` | No | Called when the unit is first wrapped or enters the map. |
| `protected virtual void OnLeave()` | No | Called when the unit is removed from the game. |
| `public virtual void OnItemPickedUp(Item item)` | No | Called when the unit picks up `item`. |
| `public virtual void OnItemDropped(Item item)` | No | Called when the unit drops `item`. |
| `public virtual void OnDamaged(Damage damage)` | No | Called when the unit takes damage. |
| `public virtual void OnDealtDamage(Damage damage)` | No | Called when the unit deals damage to another unit. |
| `public virtual void OnDeath(Unit? killer)` | No | Called when the unit dies. |
| `public virtual void OnKill(Unit victim)` | No | Called when the unit kills `victim`. |
| `public virtual void OnCast(Cast cast)` | No | Called when the unit starts the effect of an ability. |

### `Item`

`public class Item : Widget`

Represents an item in the game. Standard items in `Moonwell.Objects.Items` inherit `StandardItem : Item`.

| Member | Local-safe | Description |
| --- | --- | --- |
| `protected List<ItemComponent> Components { get; }` | No | Starting components added in the item's constructor. |
| `public item Handle { get; }` | Yes | Underlying `common.j` `item` handle. |
| `public int TypeId { get; }` | Yes | Four-character item type id (`GetItemTypeId(Handle)`). |
| `public static Item? Of(item? handle)` | No | Returns the `Item` wrapper for `handle`, or `null` if `handle` is `null` or invalid. |
| `public static Item Create(int typeId, float x, float y, Owner? owner = null)` | No | Creates an item at `(x, y)` with `CreateItem` and returns its `Item` instance. |
| `public T Add<T>(T component) where T : ItemComponent` | No | Attaches `component` to this item and returns it. |
| `public void Remove()` | No | Ends the item, calls `OnLeave()`, and removes the underlying handle with `RemoveItem`. |
| `protected virtual void OnEnter()` | No | Called when the item is first wrapped or created. |
| `protected virtual void OnLeave()` | No | Called when the item is removed from the game. |
| `public virtual void OnPickedUp(Unit by)` | No | Called when `by` picks up this item. |
| `public virtual void OnDropped(Unit by)` | No | Called when `by` drops this item. |

### `Destructable`

`public class Destructable : Widget`

Represents a destructable in the game. Standard destructables in `Moonwell.Objects.Destructables` inherit `StandardDestructable : Destructable`.

| Member | Local-safe | Description |
| --- | --- | --- |
| `protected List<DestructableComponent> Components { get; }` | No | Starting components added in the destructable's constructor. |
| `public destructable Handle { get; }` | Yes | Underlying `common.j` `destructable` handle. |
| `public int TypeId { get; }` | Yes | Four-character destructable type id (`GetDestructableTypeId(Handle)`). |
| `public static Destructable? Of(destructable? handle)` | No | Returns the `Destructable` wrapper for `handle`, or `null` if `handle` is `null` or invalid. |
| `public T Add<T>(T component) where T : DestructableComponent` | No | Attaches `component` to this destructable and returns it. |
| `public void Remove()` | No | Ends the destructable, calls `OnLeave()`, and removes the underlying handle with `RemoveDestructable`. |
| `protected virtual void OnEnter()` | No | Called when the destructable is first wrapped. |
| `protected virtual void OnLeave()` | No | Called when the destructable is removed from the game. |
| `public virtual void OnDeath()` | No | Called when the destructable dies. |

---

## Components

### `Component`

`public abstract class Component : Owner`

| Member | Local-safe | Description |
| --- | --- | --- |
| `public Actor Actor { get; }` | Yes | The actor this component is attached to. |
| `protected virtual void OnAdded()` | No | Called when the component is attached to `Actor` (with `Owner.Current` set to this component). |
| `protected virtual void OnRemoved()` | No | Called when the component is removed from `Actor` or ended. |

### `MapComponent`, `GameComponent`, and `PlayerComponent`

`public abstract class MapComponent : Component`
`public abstract class GameComponent : MapComponent`
`public abstract class PlayerComponent : MapComponent`

| Member | Class | Local-safe | Description |
| --- | --- | --- | --- |
| `public Game Game { get; }` | `GameComponent` | Yes | `(Game)Actor` (`Game.Instance`). |
| `public Player Player { get; }` | `PlayerComponent` | Yes | `(Player)Actor`. |
| `public virtual void OnGameStart()` | `MapComponent` | No | Called once at `0.00` seconds after map initialization. |
| `public virtual void OnUnitEnter(Unit unit)` | `MapComponent` | No | Called when a unit enters the map (on `Game` and on `unit.Player`). |
| `public virtual void OnUnitDamaged(Damage damage)` | `MapComponent` | No | Called when a unit takes damage (on `Game`, `target.Player`, and `source.Player`). |
| `public virtual void OnUnitDied(Unit dying, Unit? killer)` | `MapComponent` | No | Called when a unit dies (on `Game`, `dying.Player`, and `killer.Player`). |
| `public virtual void OnUnitCast(Cast cast)` | `MapComponent` | No | Called when a unit casts an ability (on `Game` and `caster.Player`). |

### `UnitComponent`

`public abstract class UnitComponent : Component`

| Member | Local-safe | Description |
| --- | --- | --- |
| `public Unit Unit { get; }` | Yes | `(Unit)Actor`. |
| `public virtual void OnItemPickedUp(Item item)` | No | Called when `Unit` picks up `item`. |
| `public virtual void OnItemDropped(Item item)` | No | Called when `Unit` drops `item`. |
| `public virtual void OnDamaged(Damage damage)` | No | Called when `Unit` takes damage. |
| `public virtual void OnDealtDamage(Damage damage)` | No | Called when `Unit` deals damage. |
| `public virtual void OnDeath(Unit? killer)` | No | Called when `Unit` dies. |
| `public virtual void OnKill(Unit victim)` | No | Called when `Unit` kills `victim`. |
| `public virtual void OnCast(Cast cast)` | No | Called when `Unit` casts an ability. |

### `ItemComponent`

`public abstract class ItemComponent : Component`

| Member | Local-safe | Description |
| --- | --- | --- |
| `public Item Item { get; }` | Yes | `(Item)Actor`. |
| `public virtual void OnPickedUp(Unit by)` | No | Called when `by` picks up `Item`. |
| `public virtual void OnDropped(Unit by)` | No | Called when `by` drops `Item`. |

### `DestructableComponent`

`public abstract class DestructableComponent : Component`

| Member | Local-safe | Description |
| --- | --- | --- |
| `public Destructable Destructable { get; }` | Yes | `(Destructable)Actor`. |
| `public virtual void OnDeath()` | No | Called when `Destructable` dies. |

---

## Combat, abilities, buffs, and timers

### `Damage`

`public sealed class Damage`

Passed to `OnDealtDamage`, `OnDamaged`, and `OnUnitDamaged`.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public Unit Target { get; }` | Yes | The unit taking damage. |
| `public Unit? Source { get; }` | Yes | The unit dealing damage, if any. |
| `public float Amount { get; set; }` | Getter: Yes; Setter: No | Event damage amount. Setting `Amount` updates the final damage via `BlzSetEventDamage`. |
| `public bool IsAttack { get; }` | Yes | `true` when the damage came from a basic attack (`BlzGetEventIsAttack()`). |

### `Ability`

`public class Ability : Owner`

Represents an ability on a specific `Unit`. Standard abilities in `Moonwell.Objects.Abilities.*` inherit `StandardAbility : Ability`.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public Unit Unit { get; }` | Yes | The unit holding this ability instance. |
| `public int Id { get; }` | Yes | Four-character ability id. |
| `public int Level { get; }` | Yes | Current level of the ability on `Unit` (`GetUnitAbilityLevel(Unit.Handle, Id)`). |
| `public virtual void OnCast(Cast cast)` | No | Called on spell effect (`EVENT_PLAYER_UNIT_SPELL_EFFECT`) with `Owner.Current` set to `cast`. |

### `Cast`

`[LocalSafe] public sealed class Cast : Owner`

Represents a single ability cast. Ends on `EVENT_PLAYER_UNIT_SPELL_ENDCAST`, when `Caster` starts another cast, or when `Caster` leaves the game.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public Ability Ability { get; }` | Yes | The `Ability` instance on `Caster`. |
| `public Unit Caster { get; }` | Yes | The casting unit. |
| `public Unit? Target { get; }` | Yes | Target unit (`GetSpellTargetUnit()`), or `null` for point/no-target casts. |
| `public float X { get; }` | Yes | Spell target X coordinate (`GetSpellTargetX()`, even when `Target` is set). |
| `public float Y { get; }` | Yes | Spell target Y coordinate (`GetSpellTargetY()`, even when `Target` is set). |
| `public int Level { get; }` | Yes | Level of `Ability` when the cast began. |

### `Buff` and `Stacking`

`public abstract class Buff : UnitComponent`
`public enum Stacking { Refresh, Separate, PerSource }`

Base class for status effects applied via `unit.Apply(buff, source)`. Standard buffs in `Moonwell.Objects.Buffs.*` inherit `StandardBuff : Buff` and display their status bar icon and art via a generated hidden carrier ability.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public float Duration { get; protected set; }` | Getter: Yes; Setter: No | Duration in seconds (`0` = lasts until ended manually). |
| `public float Tick { get; protected set; }` | Getter: Yes; Setter: No | Interval in seconds between `OnTick()` calls (`0` = no ticks). |
| `public Stacking Stacking { get; protected set; } = Stacking.Refresh` | Getter: Yes; Setter: No | Stacking rule (`Refresh`, `Separate`, or `PerSource`). |
| `public bool EndsOnDeath { get; protected set; } = true` | Getter: Yes; Setter: No | When `true`, ends the buff after death reactions run when `Unit` dies. |
| `public Unit? Source { get; }` | Yes | The `source` unit passed to `Unit.Apply(buff, source)`. |
| `public float Remaining { get; }` | Yes | Seconds remaining until expiration (`0` if `Duration == 0` or already ended). |
| `public virtual void OnApply()` | No | Called when the buff is first applied or when refreshed under `Refresh` / `PerSource`. |
| `public virtual void OnTick()` | No | Called every `Tick` seconds while active. |
| `public virtual void OnExpire()` | No | Called when `Duration` elapses naturally (not called when ended early via `End()` or `Remove()`). |

### `Timer`

`public sealed class Timer : Owned`

Schedules delayed or periodic callbacks tied to an `Owner`.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public float Interval { get; }` | Yes | Period in seconds for `Timer.Every` (`0f` for one-shot `Timer.After` timers). |
| `public bool IsPeriodic { get; }` | Yes | `false` for `Timer.After`, `true` for `Timer.Every`. |
| `public float Remaining { get; }` | Yes | Seconds remaining until the next callback (`0` if ended). |
| `public static Timer After(float seconds, Action action, Owner? owner = null)` | No | Runs `action` once after `seconds`, owned by `owner ?? Owner.Current`. |
| `public static Timer Every(float seconds, Action action, Owner? owner = null)` | No | Runs `action` every `seconds` until ended, owned by `owner ?? Owner.Current`. |

---

## Multiplayer, collections, and utilities

### `Local`

`public static class Local`

| Member | Local-safe | Description |
| --- | --- | --- |
| `public static void For(Player player, Action action)` | Yes | Runs `action` only on `player`'s machine (`GetLocalPlayer() == player.Handle`). Checked at compile time by `Moonwell.Analyzers`. |

### `OrderedSet<T>`

`[LocalSafe] public sealed class OrderedSet<T> where T : notnull`

Deterministic set that preserves insertion order across all machines. Removing an element shifts subsequent elements down to keep insertion order intact.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public int Count { get; }` | Yes | Number of elements in the set. |
| `public T this[int index] { get; }` | Yes | Element at `index` in insertion order. |
| `public bool Add(T item)` | Yes | Appends `item` if not already present and returns `true`; returns `false` if already present. |
| `public bool Remove(T item)` | Yes | Removes `item` if present, preserving the relative order of remaining items. |
| `public bool Contains(T item)` | Yes | Returns `true` if `item` is in the set. |
| `public void Clear()` | Yes | Removes all elements. |
| `public List<T> Snapshot()` | Yes | Returns a new `List<T>` copy of the elements in insertion order. |

### `OrderedMap<TKey, TValue>`

`[LocalSafe] public sealed class OrderedMap<TKey, TValue> where TKey : notnull`

Deterministic key-value map that preserves key insertion order across all machines. Updating an existing key's value keeps its original position; removing a key shifts subsequent keys down.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public int Count { get; }` | Yes | Number of key-value pairs in the map. |
| `public TValue this[TKey key] { get; set; }` | Yes | Gets or sets the value for `key` (inserting at the end if `key` is new). |
| `public bool TryGetValue(TKey key, out TValue value)` | Yes | Looks up `key` without throwing if absent. |
| `public bool ContainsKey(TKey key)` | Yes | Returns `true` if `key` is present. |
| `public bool Remove(TKey key)` | Yes | Removes `key` if present, preserving the relative order of remaining keys. |
| `public TKey KeyAt(int index)` | Yes | Key at `index` in insertion order. |
| `public TValue ValueAt(int index)` | Yes | Value at `index` in insertion order. |
| `public void Clear()` | Yes | Removes all entries. |

### `ObjectTypes`

`public static class ObjectTypes`

Registry mapping C# object classes to four-character Warcraft III object ids and factory functions. Generated startup code in `ObjectRegistry.g.cs` registers all declared objects automatically.

| Member | Local-safe | Description |
| --- | --- | --- |
| `public static int IdOf<T>()` | Yes | Returns the four-character integer id for a declared or standard object class `T`. |
| `public static int FourCC(string code)` | Yes | Converts a 4-character ASCII string (such as `"Hpal"`) to its big-endian 32-bit integer id. |
| `public static void Unit<T>(int id, Func<T> make) where T : Unit` | No | Registers a unit or hero constructor factory for `id`. |
| `public static void Item<T>(int id, Func<T> make) where T : Item` | No | Registers an item constructor factory for `id`. |
| `public static void Destructable<T>(int id, Func<T> make) where T : Destructable` | No | Registers a destructable constructor factory for `id`. |
| `public static void Ability<T>(int id, Func<T> make) where T : Ability` | No | Registers an ability constructor factory for `id`. |
| `public static void Id<T>(int id) where T : class` | No | Registers the four-character id for a data-only object (`Doodad`, `Upgrade`, or `Buff`). |
| `public static void BuffDisplay<T>(int buffId, int carrierId) where T : Buff` | No | Registers the buff id and hidden carrier ability id for a `StandardBuff` subclass. |

### `Doodad`, `Upgrade`, and `MoonwellException`

- **`public class Doodad`** — Data-only base class for `StandardDoodad` declarations (no base class). Doodads have no runtime handle or wrapper; query their id with `ObjectTypes.IdOf<T>()`.
- **`public class Upgrade`** — Data-only base class for `StandardUpgrade` declarations (no base class). Check a player's researched level with `player.LevelOf<T>()`.
- **`public sealed class MoonwellException : Exception`** — Thrown when a Moonwell precondition or invariant fails (such as calling `Dev.Check` with an invalid argument in a development build or looking up an unregistered type in `ObjectTypes.IdOf<T>()`).
