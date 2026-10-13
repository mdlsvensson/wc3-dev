# Your first map

After this page you have built the project that Moonwell's template makes, played it in the game and changed it. The
page takes `moonwell` to be on your PATH: [Installation](./installation) sees to that.

## Create the project

In the folder where you keep your projects, run:

```sh
moonwell init my-map
```

```text
Created my-map. Check launch.gameExecutable in C:\Users\<you>\.moonwell\config.toml, then: cd my-map && moonwell build
```

`init` makes the folder `my-map`, which must be new or empty, and writes the template project into it: a map that
World Editor saved as a folder, gameplay code in `src/main.yue`, one custom unit in `objects/units.pkl`, the settings
in `moonwell.toml`, and the editor's files. [Project layout](./project-layout) describes every file.

`init` also runs Pkl, which fetches the `moonwell` Pkl package that the project's object file is written against, so
it needs a network connection. The block above is from a machine with Pkl 0.32 or newer on its PATH. When
Moonwell has to download Pkl itself, as [Installation](./installation#pkl) describes, that download comes first, and
`init` prints the line `Downloading Pkl 0.32.1...` before the one above.

The other commands of this page run in the project folder:

```sh
cd my-map
```

## Build it

```sh
moonwell build
```

```text
Downloading YueScript 0.34.3...
Added 1 custom object(s) to 2 file(s).
Packing archive...
Built dist/bin/map.w3x (2 module(s)).
```

The first line is there once. Moonwell downloads the YueScript compiler into its cache folder when it is not there,
and every later build finds it there. The custom object is the template's Captain, which
[a section below](#the-templates-captain) comes to. The two modules are `src/main.yue` and the ids module that it
imports.

The built map is the archive `dist/bin/map.w3x`, one file. The folder `dist/stage/map.w3x` holds the same map as a
folder. It is the staged map: a copy of the source map with what the build adds written into it. The map that the
project builds from, `maps/map.w3x`, is the source map. It is the one you open in World Editor, and no build changes
it.

## Tell Moonwell where the game is

`moonwell test` starts the game, so Moonwell has to know where the game is. That is a setting of your machine and not
of the project: [`launch.gameExecutable`](./reference/settings#config-launch) in your `config.toml`, the file that
the last line of `init` names. The file is `C:\Users\<you>\.moonwell\config.toml` on Windows and
`~/.moonwell/config.toml` on Linux. The install script made it, with the path where Battle.net installs the game on
Windows by default: see [Installation](./installation#your-settings-file).

Open the file and check the path. If your game is somewhere else, write the path of its `Warcraft III.exe` there:

```toml
[launch]
gameExecutable = 'D:\Games\Warcraft III\_retail_\x86_64\Warcraft III.exe'
```

Write the path between single quotes, as here: it is then read as it is, with single backslashes. If the file is
missing, make it with these two lines.

Only `test` needs the game's path. A project builds all the same without it, and without the file: `build`, `check`
and `dev` never start the game.

## Play it

```sh
moonwell test
```

`test` writes the staged map as `build` does. Then it starts Warcraft III with the staged map as the map to load,
and ends: it does not wait for the game.

In the game, the template's code runs. It prints `Moonwell is running.`, and it makes two units for the first player:
the Captain, which is the template's custom unit, and a Footman beside it. Once a second the Captain takes the colour
of a player picked at random.

::: note
On Warcraft III Reforged 3.0.0.24268, the text of `print` stayed on screen for a few seconds. Ally colour mode
(Alt+A), when it was on, painted every unit by alliance and hid the Captain's change of colour: turn it off to see
the change.
:::

When the game's path is missing or wrong, `test` fails with an error that names your `config.toml`. The staged map
is written by then. When the game shows its main menu in place of the map, see
[Troubleshooting](./reference/troubleshooting#the-game-shows-its-main-menu-in-place-of-the-map).

## Name your map

`moonwell.toml` in the project folder holds the project's settings, and the settings of the map among them. Add this
table to the end of the file. Its `name` names the map:

```toml
[settings.info]
name = "My first map"
```

Build again:

```sh
moonwell build
```

```text
Added 1 custom object(s) to 2 file(s).
Applied map settings to 2 internal file(s).
Packing archive...
Built dist/bin/map.w3x (2 module(s)).
```

The second line is new: the build wrote the name into two files of the map. It wrote them in the staged map and the
archive only. The source map keeps the name it has, so World Editor shows that one still.
[Map settings](./map-settings) describes what else the `settings` tables hold.

## Change the code

The gameplay starts in the entry, `src/main.yue`. This is the file as the template has it:

```yue skip
import "moonwell" as mw
import "moonwell.macros" as {:$FourCC}
import "generated.objects" as objects

mw.on_main ->
  print "Moonwell is running."
  -- The Captain (objects/units.pkl) just north of the preplaced heroes, changing player colour every second.
  -- Ally colour mode (Alt+A) overrides player colours; turn it off to see the change.
  unit = CreateUnit Player(0), objects.units.captain, 45, -650, 270
  TimerStart CreateTimer!, 1.0, true, ->
    SetUnitColor unit, GetPlayerColor Player GetRandomInt 0, bj_MAX_PLAYERS - 1
  -- A standard Footman beside it: $FourCC turns the rawcode into the game's integer when the code compiles.
  CreateUnit Player(0), $FourCC("hfoo"), -45, -650, 270
```

`import "moonwell" as mw` gives the code Moonwell's own module, and `mw.on_main` is one of its hooks. It takes a
function, and the map runs that function after its own `main` function, the one World Editor wrote. Make units and
timers inside a hook: code at the top level of a file runs earlier, while the map's script loads.
[Gameplay code](./gameplay-code#hooks) describes the hooks.

Change the text that the first line of the hook prints, line 6 of the file, and leave the rest as it is:

```yue
mw.on_main ->
  print "Hello from my first map."
```

Then run `moonwell test` again. It writes the staged map anew, with your change, and starts the game on it. If it
reports that staging the map failed, close the game and World Editor, in case one of them has `dist/stage` open, and
run the command again ([Troubleshooting](./reference/troubleshooting#staging-the-map-fails)).

## The template's Captain

The template's Captain is a custom unit. The project makes it, in `objects/units.pkl`:

```pkl
// Custom units. Every file under objects/ amends ObjectFile.pkl; gameplay code uses them from src/generated/objects.yue.
amends "@moonwell/ObjectFile.pkl"

units {
  ["captain"] {
    id = "h000"    // the new object's rawcode
    base = "hfoo"  // copies the Footman
    name = "Captain"
    modelFile = #"units\human\TheCaptain\TheCaptain"#
    iconGameInterface = #"ReplaceableTextures\CommandButtons\BTNTheCaptain.blp"#
  }
}
```

The file is written in Pkl. The key, `captain`, is the unit's name in your code. `id` is the new unit's rawcode, of
four characters, and `base` is the standard unit it copies, the Footman. The last three lines set fields of the new
unit: its name, its model and its icon.

A build adds the unit to the object data of the map it builds, in the files `war3map.w3u` and `war3mapSkin.w3u`.
That is the line `Added 1 custom object(s) to 2 file(s).` A build also writes the ids of your objects as a module,
`src/generated/objects.yue`, [the ids module](./objects#the-generated-ids):

```yue
-- GENERATED by Moonwell from objects/**.pkl; do not edit.
export heroes = {}
export units = {
  captain: 1747988528 -- h000
}
export buildings = {}
export items = {}
export abilities = {}
export buffs = {}
export upgrades = {}
```

The number is the rawcode `h000` as the integer that the game's functions take. `main.yue` imports the module as
`objects`, so the line that makes the Captain names the unit by its key and repeats no rawcode:

```yue
unit = CreateUnit Player(0), objects.units.captain, 45, -650, 270
```

The Footman beside it is a standard unit and has no key. There, `$FourCC("hfoo")` is
[a macro](./gameplay-code#macros): it turns the rawcode into its integer when the code compiles.

`build`, `test` and `dev` write the module again when the objects change, so you never edit it.
[Objects](./objects) describes the object files and what an object can set.

## Check as you save

`moonwell dev` checks the project when it starts, and again after every save:

```sh
moonwell dev
```

```text
Check passed: 2 module(s) reachable from main, 0 asset(s).
Watching src/, assets/, objects/, lua/ and the project's settings. Press Ctrl+C to stop.
```

A check works out everything a build works out: it reads the settings, validates the objects, compiles the code and
plans the map. It writes no map.

Save a file with a mistake in it, and `dev` prints the error. With `CreateUnit` in the last line of `src/main.yue`
mistyped as `CreateUnt`, it prints this:

```text
error: src/main.yue:13:3 › Unknown global CreateUnt.
hint: Did you mean CreateUnit? Declare your own globals with `global`, or add them to lint.globals in moonwell.toml.
```

The error names the file, the line and the column. A global that nothing defines is almost always a typing mistake,
so a check stops on one ([Gameplay code](./gameplay-code#unknown-globals)). `dev` goes on watching. Put the name
right and save again, and it prints:

```text
Check passed: 2 module(s) reachable from main, 0 asset(s).
```

Stop `dev` with Ctrl+C. It builds no map and starts no game: to play a change, run `moonwell test`. While `dev` is in
the middle of a check, a `build` or a `test` in the same project stops with an error about another build: wait, and
run it again ([Commands](./reference/commands#one-build-at-a-time)).

`moonwell check` makes one check and ends, with the exit code 0 when the project passes and 1 when it does not:

```sh
moonwell check
```

```text
Check passed: 2 module(s) reachable from main, 0 asset(s).
```

It differs from a check of `dev` in one thing. `dev` writes the ids module as a build does. `check` leaves the
file alone, and fails when it does not match the objects, or is missing in a project with objects
([Commands](./reference/commands#check)).

## See also

- [Commands](./reference/commands): `init`, `build`, `test`, `dev` and `check`, with what each reads and writes and
  when it fails.
- [Settings](./reference/settings): every setting of `moonwell.toml` and of your `config.toml`.
- [Troubleshooting](./reference/troubleshooting#in-the-game): a game that does not start, and a game that shows
  its main menu in place of the map.
- [Project layout](./project-layout): the next page. It goes through every file and folder of the project you made.
