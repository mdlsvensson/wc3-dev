---
title: Getting Started
description: Install Moonwell, create a map from the template, and run it in Warcraft III.
---

## Prerequisites

Moonwell requires:

- The **.NET 10 SDK** (`dotnet --version` 10.0 or later)
- **Warcraft III: Reforged** 3.0.1
- `common.j` and `Blizzard.j` in `Documents\Warcraft III\JassHelper`

Install the project template and the `moonwell` command once:

```sh
dotnet new install Moonwell.Templates
dotnet tool install --global Moonwell.Cli
```

## Create and run a map

Create a new map project from the `moonwell` template and launch it:

```sh
dotnet new moonwell -n MyMap
cd MyMap
moonwell run
```

`moonwell run` compiles the C# project, writes the map's object data and Lua script into `build\MyMap\`, packs `build\MyMap.w3x`, and starts Warcraft III in windowed mode with the built archive loaded.

When the map starts, Player 1 has a **Champion** — a custom Paladin declared in C# — at their start location, with three hostile footmen nearby to fight. Learn **Smite** in the hero skill menu and cast it on a footman: the screen prints the spell's level and the target's name. Each kill prints the Champion's running kill count.

## What the template contains

A new map project has five C# files and a World Editor map folder (`map/`):

```text
MyMap/
├── MyMap.csproj
├── Map.cs
├── Start.cs
├── Champion/
│   ├── Champion.cs
│   ├── Fury.cs
│   └── Smite.cs
└── map/
```

### `Map.cs`

`Map.cs` declares the single class in the project that inherits `Map`. Its constructor sets the map's properties and adds the `GameComponent`s the game starts with:

```csharp
using Moonwell;

namespace MyMap
{
    /// <summary>The map's settings, and the components the game starts with.</summary>
    public sealed class Settings : Map
    {
        public Settings()
        {
            Name = "MyMap";
            Author = "";
            Description = "A map made with Moonwell.";
            RecommendedPlayers = "1";
            Components.Add(new Start());
        }
    }
}
```

### `Start.cs`

`Start` is a `GameComponent` added by `Settings`. Its `OnGameStart` reaction runs when the game starts, spawning a `Champion` for Player 1 (`Player.Get(0)`) and three standard `Footman` units for Neutral Hostile:

```csharp
using Moonwell;
using Moonwell.Objects.Units.Human;

namespace MyMap
{
    /// <summary>Gives the first player a champion at their start location, and puts three footmen nearby to fight.</summary>
    public sealed class Start : GameComponent
    {
        public override void OnGameStart()
        {
            var player = Player.Get(0);
            var x = Natives.GetPlayerStartLocationX(player.Handle);
            var y = Natives.GetPlayerStartLocationY(player.Handle);
            Unit.Create<Champion>(player, x, y, 270f);

            var enemy = Player.Get(Natives.PLAYER_NEUTRAL_AGGRESSIVE);
            for (var i = 0; i < 3; i++)
            {
                Unit.Create<Footman>(enemy, x - 200f + i * 200f, y + 600f, 270f);
            }
        }
    }
}
```

### `Champion/Champion.cs`

`Champion` inherits the standard Human `Paladin` from `Moonwell.Objects.Units.Human`. Its constructor changes its name, adds 200 hit points to the Paladin's base value, replaces `HolyLight` with `Smite` in its hero abilities, and gives every `Champion` unit a `Fury` component when it enters the game:

```csharp
using Moonwell.Objects.Abilities.Human;
using Moonwell.Objects.Units.Human;

namespace MyMap
{
    /// <summary>A Paladin of the map's own: Smite in place of Holy Light, and Fury from the start.</summary>
    public sealed class Champion : Paladin
    {
        public Champion()
        {
            Name = "Champion";
            HitPoints = HitPoints + 200;
            HeroAbilities.Remove<HolyLight>();
            HeroAbilities.Add<Smite>();
            Components.Add(new Fury());
        }
    }
}
```

### `Champion/Smite.cs`

`Smite` inherits the standard Human `StormBolt` ability from `Moonwell.Objects.Abilities.Human`. Its constructor sets per-level damage with `Levels` and computes each level's tooltip from that damage with `PerLevel`. Its `OnCast` reaction runs when a unit casts `Smite`, reading the target's localized name inside `Local.For` on the caster's machine only:

```csharp
using Moonwell;
using Moonwell.Objects.Abilities.Human;

namespace MyMap
{
    /// <summary>A Storm Bolt with damage of its own, which tells the caster's owner whom it was thrown at.</summary>
    public sealed class Smite : StormBolt
    {
        public Smite()
        {
            Name = "Smite";
            Damage = Levels(75f, 150f, 225f);
            Tooltip = PerLevel(level => $"Deals {Damage[level]} damage and stuns the target.");
        }

        public override void OnCast(Cast cast)
        {
            // A unit's name is in each player's own language, so it is read on the owner's machine only.
            Local.For(cast.Caster.Player, () =>
            {
                var target = cast.Target == null ? "nothing" : Natives.GetUnitName(cast.Target.Handle);
                Natives.DisplayTextToPlayer(cast.Caster.Player.Handle, 0f, 0f, "Smite, level " + cast.Level + ", at " + target);
            });
        }
    }
}
```

### `Champion/Fury.cs`

`Fury` is a `UnitComponent` attached to each `Champion`. Its `kills` field belongs to that unit's component instance, and `OnKill` runs each time the unit kills another unit:

```csharp
using Moonwell;

namespace MyMap
{
    /// <summary>Counts the unit's kills and tells its owner each time.</summary>
    public sealed class Fury : UnitComponent
    {
        private int kills;

        public override void OnKill(Unit victim)
        {
            kills++;
            Natives.DisplayTextToPlayer(Unit.Player.Handle, 0f, 0f, "Kills: " + kills);
        }
    }
}
```

## Upgrading to 0.1.2

Moonwell 0.1.2 updates its generated natives and standard objects to Warcraft III **3.0.1** (`3.0.1.24370`):

- **New 3.0.1 natives:** the `Blz` equipment natives (the old names still exist but are going away), `BlzUnitHeal`, `BlzRemoveEffect`, `BlzUnitIsAlive`, `BlzResetUnitTalents`, the HUD-scale natives, and others. `Moonwell.Analyzers` knows their sync tags.
- **Changes that can break compiling:**
  - `BlzSetTerrainFogStyleBJ` takes an `int`.
  - `bj_destroyEffectAsyncEffect` / `bj_destroyEffectAsyncTime` → `bj_destroyOrRemoveEffectAsyncEffect` / `bj_destroyOrRemoveEffectAsyncTime`.
  - `AIs2` is now `ItemAttackSpeedBonus`, and `AIsx` is now `ItemAttackSpeedBonusAIsx`.
  - `ItemBash10252` → `ItemBash10`, `ItemBash15251` → `ItemBash15`, `ItemAuraCommand8` → `ItemAuraCommand5`, `ItemHugeFlailWS` → `ItemHugeFlailTC`.
  - The doodad properties `IsADecal`, `DecalSortPriority`, and `IsWater` gain `HD` at the end (`IsADecalHD`, `DecalSortPriorityHD`, `IsWaterHD`).
  - `ArchwayNSra` → `ArchwayNSr0`.

## Next steps

- [Project & World Editor](/guides/project-and-editor/) — how `Map.cs`, `map/`, `assets/`, `ids.json`, and `build/` fit together, and how to place code-declared objects in World Editor.
- [Objects](/guides/objects/) — declaring units, heroes, items, abilities, buffs, destructables, doodads, and upgrades in C#.
- [Actors, Components & Reactions](/guides/components-and-reactions/) — writing components and reaction methods across units, items, destructables, players, and the game.
