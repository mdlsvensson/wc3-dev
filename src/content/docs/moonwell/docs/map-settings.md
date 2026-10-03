---
title: Map settings
description: Override metadata, players, forces, environment, and map-list pictures in Moonwell's Pkl manifest.
---

Set map overrides in the `settings` block of `moonwell.pkl`. They apply to the
staged copy during `build` and `test`; World Editor keeps the source map's own
values. The template spells out everyday settings as `null` so it inherits
the editor map until you change them.

## Inheritance and clearing

An omitted or `null` field inherits the source map. `false`, `0`, and `""`
are explicit values; an empty string clears text. Text you set is literal;
text you leave alone keeps its `TRIGSTR_*` reference. Moonwell does not rewrite
`war3map.wts`.

```pkl title="moonwell.pkl · settings"
settings {
  info {
    name = "Defend the Village"
    author = ""
    description = "Protect the village from incoming waves."
    recommendedPlayers = "1–4"
  }
  gameplay {
    heroMaxLevel = 25
    foodLimit = 200
  }
}
```

`heroMaxLevel` accepts 1–10000 and `foodLimit` 0–300. They are convenient
typed overrides for `war3mapMisc.txt`.

## Loading screen

```pkl title="moonwell.pkl · loading screen"
settings {
  loadingScreen {
    background = -1
    model = #"war3mapImported\LoadingScreen.mdx"#
    title = "Defend the Village"
    subtitle = "Hold the line"
    text = "Protect the village until the last wave falls."
  }
}
```

`background` is a World Editor campaign background index; `-1` selects a
custom model. `model` is an in-map path, not a project filesystem path.
Import the model and its textures through [assets](/moonwell/docs/assets/).
Loading-screen models require map-info version 25 or later.

## Existing players and forces

```pkl title="moonwell.pkl · player slots"
settings {
  players {
    ["0"] {
      name = "Village defender"
      controller = "user"
      race = "human"
      fixedStart = true
    }
  }
}
```

IDs are zero-based: `"0"` is Player 1 in World Editor, up to `"23"`.
Players must already exist in the source map. Set controllers to `user`,
`computer`, `neutral`, or `rescuable`; races to `selectable`, `human`, `orc`,
`undead`, or `nightelf`. Optional `x` and `y` override the start location.

Forces use zero-based indices too:

```pkl title="moonwell.pkl · an existing custom force"
settings {
  forces {
    ["0"] {
      name = "Defenders"
      allied = true
      alliedVictory = true
      sharedVision = true
    }
  }
}
```

First enable **Use Custom Forces** under **Scenario > Force Properties**,
configure teams, and save in World Editor. Moonwell cannot create or remove
slots or forces, and does not change force membership. `sharedControl` and
`sharedAdvancedControl` are available for an existing force.

## Environment

```pkl title="moonwell.pkl · environment"
settings {
  environment {
    soundEnvironment = "Default"
    waterColor = List(20, 40, 80, 255)
    fog {
      enabled = true
      style = 0
      start = 1000
      end = 5000
      color = List(80, 100, 120, 255)
    }
  }
}
```

Colors contain red, green, blue, alpha in that order, each from 0 to 255.
A color replaces the whole inherited color. `waterColor` enables custom
water tint. Fog's other properties do not enable fog by themselves: use
`enabled`. Style is 0 (linear), 1 (exponential), or 2 (exponential squared);
optional density is 0–1. After inheriting omitted values, start must not
exceed end. An empty sound environment selects `Default`.

## A picture in the map list

```pkl title="moonwell.pkl · preview"
settings {
  info { preview = "preview.png" }
}
```

Place the picture beside `moonwell.pkl` or elsewhere in the project **outside
`assets/`**. The path is relative to the project root. Supported inputs are:

- **PNG**, any color type or bit depth, interlaced or not.
- **TGA**, true color at 24 or 32 bits, with or without RLE compression.
- **BLP**, Warcraft III BLP1, preserved as supplied.

The image must be **256×256 or 512×512**. PNG/TGA inputs become an opaque TGA
in the layout Reforged reads; alpha is dropped and stored pixel colors remain.
Other sizes, unreadable files and unsupported formats fail `check` and builds.

Reforged's map list ignores the old `war3mapPreview.tga` mechanism. Moonwell
puts the picture in the minimap's place, preserves the source minimap as
`war3mapMinimap.blp`, and adds a call at the end of editor `main()` to restore
that normal minimap in the game. PNG/TGA inputs are written as `war3mapMap.tga`;
BLP inputs replace `war3mapMap.blp`. The source map must have its original
`war3mapMap.blp` and no conflicting `war3mapMinimap.blp` or `war3mapMap.tga`.

Start-location markers are placed for a 256×256 picture, so on a 512×512 one
they appear smaller and toward the top left. A gameplay `on_main` hook that
calls `BlzChangeMinimapTerrainTex` runs after Moonwell's restoration and wins;
a map-initialization editor trigger runs earlier and is overridden.

This behavior was measured in the single-player map list on Reforged
3.0.0.24268. Hosted-lobby verification remains deferred.

## Raw constants and interface values

For fields without typed settings, use string-valued section/key mappings:

```pkl title="moonwell.pkl · a raw gameplay constant"
settings {
  gameplayConstants {
    ["Misc"] { ["DefenseArmor"] = "0.05" }
  }
}
```

`gameplayConstants` targets `war3mapMisc.txt`; `gameInterface` uses the same
shape for `war3mapSkin.txt`. Section and key names follow the schema's
identifier rules, match case-insensitively, and cannot duplicate each other
by case. Values are one-line strings; `""` writes an empty value. Unrelated
keys and comments remain, and absent sections/files are created.

Do not conflict with typed settings: `heroMaxLevel = 25` and raw
`MaxHeroLevel = "25"` agree, but `"025"` fails even though it looks numerically
equivalent. Use actual Warcraft section/key names; an arbitrary interface key
can be written successfully without the game using it.

## Check settings and map compatibility

```powershell
moonwell settings:check
moonwell check
```

`settings:check` lists internal map files a build would change, without writing
them. `check` and `dev` validate settings too. Map-info versions 18, 25, 28,
31, 32, 33, and 39 are supported. Players, forces, and environment need version
28 or later and Lua script mode; World Editor 3.00 saves version 39.

The editor stores some settings in Lua as well as map-info data. Moonwell
updates the corresponding map/player/team calls and sound, water, and fog
initialization. Those functions must retain the structure World Editor writes;
a hand-edited script may be refused with a diagnostic naming `war3map.lua`.
Re-save the source in World Editor to restore it, then check again. Your
gameplay modules are separate from those editor functions.
