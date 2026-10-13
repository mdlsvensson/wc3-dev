# Settings

This page lists every setting Moonwell reads, with its default, its rule and what it means. Moonwell reads two
files, both [TOML](https://toml.io). `moonwell.toml` is in the project folder and holds the settings of the project,
the same for everyone who works on it. `config.toml` is in your Moonwell folder and holds the settings of your
machine. Every setting has a default, so a file holds only what it changes.

## How a file is read

A command that reads the settings reads both files: `moonwell.toml` first, then your `config.toml`. A mistake in
either is an error that names the file and the setting.

A name is read without regard to letter case: `[Build]` is the table `[build]`, and `Minify` is the setting
`minify`. A value keeps its letter case: `"Warning"` is not `"warning"`.

A name Moonwell does not know is an error. The error names the table and writes the name in lower case:

```text
error: moonwell.toml › 'lint' has invalid keys: unknownglobal
hint: Every setting and its rule is listed under "Settings" in Moonwell's README.
```

For a table Moonwell does not know, the error says `the file has invalid keys:` and the table's name.

A value of the wrong kind is an error too: text where `true` or `false` belongs, a number where text belongs, a
fraction where a whole number belongs.

```text
error: moonwell.toml › 'build.minify' expected type 'bool', got unconvertible type 'string'
hint: Every setting and its rule is listed under "Settings" in Moonwell's README.
```

One error lists every unknown name and every value of the wrong kind in the file. One refusal comes before it, and
alone: a setting of your machine in `moonwell.toml` (see [A setting in the wrong file](#a-setting-in-the-wrong-file)).
When the names and the kinds are right, Moonwell holds each value to its rule, the rules this page lists. A value
outside its rule is an error that names the setting and the rule, such as
`settings.gameplay.heroMaxLevel must be 1 to 10000.` When a file breaks several rules, the error names one of them.

A file that is not valid TOML is refused whole, with the line and the column of the mistake where the TOML reader
gives them. A name that is written twice in one table, in the same letter case, is such a mistake. Two spellings of
one name are not refused: with `minify` and `Minify` in one table, Moonwell uses one of the two values. A file with
`[build]` and `[Build]` is read without an error too. So write each name once.

A name between two pairs of brackets, such as `[[settings.players]]`, is a list. Write the header once for each
entry:

```toml
[[settings.players]]
slot = 0
name = "Red"

[[settings.players]]
slot = 3
name = "Blue"
```

Moonwell reads the entries in the order they are written. An error names an entry by its place in the list, counted
from 0: `settings.players[1].name` is the name of the second entry above. Where a rule says that a value is written
once, the error names the entry that repeats it. A list that is written as a table, such as `[libraries.wrappers]`,
is refused as a value of the wrong kind.

Three lists are then used in an order of their own, whatever order they are written in: Moonwell goes through the
players by their slot, the forces by their index and the libraries by their name.

Text between single quotes is written as it is: a backslash is a backslash. Write a Windows path that way:
`'C:\tools\yue.exe'`. Between double quotes a backslash starts an escape, so the same path needs two for each:
`"C:\\tools\\yue.exe"`.

## The project: `moonwell.toml`

`moonwell.toml` is in the project folder, and a folder is a project because it holds this file. `moonwell init`
writes it with these settings, which are the defaults and nothing else:

```toml
[map]
folder = "map.w3x"
entry = "src/main.yue"

[build]
folder = "dist/bin"
minify = false
protectCallbacks = true

[lint]
unknownGlobals = "error"
globals = []

[assets]
exclude = []
```

An empty `moonwell.toml` means the same.

The tables from `map` to `libraries` are the settings of the project itself. The tables whose names start with
`settings` are the map settings: each one replaces a value of the source map in the map a build makes. A map setting
has no default of its own. One that is not written leaves the map's value as it is, and an empty text is a value:
`author = ""` clears the author ([Inheritance and clearing](../map-settings#inheritance-and-clearing)).
[Map settings](../map-settings#what-a-setting-changes) describes what each one changes, and
[what a build checks against the map itself](../map-settings#what-the-map-must-be), such as
[that a player's slot is there](../map-settings#players-and-forces).

Two words of the rules below:

- A **relative path** does not start with `/`, `\` or a drive letter such as `C:`, has no `..` part, and names a
  folder or a file: a path that is empty, or that holds `.` parts alone, such as `"."`, is refused.
- A **colour** is a list of four whole numbers, each from 0 to 255: red, green, blue and alpha.

### map

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `map.folder` | `"map.w3x"` | A relative path that ends in `.w3x` | The source map: the folder `maps/<map.folder>`. The staged map and the archive of a build get the same name |
| `map.entry` | `"src/main.yue"` | Starts with `src/` and ends in `.yue` | The file a build compiles from. The flag `--entry` of [`build`](./commands#build) names another for one run |

A command that opens the source map also refuses a `map.folder` with a name Windows cannot hold, such as a name with
a `?` in it. [Using your own map](../own-map#put-it-in-the-project) describes the source map.

### build

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `build.folder` | `"dist/bin"` | A relative path. Not `maps`, `src`, `dist/stage` or `dist/test`, nor a folder below one of them, whatever the letter case | The folder [`moonwell build`](./commands#build) writes the archive into, as `<build.folder>/<map.folder>` |
| `build.minify` | `false` | `true` or `false` | `true` shrinks the map's script, and runtime errors lose their line numbers. The flag `--minify` does the same for one run |
| `build.protectCallbacks` | `true` | `true` or `false` | With `true`, the map prints an error that is raised in a callback, such as a timer's. `false` leaves the natives that take a callback as they are, and such an error is lost |

`moonwell build` also refuses a `build.folder` with a name Windows cannot hold.
[Gameplay code](../gameplay-code#an-error-in-a-callback) describes errors in callbacks and
[what `minify` does to the script](../gameplay-code#minified-builds).

### test

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `test.archive` | `false` | `true` or `false` | `true` makes [`moonwell test`](./commands#test) pack the staged map into `dist/test/<map.folder>` and start the game on that file, in place of the folder |

Your `config.toml` may set `test.archive` too, and its value wins: see
[A setting in the wrong file](#a-setting-in-the-wrong-file).

### yue

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `yue.version` | `"0.34.3"` | Three numbers with dots | The version of the YueScript compiler that Moonwell downloads and compiles with |

Moonwell can download two versions of the compiler, 0.34.3 and 0.34.2. Another version passes the rule of the file.
It fails when a command looks for the compiler, with an error that lists the two, unless your `config.toml` has a
`yue.path`. Moonwell then runs that program, and only compares the version it reports with this setting, for a
warning: see [yue](#config-yue) below.

### assets

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `assets.exclude` | `[]` | A list of texts, none of them empty | Files under `assets/` that stay out of the map: the path of a file, or the path of a folder with `/` at its end |
| `[[assets.paths]]` | No entries | A list: the next table has an entry's settings | Each entry gives one file under `assets/` a path of its own in the map |

An entry of `[[assets.paths]]` has two settings:

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `file` | None | Required, and not empty. Written once: an entry that names the file of an entry above it is refused | The file, as its path under `assets/` |
| `path` | None | Required, and not empty | The path the file gets in the map |

```toml
[assets]
exclude = ["credits/"]

[[assets.paths]]
file = "icons/BTNSword.blp"
path = 'ReplaceableTextures\CommandButtons\BTNSword.blp'
```

A file without an entry keeps its path under `assets/` as its path in the map. [Assets](../assets#files-under-assets)
describes which files a build imports, [how the two settings change that](../assets#exact-paths-and-exclusions) and
[what a build refuses among the files](../assets#what-is-refused).

### lint

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `lint.unknownGlobals` | `"error"` | `"error"` or `"warning"` | What a global name that Moonwell does not know is in your code: an error that fails the build, or a warning |
| `lint.globals` | `[]` | A list of Lua names: letters, digits and `_`, not starting with a digit, and no reserved word of Lua such as `end` | Global names that count as known |

[Gameplay code](../gameplay-code#what-counts-as-known) describes which globals Moonwell knows.

### libraries

`[[libraries]]` is a list, with no entries by default. Each entry adds one library to the project:

```toml
[[libraries]]
name = "wrappers"
github = "mdlsvensson/moonwell-wrappers"
tag = "v0.10.1"
```

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `name` | None | Required: letters, digits, `_` and `-`. Written once | The library's name in the project. Its modules are kept in `.moonwell/libraries/<name>/` |
| `github` | None | A repository as `owner/repo` | The repository on GitHub that the library is fetched from |
| `tag` | None | Not empty | The tag of that repository to fetch |
| `path` | None | Not empty | A folder to read the library from, relative to the project folder or absolute. With a `path`, the library is read from the folder, and nothing is fetched |
| `dir` | `""` | Empty, or a relative path | The folder of the library that module names start from. Empty leaves it to the library's own `moonwell-library.json` |

An entry needs a `path`, or both `github` and `tag`.

Two names that differ only in letter case, and a name that Windows keeps for a device, such as `CON`, pass the rules
of the file. They are refused when a command brings the libraries up to date.
[Libraries](../libraries#add-a-library) describes how a library is fetched and what it holds, and
[`moonwell.lock`](../libraries#moonwell.lock), which records what was fetched.

### settings.info

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `settings.info.name` | The map's value | Text without a NUL character | The map's name |
| `settings.info.author` | The map's value | Text without a NUL character | The map's author |
| `settings.info.description` | The map's value | Text without a NUL character | The map's description |
| `settings.info.recommendedPlayers` | The map's value | Text without a NUL character | The map's recommended players, as text |
| `settings.info.preview` | None | Text without a NUL character, and not empty | A picture that the game's map list shows for the map: the path of the file, from the project folder |

[A picture in the map list](../map-settings#a-picture-in-the-map-list) describes the picture that `preview` names.

### settings.loadingScreen

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `settings.loadingScreen.background` | The map's value | A whole number from -1 to 2147483647 | The number of the loading screen's background. `-1` selects a custom model |
| `settings.loadingScreen.model` | The map's value | Text without a NUL character | The model of a custom loading screen |
| `settings.loadingScreen.text` | The map's value | Text without a NUL character | The loading screen's text |
| `settings.loadingScreen.title` | The map's value | Text without a NUL character | The loading screen's title |
| `settings.loadingScreen.subtitle` | The map's value | Text without a NUL character | The loading screen's subtitle |

### settings.gameplay

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `settings.gameplay.heroMaxLevel` | The map's value | A whole number from 1 to 10000 | The highest level of a hero: the gameplay constant `MaxHeroLevel` |
| `settings.gameplay.foodLimit` | The map's value | A whole number from 0 to 300 | The food limit: the gameplay constant `FoodCeiling` |

### settings.players

`[[settings.players]]` is a list, with no entries by default. Each entry changes one player slot of the map:

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `slot` | None | Required: a whole number from 0 to 23. Written once | The slot the entry changes. Slots are counted from 0: slot 3 is the one World Editor shows as Player 4 |
| `name` | The map's value | Text without a NUL character | The player's name |
| `controller` | The map's value | `"user"`, `"computer"`, `"neutral"` or `"rescuable"` | Who controls the slot |
| `race` | The map's value | `"selectable"`, `"human"`, `"orc"`, `"undead"` or `"nightelf"` | The player's race |
| `fixedStart` | The map's value | `true` or `false` | Whether the player has a fixed start location |
| `x` | The map's value | A number from -10000000 to 10000000 | The x coordinate of the player's start location |
| `y` | The map's value | A number from -10000000 to 10000000 | The y coordinate of the player's start location |

[Players and forces](../map-settings#players-and-forces) describes what an entry of this list needs of the map.

### settings.forces

`[[settings.forces]]` is a list, with no entries by default. Each entry changes one force of the map:

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `index` | None | Required: a whole number from 0 to 23. Written once | The force the entry changes. Forces are counted from 0: index 0 is the first force |
| `name` | The map's value | Text without a NUL character | The force's name |
| `allied` | The map's value | `true` or `false` | Whether the players of the force are allied |
| `alliedVictory` | The map's value | `true` or `false` | Whether they have allied victory |
| `sharedVision` | The map's value | `true` or `false` | Whether they share vision |
| `sharedControl` | The map's value | `true` or `false` | Whether they share control |
| `sharedAdvancedControl` | The map's value | `true` or `false` | Whether they share full control |

[Players and forces](../map-settings#players-and-forces) describes what an entry of this list needs of the map.

### settings.environment

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `settings.environment.soundEnvironment` | The map's value | Text without a NUL character | The map's sound environment, by World Editor's name for it, such as `"Dungeon"` |
| `settings.environment.waterColor` | The map's value | A colour | The tint of the map's water. Writing it turns the map's custom water tint on |
| `settings.environment.fog.enabled` | The map's value | `true` or `false` | Whether the map has fog. No other fog setting turns the fog on |
| `settings.environment.fog.style` | The map's value | `0`, `1` or `2` | The style of the fog, as its number |
| `settings.environment.fog.start` | The map's value | A number from -10000000 to 10000000 | Where the fog starts |
| `settings.environment.fog.end` | The map's value | A number from -10000000 to 10000000 | Where the fog ends |
| `settings.environment.fog.density` | The map's value | A number from 0 to 1 | The density of the fog |
| `settings.environment.fog.color` | The map's value | A colour | The colour of the fog |

The fog settings stand in a table of their own:

```toml
[settings.environment]
soundEnvironment = "Dungeon"
waterColor = [20, 40, 80, 255]

[settings.environment.fog]
enabled = true
density = 0.5
```

A `fog.start` above `fog.end` passes the rules of the file. It is refused when a command checks the settings against
the map, where a value that is not written is the map's own: see
[Map settings](../map-settings#fog-start-and-end).

### settings.gameplayConstants and settings.gameInterface

`[[settings.gameplayConstants]]` and `[[settings.gameInterface]]` are two lists, with no entries by default. An
entry of the first sets one key of the map's gameplay constants, and an entry of the second sets one key of its game
interface. Both have the same three settings:

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `section` | None | Required: a name of letters, digits and `_` that does not start with a digit | The section the key is in |
| `key` | None | Required: a name of letters, digits and `_` that does not start with a digit | The key |
| `value` | None | Required: text on one line, without a line break or a NUL character. An empty text is a value | The value of the key, written as text: `"25"`, not `25` |

A list sets a section and key once. Two entries with the same section and key are refused, also when they differ
only in letter case. [Map settings](../map-settings#raw-gameplay-constants-and-game-interface) describes how the
two lists are written into the map.

## Your machine: `config.toml`

`config.toml` is in the folder `.moonwell` in your user folder: `C:\Users\<you>\.moonwell\config.toml` on Windows,
`~/.moonwell/config.toml` on Linux. When the variable `MOONWELL_HOME` is set, the file is in the folder it names.
[Files and caches](./files#the-moonwell-folder) describes that folder.

The install script makes the file when it is missing, with the game's path at the place where Battle.net installs
the game by default, and never changes one that is there (see [Installation](../installation#your-settings-file)).
No command of `moonwell` writes it: Moonwell only reads it. To make the file yourself, write one with the `launch`
table below.

A missing file is no error: every setting then has its default. One command needs a setting of the file:
[`moonwell test`](./commands#test) needs `launch.gameExecutable`, the game's path.

```toml
[launch]
gameExecutable = 'D:\Games\Warcraft III\_retail_\x86_64\Warcraft III.exe'
args = ["-launch", "-windowmode", "fullscreen"]

[test]
archive = true

[yue]
path = 'C:\tools\yue.exe'

[[libraries]]
github = "mdlsvensson/moonwell-wrappers"
path = 'C:\Users\me\Repo\moonwell-wrappers'
```

### launch {#config-launch}

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `launch.gameExecutable` | None | Not empty | The path of the game's program, `Warcraft III.exe`, which `moonwell test` starts |
| `launch.args` | `["-launch", "-windowmode", "windowed"]` | A list of texts | The arguments `moonwell test` starts the game with, before `-loadfile` and the map's path. A list in the file replaces the default list whole: `args = []` passes none |

### test {#config-test}

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `test.archive` | The project's value | `true` or `false` | Whether `moonwell test` starts the game on a packed archive on this machine, whatever `moonwell.toml` says |

### yue {#config-yue}

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `yue.path` | None | Not empty | The path of a `yue` program of your own. Moonwell compiles with it in place of the compiler it downloads |

With `yue.path`, Moonwell downloads no compiler. A path that names no file is an error. When the program reports
another version than the project's `yue.version`, Moonwell warns and goes on.

### libraries {#config-libraries}

`[[libraries]]` is a list, with no entries by default. Each entry names the folder where a library's repository is
on your machine:

| Setting | Default | Rule | Meaning |
| --- | --- | --- | --- |
| `github` | None | Required: a repository as `owner/repo`. Written once, compared without regard to letter case | The repository, as a project's `[[libraries]]` entry names it |
| `path` | None | Required: an absolute path | The folder of that library on this machine |

Every project on your machine that lists the repository then reads the library from the folder, whatever tag the
project names. The repository is matched with the project's without regard to letter case. An entry adds no library
to a project that does not list its repository.
[Libraries](../libraries#work-on-a-library-from-a-checkout) describes working on a library this way.

## A setting in the wrong file

But for `test.archive`, a setting belongs to one file, and the other file refuses it.

A `launch` table or a `yue.path` in `moonwell.toml` is refused, with a hint that names your `config.toml`:

```text
error: moonwell.toml › launch is a setting of this machine and is not read from a project.
hint: Write it in C:\Users\<you>\.moonwell\config.toml.
```

A setting of the project in your `config.toml` is refused as a name Moonwell does not know there. A `map` or a
`build` table gives `the file has invalid keys:` with the table's name, and a `yue.version` gives
`'yue' has invalid keys: version`. Both files have a `[[libraries]]` list, and the two hold different settings: a
`name`, a `tag` or a `dir` in an entry of `config.toml` is refused in the same way.

`test.archive` is the one setting both files may hold. The value of `moonwell.toml` stands unless your `config.toml`
writes one. Then yours decides, either way: `true` there tests on an archive on your machine alone, and `false`
there turns the archive off even when the project asks for it. Write the setting in `moonwell.toml` when everyone on
the project is to test on an archive, and in `config.toml` when only your machine is.
[Troubleshooting](./troubleshooting#the-game-shows-its-main-menu-in-place-of-the-map) says when a game needs it.
