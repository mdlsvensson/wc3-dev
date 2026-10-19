---
title: Actors, Components & Reactions
description: Compose game behaviour with actors, reusable components, and deterministic reaction hooks.
---

Things in a Moonwell map are **actors** (`Actor`). An actor holds **components** (`Component`) and reacts to game events through `virtual` reaction methods on its class and on its attached components.

## Actors

Moonwell provides five actor kinds across two levels:

- **`Game`** — the map-wide singleton (`Game.Instance`), which is also the root `Owner`.
- **`Player`** — one of the 28 player slots (`0` to `Player.MaxSlots - 1`), retrieved with `Player.Get(slot)` or `Player.Of(handle)`.
- **Widgets (`Widget : Actor`):**
  - **`Unit`** (and **`Hero : Unit`**) — a unit or hero on the map.
  - **`Item`** — an item on the ground or in an inventory.
  - **`Destructable`** — a tree, gate, barrel, or other destructable on the map.

Every widget has `IsGone`, which turns `true` once the widget is removed from the game (`Unit.Remove()`, `Item.Remove()`, `Destructable.Remove()`, or when the game removes it after decay).

### Declared classes are runtime instances

When you declare a unit, hero, item, or destructable class in C#, every instance of that object type in the game is an instance of your class — whether created in code, trained at a building, dropped as loot, or placed in World Editor. Instance fields on the class belong to that individual object:

```csharp
using Moonwell;
using Moonwell.Objects.Units.Human;

namespace MyMap;

public class Champion : Paladin
{
    public int Kills { get; private set; }

    public Champion()
    {
        Name = "Champion";
        HitPoints = 950;
    }

    public override void OnKill(Unit victim)
    {
        Kills++;
        Natives.DisplayTextToPlayer(Player.Handle, 0, 0, $"Champion kills: {Kills}");
    }
}
```

Unregistered standard objects (such as a standard `Footman` you haven't replaced or subclassed) are wrapped on sight as plain `Unit`, `Hero`, `Item`, or `Destructable` instances.

### Creating and wrapping actors

Create units in game code with `Unit.Create<T>` or `Unit.Create`:

```csharp
Champion hero = Unit.Create<Champion>(Player.Get(0), 0, 0, 270);
Unit guard = Unit.Create(ObjectTypes.IdOf<Footman>(), Player.Get(0), 200, 0, 270);
```

Create items with `Item.Create` and `ObjectTypes.IdOf<T>()`:

```csharp
Item potion = Item.Create(ObjectTypes.IdOf<PotionOfGreaterHealing>(), 128, 0);
```

When a native returns a raw `unit`, `item`, or `destructable` handle, wrap (or look up) its Moonwell actor with `Of`:

```csharp
Unit? unit = Unit.Of(Natives.GetTriggerUnit());
Item? item = Item.Of(Natives.GetManipulatedItem());
Destructable? tree = Destructable.Of(Natives.GetEnumDestructable());
Player? owner = Player.Of(Natives.GetOwningPlayer(Natives.GetTriggerUnit()));
```

Calling `Unit.Of`, `Item.Of`, `Destructable.Of`, or `Player.Of` with the same live handle always returns the same Moonwell instance.

## Components

A component is a reusable piece of state and behaviour attached to an actor. Each actor kind has its own component base class:

| Component base class | Attached to | Actor property |
| --- | --- | --- |
| `GameComponent : MapComponent` | `Game.Instance` | `Game` |
| `PlayerComponent : MapComponent` | `Player` | `Player` |
| `UnitComponent : Component` | `Unit` / `Hero` | `Unit` |
| `ItemComponent : Component` | `Item` | `Item` |
| `DestructableComponent : Component` | `Destructable` | `Destructable` |

### Attaching components

Add starting components in a `Map`, `Unit`, `Hero`, `Item`, or `Destructable` constructor via `Components.Add(...)`. For units, items, and destructables, the generated factory re-runs those `Components.Add(...)` calls whenever an instance enters the game:

```csharp
public class Champion : Paladin
{
    public Champion()
    {
        Components.Add(new Fury());
    }
}
```

You can also attach components at run time with `Add`:

```csharp
Game.Instance.Add(new WaveSpawner());
Player.Get(0).Add(new BountyTracker());
hero.Add(new Thorns());
potion.Add(new ExpireOnDrop());
```

Multiple instances of the same component class can be attached to the same actor.

### Querying and removing components

Every `Actor` supports querying and removing its attached components by type (`where T : Component`, including base classes):

```csharp
bool hasFury = hero.Has<Fury>();
Fury? first = hero.Get<Fury>();
List<Fury> all = hero.GetAll<Fury>();
int total = hero.ComponentCount;

hero.Remove(first!);       // removes a specific component instance
int removed = hero.RemoveAll<Fury>(); // removes all matching components
```

A component is also an `Owner` (and `Owned`), so calling `component.End()` removes it from its actor and ends any timers or other objects it owns.

### Component lifecycle hooks

Override `OnAdded()` and `OnRemoved()` on any `Component` to run setup and cleanup when the component is attached to or detached from its actor:

```csharp
public class RegenerationAura : UnitComponent
{
    protected override void OnAdded()
    {
        Timer.Every(1f, () =>
        {
            Natives.SetWidgetLife(Unit.Handle, Natives.GetWidgetLife(Unit.Handle) + 10f);
        });
    }

    protected override void OnRemoved()
    {
        // Timers started in OnAdded already belong to this component and end automatically.
    }
}
```

## Reactions

Rather than creating and wiring `trigger` handles manually, override `virtual` reaction methods on your object classes or components.

### Reaction methods by class

| Reaction method | `Unit` / `Hero` | `UnitComponent` (and `Buff`) | `Item` | `ItemComponent` | `Destructable` | `DestructableComponent` | `Ability` | `MapComponent` (`GameComponent`, `PlayerComponent`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `OnGameStart()` | — | — | — | — | — | — | — | Yes |
| `OnEnter()` | `protected` | — | `protected` | — | `protected` | — | — | — |
| `OnLeave()` | `protected` | — | `protected` | — | `protected` | — | — | — |
| `OnUnitEnter(Unit unit)` | — | — | — | — | — | — | — | Yes |
| `OnDamaged(Damage damage)` | Yes | Yes | — | — | — | — | — | — |
| `OnDealtDamage(Damage damage)` | Yes | Yes | — | — | — | — | — | — |
| `OnUnitDamaged(Damage damage)` | — | — | — | — | — | — | — | Yes |
| `OnDeath(Unit? killer)` | Yes | Yes | — | — | — | — | — | — |
| `OnKill(Unit victim)` | Yes | Yes | — | — | — | — | — | — |
| `OnUnitDied(Unit dying, Unit? killer)` | — | — | — | — | — | — | — | Yes |
| `OnDeath()` | — | — | — | — | Yes | Yes | — | — |
| `OnCast(Cast cast)` | Yes | Yes | — | — | — | — | Yes | — |
| `OnUnitCast(Cast cast)` | — | — | — | — | — | — | — | Yes |
| `OnItemPickedUp(Item item)` | Yes | Yes | — | — | — | — | — | — |
| `OnItemDropped(Item item)` | Yes | Yes | — | — | — | — | — | — |
| `OnPickedUp(Unit by)` | — | — | Yes | Yes | — | — | — | — |
| `OnDropped(Unit by)` | — | — | Yes | Yes | — | — | — | — |

### Modifying damage

`OnDealtDamage`, `OnDamaged`, and `OnUnitDamaged` receive a `Damage` object:

- `damage.Target` (`Unit`) — the unit taking damage.
- `damage.Source` (`Unit?`) — the unit dealing damage, if any.
- `damage.Amount` (`float`, read/write) — the damage amount. Setting `damage.Amount` updates the game's event damage via `BlzSetEventDamage`.
- `damage.IsAttack` (`bool`) — `true` when the damage came from a basic attack.

```csharp
public class ManaShield : UnitComponent
{
    public override void OnDamaged(Damage damage)
    {
        damage.Amount *= 0.5f;
    }
}
```

### Dispatch order

Every event dispatches in a fixed, deterministic order. Within an actor, its own class method runs first, followed by its components in the order they were added (operating on a snapshot so adding or removing components mid-reaction is safe):

1. **Game start (`OnGameStart`):**
   - `Game.Instance` components (`OnGameStart()`)
   - `Player` components across slots `0`..`27` (`OnGameStart()`)
2. **Unit enters map:**
   - The unit's starting components are added (`OnAdded()`), and then `unit.OnEnter()`
   - `Game.Instance` components (`OnUnitEnter(unit)`)
   - `unit.Player` components (`OnUnitEnter(unit)`)
3. **Unit damaged (`Damage`):**
   - Source unit: `source.OnDealtDamage(damage)` → `source` components (`OnDealtDamage(damage)`)
   - Target unit: `target.OnDamaged(damage)` → `target` components (`OnDamaged(damage)`)
   - `Game.Instance` components (`OnUnitDamaged(damage)`)
   - `target.Player` components (`OnUnitDamaged(damage)`)
   - `source.Player` components (`OnUnitDamaged(damage)`), if `source` exists and belongs to a different player than `target`
   - If `damage.Amount` was changed by any reaction, `BlzSetEventDamage(damage.Amount)` is applied after all reactions complete.
4. **Unit dies:**
   - Dying unit: `dying.OnDeath(killer)` → `dying` components (`OnDeath(killer)`)
   - Killer unit (if any): `killer.OnKill(dying)` → `killer` components (`OnKill(dying)`)
   - `Game.Instance` components (`OnUnitDied(dying, killer)`)
   - `dying.Player` components (`OnUnitDied(dying, killer)`)
   - `killer.Player` components (`OnUnitDied(dying, killer)`), if `killer` exists and belongs to a different player than `dying`
   - Buffs on `dying` with `EndsOnDeath == true` end after all death reactions have run.
5. **Spell cast (`Cast`):**
   - `ability.OnCast(cast)` (with `Owner.Current` set to `cast`)
   - Caster unit: `caster.OnCast(cast)` → `caster` components (`OnCast(cast)`)
   - `Game.Instance` components (`OnUnitCast(cast)`)
   - `caster.Player` components (`OnUnitCast(cast)`)
6. **Item picked up or dropped:**
   - Item: `item.OnPickedUp(unit)` / `item.OnDropped(unit)` → `item` components
   - Unit: `unit.OnItemPickedUp(item)` / `unit.OnItemDropped(item)` → `unit` components
7. **Destructable dies:**
   - `destructable.OnDeath()` → `destructable` components (`OnDeath()`)

### Lazy triggers and error isolation

- **Lazy trigger registration:** Moonwell only registers Warcraft III event triggers for events that at least one active class or attached component actually overrides.
- **Error isolation:** Each reaction invocation is wrapped in an error handler. If one reaction throws an exception, Moonwell reports the C# file and line on screen and in `Documents\Warcraft III\CustomMapData\Moonwell\log.txt`, and the remaining reactions for that event still run.
