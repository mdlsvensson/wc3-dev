# Map settings

After this page you can set the map's name, its players, its forces, its environment and its gameplay constants from
the project, and give the map a picture of its own in the game's map list. The `settings` tables of `moonwell.toml`
hold these map settings. Each one replaces a value of the source map in the map that a build makes:

```toml
[settings.info]
name = "My Map"
author = ""

[settings.gameplay]
heroMaxLevel = 25
foodLimit = 200

[settings.environment]
waterColor = [20, 40, 80, 255]

[[settings.players]]
slot = 3
name = "Blue"
controller = "computer"
```

`moonwell init` writes none of them, so a new project keeps everything its map has. Write only what you want to
change. [Settings](./reference/settings#settings.info) lists every map setting with its rule. This page describes
what the settings change in the map, and what they need of it.

## What a setting changes

A setting changes the map that a build makes, and never the source map. `moonwell build` and `moonwell test` copy
the source map, `maps/<map.folder>`, to the staged map, `dist/stage/<map.folder>`, and write the settings into the
copy ([Files and caches](./reference/files#dist)). The archive that `build` packs has them too. World Editor opens
the source map, so it keeps showing the map's own values. To see a setting there, open the built map.

The settings go into these files of the map:

| Settings | Files of the map |
| --- | --- |
| [`settings.info`](./reference/settings#settings.info): `name`, `author`, `description`, `recommendedPlayers` | `war3map.w3i`, the map info. For `name` and `description`, `war3map.lua` too |
| [`settings.loadingScreen`](./reference/settings#settings.loadingscreen) | `war3map.w3i` |
| [`[[settings.players]]`](./reference/settings#settings.players), [`[[settings.forces]]`](./reference/settings#settings.forces), [`settings.environment`](./reference/settings#settings.environment) | `war3map.w3i` and `war3map.lua`. For the `name` of a player or a force, `war3map.w3i` alone |
| [`settings.gameplay`](./reference/settings#settings.gameplay), [`[[settings.gameplayConstants]]`](./reference/settings#settings.gameplayconstants-and-settings.gameinterface) | `war3mapMisc.txt` |
| [`[[settings.gameInterface]]`](./reference/settings#settings.gameplayconstants-and-settings.gameinterface) | `war3mapSkin.txt` |
| `settings.info.preview` | The map's minimap and `war3map.lua`: see [A picture in the map list](#a-picture-in-the-map-list) |

`war3map.lua` is the map's script. World Editor writes some of a map's settings into it as calls, and Moonwell
edits those calls to match: see [World Editor's calls in `war3map.lua`](#world-editors-calls-in-war3map.lua).

A build works the settings out after it has compiled your code, and before it imports the assets and adds your
gameplay to `war3map.lua`. So an error in your code comes before a setting that the map cannot take. A value that
breaks a rule of the file comes before both: it is refused when `moonwell.toml` is read. A build that wrote settings
says so:

```text
Applied map settings to 3 internal file(s).
```

A build adds none of the files that the settings write to `war3map.imp`, the map's index of imports.

## Inheritance and clearing

A setting that is not written keeps the map's value. An entry of `[[settings.players]]` or `[[settings.forces]]`
changes what it writes, and leaves the rest of that slot or force as the map has it.

`false`, `0` and `""` are values: `author = ""` clears the map's author, and `fixedStart = false` takes a player's
fixed start location away. To keep the map's value, leave the setting out.

A text of the map can be a reference into the map's file of texts, `war3map.wts`: the name of a new project's map is
`TRIGSTR_001`, in the map info and in the script. A text that you set is written as the text itself, in the place of
the reference. A text that you leave alone keeps its reference. Moonwell never writes `war3map.wts`.

## Colours and fog

A colour is `[red, green, blue, alpha]`, each a whole number from 0 to 255. It replaces the map's colour whole.

- `waterColor` also turns on the map's custom water tint.
- `fog.enabled` turns the fog on or off. No other fog setting turns it on: on a map whose fog is off, a `fog.color`
  alone is written into the map info, and the fog stays off.

### Fog start and end

`fog.start` must not be above `fog.end`. A rule of the file cannot say that, because either value may be the map's
own. So Moonwell compares the two when it reads the map info, and takes the map's value for the one that is not
written. The map of a new project has its fog off, and its map info holds a fog start of 3000 and a fog end of 5000.
There, this setting alone is refused:

```toml
[settings.environment.fog]
start = 6000
```

```text
error: maps/map.w3x/war3map.w3i › settings.environment.fog: start, end and density must be finite, and start must not exceed end.
hint: Check fog values in World Editor or set valid fog values in settings.
```

The error names the map info, not `moonwell.toml`, also when the file writes both values. Write a `start` at or
below the map's `end`, or write both. Moonwell makes the comparison whenever a fog setting is written.

## Players and forces

An entry of `[[settings.players]]` changes one player slot, and an entry of `[[settings.forces]]` one force:

```toml
[[settings.players]]
slot = 3
name = "Blue"
controller = "computer"

[[settings.forces]]
index = 0
name = "Heroes"
sharedVision = false
```

Slots and forces are counted from 0: `slot = 3` is the slot World Editor shows as Player 4, and `index = 0` is the
first force.

**Existing slots and forces only.** A setting changes a slot or a force that the map has. Settings never add one or
remove one, and no setting changes which players are in a force. A slot that the map does not have is an error:

```text
error: maps/map.w3x/war3map.w3i › settings.players: player 7 does not exist in the source map.
hint: Create this player slot in World Editor first.
```

Make the slot in World Editor, under Scenario > Player Properties, and save the map. A force that the map does not
have is refused in the same way, with `settings.forces: force 5 does not exist in the source map.`

**Custom forces.** The settings of a force need a map with custom forces. In World Editor, open Scenario > Force
Properties, turn on Use Custom Forces, set up the teams, and save the map. On a map without custom forces, a setting
of a force that the map has is refused with `force overrides require custom forces enabled in the source map`.

**Race.** `race = "selectable"` also marks the slot's race as selectable, as World Editor does for the race it shows
as Selectable. A race by its name, such as `"orc"`, takes that mark away.

::: note
Seen on Warcraft III Reforged 3.0.0.24268, on one machine. The lobby showed the account name of the person playing
in their slot, not the name the map gives that player. That name was seen in World Editor's Player Properties, on
the built map. With the map's fixed player settings on, the lobby let a race be chosen for a slot whose race the
settings made `"selectable"`. A game that players on other machines join was not checked.
:::

## What the map must be

The settings that go into the map info need a map info that Moonwell can read. Those are `settings.info` but for
`preview`, `settings.loadingScreen`, the players, the forces and the environment.

- **The version of the map info.** `war3map.w3i` must be of version 18, 25, 28, 31, 32, 33 or 39. World Editor
  3.0.0.24268 saves version 39.
- **A loading screen's model.** `settings.loadingScreen.model` needs version 25 or above.
- **Players, forces and environment.** `[[settings.players]]`, `[[settings.forces]]` and `settings.environment` need
  version 28 or above, and a map whose script language is Lua.
- **The script.** `settings.info.name`, `settings.info.description`, the players, the forces, the environment and
  the picture need the map's `war3map.lua`, with the functions that World Editor writes into it: see the next
  section.

`settings.gameplay` and the two lists of raw constants need none of this: their two text files are made when the
map has none.

A map that cannot take a setting is refused, with an error that names the file of the map:

```text
error: maps/map.w3x/war3map.w3i › Cannot read map settings: unsupported war3map.w3i version 17.
hint: Open and re-save this map in World Editor; extended settings require Lua script mode.
```

When a map is refused, open it in World Editor and save it again, as a folder and with Lua as its script language
([Using your own map](./own-map#save-the-map-as-a-folder-with-lua)). That page also describes
[what a source map must be](./own-map#what-moonwell-needs-of-the-map).

## World Editor's calls in `war3map.lua`

World Editor writes some of a map's settings twice: into the map info, and as calls into the map's script,
`war3map.lua`. Moonwell edits those calls, so that the script says what the map info says with your settings in it:

| Setting | Function | What Moonwell does there |
| --- | --- | --- |
| `settings.info.name`, `settings.info.description` | `config()` | Replaces `SetMapName` and `SetMapDescription` |
| A player's `controller` | `InitCustomPlayerSlots()` | Replaces the slot's `SetPlayerController` |
| A player's `race` | `InitCustomPlayerSlots()` | Replaces the slot's `SetPlayerRacePreference` and `SetPlayerRaceSelectable` |
| A player's `fixedStart` | `InitCustomPlayerSlots()` | Adds the slot's `ForcePlayerStartLocation` after its `SetPlayerStartLocation`, or removes it |
| A player's `x`, `y` | `config()` | Replaces the `DefineStartLocation` of the slot's start location |
| A force's `allied`, `alliedVictory`, `sharedVision`, `sharedControl`, `sharedAdvancedControl` | `InitCustomTeams()` | Adds calls at its end: `SetPlayerState` with `PLAYER_STATE_ALLIED_VICTORY` for each player of the force, and `SetPlayerAllianceStateAllyBJ`, `SetPlayerAllianceStateVisionBJ`, `SetPlayerAllianceStateControlBJ` and `SetPlayerAllianceStateFullControlBJ` for each pair of them |
| `settings.environment.soundEnvironment` | `main()` | Writes `NewSoundEnvironment` |
| `settings.environment.waterColor` | `main()` | Writes `SetWaterBaseColor` |
| A setting of `settings.environment.fog` | `main()` | Writes `SetTerrainFogEx`, or `ResetTerrainFog` when the fog is off |
| `settings.info.preview` | `main()` | Adds `BlzChangeMinimapTerrainTex` as the last statement |

For the environment, Moonwell removes the call of that kind that `main()` has and writes the new one before
`CreateAllUnits()` or `InitBlizzard()`, whichever `main()` calls first. `SetTerrainFogEx` takes the red, green and
blue of the fog's colour: its alpha is in the map info alone.

Five kinds of settings are in the map info alone, and no call is edited for them: `author`, `recommendedPlayers`,
the loading screen, a player's `name` and a force's `name`.

Moonwell needs the script to be as World Editor writes it:

- Each function that the table names for your settings is defined once.
- A call that Moonwell replaces is there once: once in `config()`, or once for the slot.
- For any setting of a player, its `name` too, `config()` calls `InitCustomPlayerSlots()`, and that function sets
  the slot's start location as the map info has it.
- For the five settings of a force that the table names, `config()` calls `InitCustomTeams()`, and the
  `SetPlayerTeam` calls there put the players into the force that the map info has them in.
- For the environment, `main()` calls `CreateAllUnits()` or `InitBlizzard()`.

A script that is not so, after an edit by hand to one of those functions for example, is refused. The error names
`war3map.lua`. This one is for a `settings.info.name` on a map whose `config()` has no `SetMapName`:

```text
error: maps/map.w3x/war3map.lua › Cannot apply map settings to Lua: expected exactly one direct SetMapName in config() call, found 0.
hint: Re-save the map in World Editor to restore its generated Lua initialization.
```

A script that Moonwell cannot read as Lua is refused too, with an error that starts with
`Cannot safely read map Lua:`.

Saving the map again in World Editor restores the calls. Your gameplay code is not affected: the edits are in World
Editor's own functions, and a build adds your code to the script after them.

## A picture in the map list

`settings.info.preview` names a picture that the game's map list shows for the map, in the place of its minimap:

```toml
[settings.info]
preview = "preview.png"
```

The path starts at the project folder, where `moonwell.toml` is, and a path that leaves that folder is refused. So
is a picture under `assets/`, because a build imports every file there into the map as well
([Assets](./assets#files-under-assets)). Keep the picture beside `moonwell.toml`.

### The file

The picture is a `.png`, a `.tga` or a `.blp` file of 256×256 or 512×512 pixels. The ending of the name decides how
the file is read, in any letter case. For the choice between the two sizes, read the note under
[What a build does](#what-a-build-does): it says what was seen of the game's start location markers on each.

- **A PNG** of any kind is read: 8 or 16 bits, colour, grey or palette, interlaced or not.
- **A TGA** must be true colour with 24 or 32 bits a pixel, with or without run-length compression. One with a
  colour map, or with rows that run from right to left, is refused.
- **A BLP** must be a Warcraft III BLP, a file that starts with `BLP1`, with JPEG or palette content. It goes into
  the map as it is.

Moonwell writes a PNG or a TGA into the map as a TGA of one layout: not compressed, 32 bits a pixel, every pixel
opaque. Transparency is dropped, and each pixel keeps the colour that the file stores for it.

A file of another size, format or ending is an error that names the picture:

```text
error: small.tga › The preview picture is 64x64 pixels; it must be 256x256 or 512x512.
hint: Resize the picture. 256x256 is where the game's start location markers sit right.
```

::: warning
On Warcraft III Reforged 3.0.0.24268, a `war3mapMap.blp` that held the bytes of a TGA or a DDS file closed the game
the moment the map was selected in the single-player map list. The picture is part of the map that every player
gets; a game that players on other machines join was not checked. That is why Moonwell takes only the files above,
and why another file fails `build`, `test`, `check`, `dev` and `settings:check`.
:::

### What a build does

In the staged map, a build puts your picture in the place of the map's minimap file, `war3mapMap.blp`:

- It keeps World Editor's minimap, under the name `war3mapMinimap.blp`.
- It writes a BLP picture as `war3mapMap.blp`. For a PNG or a TGA it removes `war3mapMap.blp` and writes the picture
  as `war3mapMap.tga`.
- It adds one call as the last statement of `main()` in `war3map.lua`,
  `BlzChangeMinimapTerrainTex("war3mapMinimap.blp")`, so that the game itself draws World Editor's minimap.

As with every setting, the source map stays as it is.

::: note
Measured on Warcraft III Reforged 3.0.0.24268, in the single-player map list. The list showed the map's
`war3mapMap.blp`, and ignored a `war3mapPreview.tga`. It showed `war3mapMap.tga` when the map had no
`war3mapMap.blp`. The game drew its start location markers over the picture, placed for a picture of 256×256
pixels: on one of 512×512 they sat smaller and toward the top left. With the build's call, the game itself showed
World Editor's minimap.
:::

### A minimap of your own

Gameplay code that calls `BlzChangeMinimapTerrainTex` in an `on_main` hook, or after the hooks have run, runs after
the build's call, so its minimap is the one that stays ([Gameplay code](./gameplay-code#hooks)). A World Editor
trigger that sets the minimap at map initialization runs inside `main()`, before the build's call, and is
overridden. Set the minimap from gameplay code instead.

### What the source map must have

- **Its `war3mapMap.blp`.** World Editor writes that file at every save. Without it the error says that the map has
  no `war3mapMap.blp`, and its hint is to open and save the map in World Editor.
- **No file named `war3mapMinimap.blp` or `war3mapMap.tga`.** A build with a picture writes those names. The error
  says that the map already has the file, and its hint is to remove it from the map.
- **A `main()` in its `war3map.lua`,** as for the other calls Moonwell edits.

## Raw gameplay constants and game interface

`[[settings.gameplayConstants]]` and `[[settings.gameInterface]]` set any section and key of two text files of the
map: `war3mapMisc.txt`, which holds World Editor's Gameplay Constants, and `war3mapSkin.txt`, which holds its Game
Interface. One entry sets one key:

```toml
[[settings.gameplayConstants]]
section = "Misc"
key = "MaxHeroLevel"
value = "25"

[[settings.gameInterface]]
section = "CustomSkin"
key = "Test"
value = "value"
```

`CustomSkin` and `Test` only show how an entry is written: the key is invented, and nothing says that Warcraft III
reads it. [Settings](./reference/settings#settings.gameplayconstants-and-settings.gameinterface) has the rules of
`section`, `key` and `value`. This is how an entry is written into its file:

- A value is written as it is, after `Key=`. An empty value writes an empty `Key=`.
- A section and a key match the file's names without regard to letter case, and the file keeps its own spelling.
- Every line of the section that sets the key is replaced. A key that the section does not have is added at the
  section's end, and a section that the file does not have is added at the file's end, both in your spelling.
- A file that the map does not have is made. Every other line of the file stays as it is.
- Moonwell finds the file itself without regard to letter case: a map with a `war3mapskin.txt` gets the entries in
  that file.

The two settings of [`settings.gameplay`](./reference/settings#settings.gameplay) are written the same way, into the
section `[Misc]` of `war3mapMisc.txt`: `heroMaxLevel` as `MaxHeroLevel`, and `foodLimit` as `FoodCeiling`. You may
set such a key in `[[settings.gameplayConstants]]` as well, and then the two must agree exactly, as text.
`heroMaxLevel = 25` beside the entry above, with `value = "25"`, is accepted. With `value = "025"` it is an error:

```text
error: moonwell.toml › Conflicting typed and raw gameplay constant: MaxHeroLevel.
hint: Remove the raw MaxHeroLevel override or make it equal to settings.gameplay.heroMaxLevel.
```

## Checking settings

`moonwell settings:check` checks the settings against the source map without building, and lists the files of the
map that a build would change:

```sh
moonwell settings:check
```

For the settings at the top of this page, in a new project, it prints:

```text
  war3map.w3i
  war3map.lua
  war3mapMisc.txt
Map settings valid: 3 internal file(s) would change during build.
```

With `preview = "preview.png"` added, three lines follow `war3mapMisc.txt`, and the count is 6. A file that a build
removes has `(removed)` after its name:

```text
  war3mapMinimap.blp
  war3mapMap.blp (removed)
  war3mapMap.tga
```

The command reads the two settings files, the source map and the picture. It compiles nothing and writes nothing
into the map. `moonwell check` and every check of `moonwell dev` check the settings in the same way, as one step of
the build they plan, and so do `build` and `test`.

An error says where the mistake is by the file it names:

- **`moonwell.toml`** for a mistake in the settings themselves: a value outside its rule, a raw constant that
  disagrees with a typed one, a `preview` that names no file.
- **A file under `maps/<map.folder>/`** for something the map cannot take, such as `maps/map.w3x/war3map.w3i` for a
  player slot that is not there.
- **The picture** for a picture that Moonwell does not take.

When several settings are refused, the error names one of them.

## See also

- [Settings](./reference/settings#settings.info): every `settings` table, with the rule of each setting.
- [Commands](./reference/commands#settings-check): `settings:check`, and what it reads, writes and fails on.
- [Files and caches](./reference/files#dist): the staged map and the archive.
- [Troubleshooting](./reference/troubleshooting#the-map-and-world-editor): a map that Moonwell refuses, and a
  setting that does not show in World Editor.
- [Libraries](./libraries): the next page. It adds a library of gameplay code to the project.
