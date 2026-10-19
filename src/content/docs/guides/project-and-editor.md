---
title: Project & World Editor
description: Project layout, map settings, custom assets, and working with World Editor.
---

## Project layout

One C# project builds one map. The project folder holds:

| Path | What it is |
|---|---|
| `MyMap.csproj` | The C# project; the staged map folder (`build\MyMap\`) and built archive (`build\MyMap.w3x`) take its name. |
| `Map.cs` | The map's settings, balance selection, and starting `GameComponent`s. |
| `Champion/`, `Start.cs`, ... | Your C# source files in any folder layout. |
| `map/` | The World Editor map, saved as a folder (must contain `map\war3map.w3i`). |
| `assets/` | Custom files (models, icons, textures, sounds) copied into the map at the same relative paths. Create it when needed. |
| `ids.json` | Object ids assigned by the build, keyed by full C# class name. Commit this file. |
| `build/` | Output written by `moonwell build`: `build\MyMap\`, `build\MyMap.w3x`, and `build\generated\`. Do not commit it. |

Code can sit in any folder. The build finds the `Map` class and all declared object classes by what they inherit, regardless of file or folder name. Organizing code with one folder per feature keeps a unit, its spells, its buffs, and its components together.

## Map settings (`Map`)

Every map project has exactly one non-abstract class that inherits `Moonwell.Map`. Its constructor sets the map's metadata, balance data set, and starting game components:

```csharp
using Moonwell;

namespace MyMap
{
    public sealed class Settings : Map
    {
        public Settings()
        {
            Name = "Crucible Arena";
            Author = "Moonwell";
            Description = "Fight for the crucible.";
            RecommendedPlayers = "2-6";
            DataSet = DataSet.Custom;
            DataVersion = DataVersion.ForsakenKingdom;
            Components.Add(new Start());
            Components.Add(new Scoring());
        }
    }
}
```

### Properties on `Map`

| Property | Type | Default | Description |
|---|---|---|---|
| `Name` | `string` | `""` | Map name written to `war3map.w3i`. When left `""`, World Editor's value in `map\war3map.w3i` is kept. |
| `Author` | `string` | `""` | Map author written to `war3map.w3i`. When left `""`, World Editor's value is kept. |
| `Description` | `string` | `""` | Map description written to `war3map.w3i`. When left `""`, World Editor's value is kept. |
| `RecommendedPlayers` | `string` | `""` | Recommended players text (such as `"1"` or `"2-4"`). When left `""`, World Editor's value is kept. |
| `DataSet` | `DataSet` | `DataSet.Default` | Game data set: `DataSet.Default`, `DataSet.Custom`, or `DataSet.Melee`. |
| `DataVersion` | `DataVersion` | `DataVersion.ForsakenKingdom` | Game data version: `DataVersion.ReignOfChaos`, `DataVersion.FrozenThrone`, or `DataVersion.ForsakenKingdom`. |
| `Components` | `List<GameComponent>` | Empty | Starting components added to `Game.Instance` in list order when the game starts. |

### Balance sets (`DataSet` and `DataVersion`)

`DataSet` and `DataVersion` match the **Game Data Set** and **Game Data Version** options in World Editor's Map Options dialog. Both the build and the standard classes in `Moonwell.Objects` read the game's balance tables for the pair you choose:

- Any `DataSet` with `DataVersion.ForsakenKingdom` (the default) uses the current base balance tables from Warcraft III 3.0.1 (`3.0.1.24370`).
- `DataSet.Default` or `DataSet.Custom` with `DataVersion.FrozenThrone` uses the Frozen Throne custom balance tables (`custom_v1`).
- `DataSet.Default` or `DataSet.Custom` with `DataVersion.ReignOfChaos` uses the Reign of Chaos custom balance tables (`custom_v0`).
- `DataSet.Melee` with `DataVersion.ReignOfChaos` uses the Reign of Chaos melee balance tables (`melee_v0`); `DataSet.Melee` with `DataVersion.FrozenThrone` reads field values from the base tables and object existence from `custom_v1`.

The build writes your `DataSet` and `DataVersion` choices into the staged `war3map.w3i` so the game loads the same tables your C# declarations read at build time.

## Custom assets (`assets/`)

When your map uses custom models, icons, textures, sounds, or other files, place them under `assets/` at the path Warcraft III expects inside the map archive:

```text
assets/
├── ReplaceableTextures/
│   └── CommandButtons/
│       └── BTNCustomIcon.blp
└── Units/
    └── HeroBanner.mdx
```

During `moonwell build`, every file in `assets/` is copied into the staged map (`build\<Name>\`) and packed into `build\<Name>.w3x` under its relative path (`ReplaceableTextures\CommandButtons\BTNCustomIcon.blp`).

If `assets/` contains a file with the same relative path as a file in `map/`, the file from `assets/` wins and the build prints a note:

```text
note: assets\war3mapMap.blp replaces the map's file
```

## Working with World Editor

World Editor is used for terrain, cliffs, water, doodad placement, regions, cameras, sounds, and preplaced units, items, and destructables.

- Open the `map/` folder in World Editor (**File → Open Map...** and select `map\war3map.w3i`).
- Edit terrain and placed objects, then save the map in place as a folder.
- Never open the Trigger Editor or Object Editor for ordinary work: triggers, map settings, and object declarations live in C#.
- `moonwell build` never modifies `map/` or `assets/`. It always writes to `build\<Name>\` and `build\<Name>.w3x`, and ignores any `war3map.lua` or `war3map.j` saved in `map/`. If the source map was saved with JASS as its script language, the build switches the staged `war3map.w3i` to Lua automatically.

### Placing code-declared objects in World Editor

Because `moonwell build` never writes to `map/`, a new unit, item, or destructable class you declare in C# is written to `build\<Name>\` and `build\<Name>.w3x`, not to `map/`.

When you want to preplace a code-declared object on the terrain in World Editor:

1. Run `moonwell build` so the object is written into `build\<Name>.w3x` (or `build\<Name>\`).
2. Open `build\<Name>.w3x` (or `build\<Name>\war3map.w3i`) in World Editor. Your declared objects appear in the Object Editor and placement palettes.
3. Place the units, items, or destructables on the terrain, and use **File → Save Map As...** (choosing a folder) to overwrite `map/`.

On the next `moonwell build`:

- **Code wins on matching object ids:** any object declared in C# overwrites the copy saved in `map/` with that id.
- **Unmatched objects in `map/` are kept with a warning:** if `map/` contains a custom or modified object in its object files that has no C# declaration, the build keeps it in the staged map and prints a warning naming the object id.
- **The saved script is ignored:** the script World Editor saved into `map\war3map.lua` is discarded and regenerated from your C# project.
