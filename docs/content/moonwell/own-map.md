# Using your own map

After this page, a map that you made in World Editor is the source map of a project. A build reads the map, and adds
your code, your objects, your settings and your assets to a copy of it.

## Save the map as a folder, with Lua

A source map is a map that World Editor saved with two things set:

- **As a folder.** World Editor saves a map as one `.w3x` file or as a folder, which holds the map's files, such as
  `war3map.w3i` and `war3map.lua`. Moonwell reads the folder, and not the one file.
- **With Lua as its script language.** World Editor then writes the map's script as the file `war3map.lua`, and a
  build adds your code to that script.

The hints of Moonwell's own errors name the place of each in World Editor. For a map that is one file, the hint reads
`Save the map in World Editor in folder format (File > Save Map As, Folder).` For a script that lacks what Moonwell
looks for, it reads `Save the map in World Editor with Lua as the script language (Scenario › Map Options).`

The map of a new project, `maps/map.w3x`, is such a map.

## Put it in the project

Put the map's folder into `maps/` in the project folder, and name it in the `[map]` table of `moonwell.toml`:

```toml
[map]
folder = "arena.w3x"
entry = "src/main.yue"
```

The source map is then `maps/arena.w3x`. `map.folder` is a path below `maps/` that ends in `.w3x`
([Settings](./reference/settings#map)), so the folder's name ends that way too. The staged map and the archive of a
build take the same name: `dist/stage/arena.w3x` and, with the `build.folder` of a new project, `dist/bin/arena.w3x`.

The path may have folders in it: `folder = "campaign/arena.w3x"` is the map `maps/campaign/arena.w3x`. Other maps may
stay under `maps/`. The commands read the one that `map.folder` names.

From then on, open `maps/arena.w3x` in World Editor to work on the map, and save it there as before. Commit the folder
with the project. The template's `.gitattributes` has git keep the files under `maps/` byte for byte
([Project layout](./project-layout#what-to-commit)).

What the project holds already must fit the new map. An object of yours whose id a custom object of the map has is an
error ([Objects](./objects#objects-made-in-world-editor)), and so is a setting of a player slot or a force that the
map does not have ([Map settings](./map-settings#players-and-forces)).

## What Moonwell needs of the map

**The script, `war3map.lua`.** `build`, `test`, `check` and `dev` need the script. In it, Moonwell looks for the two
functions that the game calls, `main` and `config`: a line that starts with `function main(` and a line that starts
with `function config(`, as World Editor writes them. A build adds your code to the end of the script, in the copy
that it stages, and the runtime runs your hooks before and after the two functions
([Gameplay code](./gameplay-code#hooks)). Without map settings, that is all the script has to hold. A map setting
that World Editor also writes into the script as a call needs that call to be there:
[Map settings](./map-settings#world-editors-calls-in-war3map.lua) lists them.

**The map info, `war3map.w3i`.** `build` needs the map info to pack the archive, and so does `test` with
`test.archive`. A map setting that goes into the map info needs the file to be of version 18, 25, 28, 31, 32, 33 or
39, and some settings need more than that: [Map settings](./map-settings#what-the-map-must-be) says which. World
Editor 3.0.0.24268 saves version 39. A project without such a setting builds from a map info of another version.

`assets:check` and `assets:sync` need both files to be in the map.

**File names in any letter case.** Moonwell finds a file of the map by its name without regard to letter case, as the
game does: a script named `WAR3MAP.LUA` is the map's script. The staged map keeps each name as the source map has
it.

**What is refused.** A command that opens the source map goes through the whole folder as it opens it. Those
commands are `build`, `test`, `check`, `dev`, `setup`, `assets:check`, `assets:sync`, `settings:check`,
`objects:check` and `objects:eval`. Each refuses three things, wherever in the map they are:

- **A link.** A symbolic link or a Windows junction, whatever it leads to. In the map of a new project,
  `maps/map.w3x`:

  ```text
  error: maps/map.w3x/Textures › Symlinks are not supported: maps/map.w3x/Textures
  hint: Replace the link (or Windows junction) with the real files.
  ```

  A link at `maps` or at the map's folder itself is refused too
  ([Project layout](./project-layout#real-folders-no-links)).
- **Two names that differ only in letter case.** `Textures/` beside `textures/`, or `a.blp` beside `A.blp` in one
  folder. The two would be one path in the map: the hint of the error says that Warcraft III ignores letter case in
  map paths. On a file system that holds two such names in one folder, as on Linux, the error says that the two
  paths `differ only in letter case`.
- **A name Windows cannot hold.** The rules are those for a file under `assets/`, and
  [Assets](./assets#what-is-refused) lists them. On a system that holds such a name, the error says that it
  `cannot be used in a map that Windows tools read`.

## The map's own globals

World Editor writes names of its own into the map's script, as globals. A `gg_` global is a thing of the map, such
as `gg_unit_Hpal_0002` for a unit that is placed on it or `gg_trg_Initialization` for a trigger. A `udg_` global is a
variable of the map, such as `udg_Score`. Your code uses them by these names:

```yue
import "moonwell" as mw

mw.on_main ->
  udg_Score += 1
  SetUnitColor gg_unit_Hpal_0002, PLAYER_COLOR_RED
  print "Score: #{udg_Score}"
```

Use them in a hook. World Editor's `main` is what fills them: it makes the placed units and the triggers. An
`on_main` hook runs after it, so the units are there by then ([Gameplay code](./gameplay-code#hooks)).

**The check knows them.** `build`, `test`, `check` and `dev` read the source map's script at every run: the globals
that it declares before its first function, and the functions that it defines. All of them count as known in the
check for unknown globals ([Gameplay code](./gameplay-code#what-counts-as-known)). A name that the map does not have
yet is reported like any other:

```text
error: src/main.yue:4:3 › Unknown global udg_Score.
hint: Declare your own globals with `global`, or add them to lint.globals in moonwell.toml.
```

Make the variable in World Editor, save the map, and run the command again. `moonwell dev` does not watch the source
map: after a save in World Editor, save a `.yue` file to have it check again, or run `moonwell check`.

**The editor knows them after a check.** The same four commands, and `moonwell setup`, write the names into
`.moonwell/types/map.d.lua`, a file of declarations that your editor reads
([Editor setup](./editor-setup#what-completion-covers)). A `gg_` global gets the type that its name says:

| The name starts with | Its type |
| --- | --- |
| `gg_unit_` | `unit` |
| `gg_trg_` | `trigger` |
| `gg_rct_` | `rect` |
| `gg_cam_` | `camerasetup` |
| `gg_snd_` | `sound` |
| `gg_dest_` | `destructable` |
| `gg_item_` | `item` |

A `gg_` global of another kind is of type `any`. A global without `gg_` gets its type from the value that the script
declares it with: `integer` for `udg_Score = 0`, and in the same way `number`, `string`, `boolean` or an array. One
that is declared as `nil`, or with anything else, is of type `any`.

## The staged map {#the-staged-copy}

A build never changes the source map. `build` and `test` replace `dist/stage/<map.folder>` with a copy of the source
map, and write into the copy what the project adds: your objects, your map settings, your assets, and the script
with your code. `build` then packs the copy into the archive ([Files and caches](./reference/files#dist)). So a
project has two maps, and you see different things in each:

- **In World Editor** you open the source map. It shows what you made there: the terrain, the placed units, the
  triggers, and the map's own name, players and forces. It shows nothing that a build adds: no object from your
  object files, and no value from the `settings` tables of `moonwell.toml`. It shows a file from `assets/` only
  after `assets:sync` wrote it there.
- **In the game**, `moonwell test` starts the game on the staged map, which has all of it.

To look at what a build made in World Editor, open the built map there.

::: warning
Do not work in the built map. The next build replaces the staged map and the archive, and what you saved in them is
gone.
:::

Every build starts from the source map as it is at that moment. After you save the map in World Editor, build
again. And what you take out of the project is not in the next build.

`moonwell assets:sync` is the one command that writes into the source map. It writes your assets there, so that
World Editor shows them, and it needs the map to be closed in World Editor while it runs:
[Assets](./assets#seeing-assets-in-world-editor) describes it. The objects and the map settings have no such
command.

## When Moonwell refuses the map

Each of these errors names the file that it is about, and its hint says what to do.

**The map is not there, or is no folder.** A `map.folder` that names no folder under `maps/`:

```text
error: moonwell.toml › Source map folder maps/arena.w3x not found.
hint: Set map.folder to a folder under maps/ saved by World Editor in folder format.
```

A map that World Editor saved as one file, in the folder's place. This error and the ones after it are from a new
project, whose map is `maps/map.w3x`:

```text
error: maps/map.w3x › Source map maps/map.w3x is not a folder.
hint: Save the map in World Editor in folder format (File > Save Map As, Folder).
```

**The script.** A map without `war3map.lua`:

```text
error: maps/map.w3x/war3map.lua › The map has no war3map.lua.
hint: Save the map in World Editor with Lua as the script language.
```

A script without one of the two functions:

```text
error: maps/map.w3x/war3map.lua › The map script does not define function main().
hint: Save the map in World Editor with Lua as the script language (Scenario › Map Options).
```

Adding your code to the script is the last step of a build's plan, so these two errors come after an error in your
code. A map setting that needs the script refuses it earlier, and for more. Where the script is missing, the error
reads `A map file needed by the configured settings is missing.` Where the script lacks a call that the setting
replaces, the error starts with `Cannot apply map settings to Lua:`
([Map settings](./map-settings#world-editors-calls-in-war3map.lua)).

**The map info.** A map setting that goes into a map info of a version that Moonwell does not edit is refused, with
an error that starts with `Cannot read map settings:` and names `war3map.w3i`
([Map settings](./map-settings#what-the-map-must-be)). A map without that file fails `build` when it packs the
archive:

```text
error: maps/map.w3x › war3map.w3i is missing from the map folder.
hint: Save the source map from World Editor in folder format.
```

`check` packs nothing, so it finds a missing map info only when a map setting goes into that file.

**The map's object data.** A `war3map.w3u` of the source map, or a file like it, that Moonwell cannot read is an
error that names the file ([Objects](./objects#objects-made-in-world-editor)).

**Save the map again.** For a script, a map info or a file of the map's object data that is refused, the way out is
the same: open the source map in World Editor and save it again, as a folder and with Lua as its script language.
That restores the functions and the calls that World Editor writes into the script, also after an edit by hand took
one out. Then run the command again.

## See also

- [Map settings](./map-settings): what a map setting needs of the map, and the calls of the script that it edits.
- [Assets](./assets): `assets:sync`, which writes your assets into the source map for World Editor.
- [Settings](./reference/settings#map): the rule of `map.folder`.
- [Troubleshooting](./reference/troubleshooting#the-map-and-world-editor): a map that Moonwell refuses, and what
  does not show in World Editor.
- [Commands](./reference/commands): the first of the reference pages. It lists every command, with what it reads,
  what it writes and when it fails.
