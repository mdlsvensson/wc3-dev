---
title: Map settings
description: Configure map metadata, players, forces, environment, and gameplay in Pkl.
---

Edit `map-settings.pkl` in your **framework repository** to override settings
stored in internal map files. Build and playtest apply these settings to the staged
map; your World Editor source map stays unchanged.

## Configure a map

```pkl
amends "map-settings-schema.pkl"

info {
  name = "My Map"
  author = "Your name"
  description = "A cooperative adventure."
  recommendedPlayers = "1-4"
}

loadingScreen {
  title = "Welcome"
  subtitle = "A cooperative adventure"
  text = "Work together to win."
}

gameplay {
  heroMaxLevel = 25
}
```

The file is optional. If it is absent, the build uses the source map's settings.
An omitted field or `null` in `info` or `loadingScreen` inherits its source-map
value; an empty string explicitly clears text. Removing an override restores the
source-map value on the next build.

## Metadata and loading screens

Both groups update `war3map.w3i`. Map name and description also update the
editor-generated `config()` function in Lua.

| Field | Value |
| --- | --- |
| `info.name` | Map name |
| `info.author` | Author text |
| `info.description` | Map description |
| `info.recommendedPlayers` | Player recommendation text, such as `"1-4"`; does not change player slots |
| `loadingScreen.title` | Loading-screen title |
| `loadingScreen.subtitle` | Loading-screen subtitle |
| `loadingScreen.text` | Loading-screen description |
| `loadingScreen.model` | In-map path to a custom loading-screen model |
| `loadingScreen.background` | World Editor campaign background index, or `-1` for a custom model |

All fields except `background` accept strings or `null`. `background` accepts
`null` or an integer from `-1` to `2147483647`; use a valid World Editor index for
your game version. Text may contain line breaks but cannot contain NUL characters.

To use a custom loading screen, place its model at
`assets/LoadingScreen/LoadingScreen.mdx`, along with any textures it needs, then set:

```pkl
loadingScreen {
  background = -1
  model = "LoadingScreen\\LoadingScreen.mdx"
}
```

This block belongs inside the same `map-settings.pkl` module. The model path must
match its imported map path. Setting `model` does not import files or choose the
custom background automatically. See [Import assets](/moonwell/docs/assets/) for
path mappings and texture dependencies.

Unchanged metadata, including existing `TRIGSTR` references, is preserved. An
overridden text field receives the supplied text directly; it does not rewrite
shared entries in `war3map.wts`.

## Players, forces, and environment

These groups update both map metadata and editor-generated Lua. Player keys are
existing **zero-based slot IDs**; force keys are existing **zero-based force
indices**. Quote the keys because Pkl renders them as JSON object keys.

```pkl
players {
  ["0"] {
    controller = "user"
    race = "human"
    fixedStart = true
    x = 128.0
    y = -896.0
  }
}
forces {
  ["0"] {
    name = "Allies"
    allied = true
    alliedVictory = true
    sharedVision = true
  }
}
environment {
  waterColor = new {
    80
    120
    180
    255
  }
  fog {
    enabled = true
    start = 1000.0
    end = 5000.0
    density = 0.5
  }
}
```

| Group | Supported fields |
| --- | --- |
| Player | `name`, `controller`, `race`, `fixedStart`, `x`, `y` |
| Force | `name`, `allied`, `alliedVictory`, `sharedVision`, `sharedControl`, `sharedAdvancedControl` |
| Environment | `soundEnvironment`, `waterColor`, `fog` |
| Fog | `enabled`, `style`, `start`, `end`, `density`, `color` |

Controllers: `"user"`, `"computer"`, `"neutral"`, `"rescuable"`.
Races: `"selectable"`, `"human"`, `"orc"`, `"undead"`, `"nightelf"`.
Colours contain four integers (red, green, blue, alpha), each from 0 to 255.
Fog styles are 0 (linear), 1 (exponential), or 2 (exponential squared); density
ranges from 0 to 1. Set `enabled = true` to enable fog; other fog fields inherit
unless explicitly overridden. Water colour overrides enable custom water tint.
An empty sound environment selects the game's default sound environment.

Omitted or null fields inherit the source. Slot counts, force membership and
start-location priorities remain inherited. Enable custom forces in World Editor
before overriding force flags. Missing slots or forces, inconsistent start/team
assignments, and unsupported Lua initialization shapes fail validation.

## Gameplay constants and interface settings

Use `gameplay.heroMaxLevel` (1–10000) and `gameplay.foodLimit` (0–300) for
typed overrides of `[Misc] HeroMaxLevel` and `FoodCeiling`. Raw mappings remain
available for other constants. Conflicting typed and raw values are rejected.
These limits validate the configuration; they do not make custom progression
systems or every game version support every possible value.


| Group | Internal file | Purpose |
| --- | --- | --- |
| `gameplayConstants` | `war3mapMisc.txt` | Gameplay constants |
| `gameInterface` | `war3mapSkin.txt` | Game interface settings |

Both groups map section names to field/value mappings. Use the exact section and
field names from the game's data or a source map saved with the corresponding
World Editor setting. For example, the typed `heroMaxLevel` override above writes
`HeroMaxLevel=25` in the `[Misc]` section of `war3mapMisc.txt`.

Values are **strings in Warcraft's raw text format**, including numbers and
comma-separated lists. The framework validates the structure, but does not check
whether Warcraft recognizes a key or accepts its value.

- Section and field names must start with a letter or underscore, followed by
  letters, digits, or underscores.
- Values must be single-line strings without NUL characters. Use `""` for an
  empty value; `null` is not supported in these mappings.
- Duplicate section or field names differing only in case are rejected in the
  configuration.
- Existing sections and keys are matched without regard to case. Unspecified
  entries and unrelated comments are retained; missing entries are added.
- Missing files are created in staging when the corresponding group has entries.

An empty value does not delete a key. To stop overriding a source-map entry, remove
it from the Pkl mapping and rebuild.

## Validate and apply

Run commands from the framework repository root:

| Command | Effect |
| --- | --- |
| `deno task settings:check` | Evaluate Pkl and validate planned changes without writing map files |
| `deno task build` | Apply settings to the staged map and package the archive |
| `deno task test` | Apply settings to the staged map and launch Warcraft III |
| `deno task dev` | Validate edits to the existing `map-settings.pkl` and `map-settings-schema.pkl` files |
| `deno task test:settings:pkl` | Run the schema integration test using the real Pkl CLI |

Pkl must be available on `PATH` or through `PKL_EXECUTABLE`. Check, build, and test
use the source map selected by `config.json` and optional `config.local.json`.
See [Commands and configuration](/moonwell/docs/reference/).

The watcher does not apply settings or rebuild the map. Run `build` or `test`
after validation finishes. If you add a settings file while the watcher is
running, restart it to watch that file.

Overrides are written only to `dist/<mapFolder>/` and the archive produced by
`build`. There is no source-map sync command for settings, so reopening the source
map in World Editor still shows its original values.

## Supported settings and formats

Metadata overrides support map-info versions **18, 25, 28, 31, 32, 33, and 39**.
Version 18 cannot set a custom loading-screen model. Unsupported versions fail
when a metadata or loading-screen override is requested. Unrelated binary data,
including newer fields, is preserved rather than reserialized.

Player, force and environment overrides require a Lua map with map-info version
28 or later and recognizable editor-generated initialization. The writer patches
specific calls while preserving unrelated triggers and unit placement code.
Terrain geometry, slot creation/removal, force membership, weather, lighting,
and HD water parameters remain editor-authored. This is an override layer for
supported settings, not a replacement for the World Editor.

Version 39 is regression-tested against a frozen World Editor 3.0.0.24268 map,
including its extra loading-screen and player fields. Older metadata formats
have synthetic compatibility tests. Binary, Lua, Pkl, and archive tests do not
replace an in-game playtest; game acceptance has not been verified automatically.
Unknown properties, invalid values, truncated records, and incompatible Lua
report errors before the build replaces staging.
