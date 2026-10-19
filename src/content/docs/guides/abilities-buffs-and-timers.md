---
title: Abilities, Buffs & Timers
description: Implement spells, status effects, periodic timers, and automatic cleanup through ownership.
---

Moonwell ties abilities, buffs, and timers together through **ownership** (`Owner` and `Owned`). When a cast, buff, component, or unit ends, everything it owns ends automatically.

## Abilities and casts

Declare a spell by inheriting from a generated ability class in `Moonwell.Objects.Abilities.*` and overriding `OnCast(Cast cast)`:

```csharp
using Moonwell;
using Moonwell.Objects.Abilities.Human;

namespace MyMap;

public class Smite : StormBolt
{
    public Smite()
    {
        Name = "Smite";
        Cooldown = Levels(5f, 5f, 5f);
        ManaCost = Levels(40, 40, 40);
        Damage = Levels(100f, 175f, 250f);
    }

    public override void OnCast(Cast cast)
    {
        if (cast.Target is not null)
        {
            Natives.DestroyEffect(Natives.AddSpecialEffectTarget(
                @"Abilities\Spells\Human\HolyBolt\HolyBoltSpecialArt.mdl",
                cast.Target.Handle,
                "overhead"));
        }
    }
}
```

### Retrieving an `Ability` on a unit

Each `Unit` lazily creates and caches an `Ability` instance per ability id on that unit:

```csharp
Smite smite = hero.AbilityOf<Smite>();
Ability raw = hero.AbilityOf(ObjectTypes.FourCC("AHtb"));
int currentLevel = smite.Level; // 0 if the unit does not know the ability
```

Every `Ability` exposes:

- `Unit` (`Unit`) — the unit holding the ability.
- `Id` (`int`) — the four-character ability id.
- `Level` (`int`) — the current level of the ability on `Unit` (`GetUnitAbilityLevel`).

### `Cast` lifecycle

When a unit triggers a spell effect (`EVENT_PLAYER_UNIT_SPELL_EFFECT`), Moonwell creates a `Cast` (`Cast : Owner`) with:

- `cast.Ability` (`Ability`) — the `Ability` instance on the caster.
- `cast.Caster` (`Unit`) — the casting unit.
- `cast.Target` (`Unit?`) — the targeted unit, or `null` for point or instant spells.
- `cast.X` and `cast.Y` (`float`) — the spell target coordinates (`GetSpellTargetX()` and `GetSpellTargetY()`, even when `Target` is set).
- `cast.Level` (`int`) — the ability level at the moment of the cast.

A `Cast` begins at spell effect and ends when any of the following happens:

1. The spell finishes or stops (`EVENT_PLAYER_UNIT_SPELL_ENDCAST`).
2. The caster begins another cast.
3. The caster leaves the game.

While `Ability.OnCast(Cast)` runs, `Owner.Current` is the `Cast` itself. That makes channelled spells a single `Timer.Every` call inside `OnCast` — when the caster stops channeling, the `Cast` ends and stops the timer automatically:

```csharp
public class ArcaneBeam : AerialShackles
{
    public override void OnCast(Cast cast)
    {
        Timer.Every(0.25f, () =>
        {
            if (cast.Target is not null)
            {
                Natives.UnitDamageTarget(
                    cast.Caster.Handle,
                    cast.Target.Handle,
                    15f * cast.Level,
                    true,
                    false,
                    Natives.ATTACK_TYPE_MAGIC,
                    Natives.DAMAGE_TYPE_MAGIC,
                    Natives.WEAPON_TYPE_WHOKNOWS);
            }
        });
    }
}
```

> [!NOTE]
> During `Unit.OnCast`, `UnitComponent.OnCast`, and `MapComponent.OnUnitCast`, `Owner.Current` is the reacting unit or component rather than the `Cast`. To tie a timer to the `Cast` from one of those hooks, pass `owner: cast` or call `cast.Run(() => ...)`.

## Buffs

A `Buff` is a `UnitComponent` with a duration, an optional periodic tick, a stacking rule, and an optional in-game status icon.

### With or without a status icon

- **With an in-game icon:** Inherit from a generated standard buff in `Moonwell.Objects.Buffs.*` (which itself inherits `StandardBuff : Buff`). At build time, Moonwell writes the buff object and generates a carrier ability (`Aasl` Slow Aura base with `abuf:1`, `atar:1 = "self"`, and `aare:1 = 1f`, hidden on the unit at run time with `BlzUnitHideAbility`) so the buff's icon, tooltip, and special effect art appear on the unit while the buff is active.
- **Without an icon:** Inherit directly from `Moonwell.Buff`. No carrier ability is added to the unit.

```csharp
using Moonwell;
using Moonwell.Objects.Buffs.NightElf;

namespace MyMap;

public class Burn : SlowPoison
{
    public Burn()
    {
        Name = "Burn";
        Tooltip = "Burn";
        ExtendedTooltip = "This unit is taking fire damage over time.";

        Duration = 6f;
        Tick = 1f;
        Stacking = Stacking.Refresh;
        EndsOnDeath = true;
    }

    public override void OnApply()
    {
        // Called when the buff is first applied or refreshed
    }

    public override void OnTick()
    {
        if (Source is not null)
        {
            Natives.UnitDamageTarget(
                Source.Handle,
                Unit.Handle,
                20f,
                false,
                false,
                Natives.ATTACK_TYPE_MAGIC,
                Natives.DAMAGE_TYPE_FIRE,
                Natives.WEAPON_TYPE_WHOKNOWS);
        }
    }

    public override void OnExpire()
    {
        // Called only when Duration elapses naturally (not when removed early by End())
    }
}
```

### Applying and stacking buffs

Apply a buff to a unit with `unit.Apply`:

```csharp
Burn active = target.Apply(new Burn(), source: caster);
float timeLeft = active.Remaining;
```

Configure buff behaviour in its constructor with four protected-set properties:

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `Duration` | `float` | `0f` | Total duration in seconds (`0` means the buff lasts until ended with `End()` or `Remove()`). |
| `Tick` | `float` | `0f` | Periodic interval in seconds for `OnTick()` (`0` disables ticks). |
| `Stacking` | `Stacking` | `Stacking.Refresh` | How applying the same buff class again behaves on the same target. |
| `EndsOnDeath` | `bool` | `true` | Whether the buff ends after death reactions when the unit dies. |

The three `Stacking` modes are:

- **`Stacking.Refresh`** — If the unit already has a buff of the same C# class, the existing buff's `Source` is updated, its timer is reset to `Duration`, `OnApply()` runs again on the existing instance, and `Apply` returns that existing instance.
- **`Stacking.PerSource`** — Refreshes an existing buff of the same C# class from the same `Source`, or adds a separate instance if `Source` differs.
- **`Stacking.Separate`** — Always adds a new buff instance alongside any existing ones.

Because `Buff` inherits `UnitComponent`, a buff can also override `OnDamaged`, `OnDealtDamage`, `OnDeath`, `OnKill`, `OnCast`, `OnItemPickedUp`, and `OnItemDropped`.

> [!IMPORTANT]
> Moonwell manages buff timers and stacking in C#. When a unit dies, buffs with `EndsOnDeath = true` end **after** all `OnDeath`, `OnKill`, and `OnUnitDied` reactions have run, so death reactions can still inspect the buffs that were on the dying unit.

## Timers

Schedule one-shot or repeating work with `Timer.After` and `Timer.Every`:

```csharp
// Runs once after 3 seconds
Timer once = Timer.After(3f, () =>
{
    Unit.Create<Footman>(Player.Get(0), 0, 0, 0);
});

// Runs every 0.5 seconds until ended or until its owner ends
Timer pulse = Timer.Every(0.5f, () =>
{
    // ...
});
```

Every `Timer` exposes:

- `Interval` (`float`) — the period in seconds for `Timer.Every` (`0f` for one-shot `Timer.After` timers).
- `IsPeriodic` (`bool`) — `false` for `Timer.After`, `true` for `Timer.Every`.
- `Remaining` (`float`) — seconds until the next firing (`0` if already ended).
- `End()` — cancels the timer immediately.

### Creation-order tie-breaking

When two timers are due at the same game instant, Moonwell fires them in the order they were created. Because a `Buff` creates its `Tick` timer before its `Duration` expiry timer, a tick that falls on the exact expiration timestamp always runs `OnTick()` before `OnExpire()`.

## Ownership (`Owner` and `Owned`)

Every object with a lifecycle in Moonwell inherits from `Owned`, and objects that can own other objects inherit from `Owner : Owned`:

- **`Owned`:** `Timer`, `Owner`
- **`Owner`:** `Cast`, `Ability`, `Component` (including `Buff`, `GameComponent`, `PlayerComponent`, `UnitComponent`, `ItemComponent`, `DestructableComponent`), `Actor` (`Game`, `Player`, `Unit`, `Hero`, `Item`, `Destructable`)

### `Owner.Current`

Whenever a reaction method or timer callback runs, Moonwell sets `Owner.Current` to the reactor that is running (or `Game.Instance` at the root):

- Inside `Unit.OnEnter`, `Unit.OnDamaged`, etc., `Owner.Current` is the `Unit`.
- Inside a `Component` or `Buff` reaction (`OnAdded`, `OnDamaged`, `OnTick`, `OnGameStart`, etc.), `Owner.Current` is that `Component` or `Buff`.
- Inside `Ability.OnCast(Cast)`, `Owner.Current` is the `Cast`.
- Inside a `Timer` callback, `Owner.Current` is the `Owner` of that timer.

`Timer.After` and `Timer.Every` default their `owner` parameter to `Owner.Current`. You can also pass an explicit `owner:` or switch the ambient owner temporarily with `owner.Run(...)`:

```csharp
Game.Instance.Run(() =>
{
    // This timer belongs to Game.Instance even if started inside a component reaction
    Timer.After(10f, () => SpawnBoss());
});
```

### What happens when an owner ends

Calling `End()` on an `Owned` (or when a `Cast`, `Buff`, `Component`, or `Widget` ends naturally):

1. Calls `protected virtual void OnEnd()` while its owned children are still active.
2. Ends all children it owns in **newest-first (reverse creation) order**.
3. Marks `HasEnded = true` and unlinks the object from its `Owner`'s active child list (`Owned.Owner` remains set to the owner that adopted it; calling `End()` a second time is a no-op).

### Units, items, and death

- **Units and items are owned only when `owner:` is passed:** `Unit.Create` and `Item.Create` default `owner` to `null` so that units spawned inside a component or timer don't vanish when that component or timer ends. Pass `owner: Owner.Current` (or a specific `Owner`) when you want a summoned unit or temporary item to be removed automatically when its owner ends:
  ```csharp
  // Removed automatically when the cast or buff ends
  Unit summon = Unit.Create<WaterElemental>(caster.Player, x, y, 0, owner: cast);
  ```
- **Death is not an end:** A dying unit stays in the game while its death animation and decay timer run, and heroes can be revived. A `Unit` only ends (`HasEnded == true`, `IsGone == true`) when it is removed from the game (`unit.Remove()` or after corpse decay).
