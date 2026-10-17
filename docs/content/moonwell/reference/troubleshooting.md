# Troubleshooting

This page lists what can go wrong with Moonwell, by what you see: an error of `moonwell`, or something in World
Editor, in the game or in your editor that is not what you expect. Each entry says what the cause is and what to do,
and links the page that explains it.

An error of `moonwell` reads like this one:

```text
error: src/main.yue:13:3 › Unknown global CreateUnt.
hint: Did you mean CreateUnit? Declare your own globals with `global`, or add them to lint.globals in moonwell.toml.
```

The first line names the file that the error is about, with the line and the column where Moonwell knows them, and
then says what is wrong. The line that starts with `hint:` says what to do about it, and most errors have one. An
error that lists several problems prints the first 20, each in this form, and then a line that counts the rest. An
error that starts with `internal error:` is a bug in Moonwell, and its second line asks you to report it.

Run in a project, every command but `init` and `completion` also adds each line it writes for you to the log,
`dist/moonwell.log`, with the time before it. So an error that has left your terminal is still there
([Commands](./commands#output-and-the-log-file)).

## Installing

### `moonwell` is not found after the install

**On Windows** the install script adds the folder of `moonwell.exe` to your user PATH, and to the PATH of the
PowerShell window it ran in. A terminal that was already open does not see the change: open a new one.

**On Linux** the script does not change your PATH. When `~/.local/bin`, the folder of the program, is not on it,
the script says so and prints the line that adds it. Run that line once, then open a new terminal.

[Installation](../installation#install-moonwell) has the line and both folders.

### Pkl is missing or too old

Moonwell needs no Pkl of yours. When the `pkl` on your PATH is not Pkl 0.32 or newer, or when there is none,
Moonwell downloads Pkl 0.32.1 into its cache folder and runs that. Where the `pkl` on your PATH is older than 0.32
it also prints a warning, which says that a `pkl` command you type yourself still runs the old one. Neither is an
error. When the download fails, the command fails with an error that names the address: check your connection, and
run the command again.

A `pkl` command that you type, such as `pkl project resolve`, runs the `pkl` on your PATH, and the one in the cache
is not there. Run `moonwell setup` in a project with object files: it copies Moonwell's Pkl into the `bin` folder
of the cache, and when no `pkl` is on your PATH it prints the line that adds that folder
([Installation](../installation#pkl)). With an older `pkl` on your PATH, `setup` makes the copy and does not print
that line, and a `pkl` command that you type still runs the one that comes first on your PATH: take the old `pkl`
off your PATH and run `moonwell setup` again, or put Pkl 0.32 or newer in its place.

## Building

### A global is unknown

`build`, `test`, `check` and `dev` stop with `Unknown global` and the name, at its file, line and column. The name
is a global that nothing defines, which is almost always a typing mistake, and the hint offers the known names that
come near it.

- Where the name is mistyped, correct it.
- A global of your own is declared with `global`, or listed in `lint.globals` of `moonwell.toml`.
- A global of the map, such as a `gg_` or a `udg_` name, is known once the source map has it: see
  [A new `gg_` global is unknown](#a-new-gg-global-is-unknown).

[Gameplay code](../gameplay-code#what-counts-as-known) lists what counts as known, and
[what the check does not see](../gameplay-code#what-is-not-checked).

### A file with a bitwise operator does not build

The error says `YueScript compiled this file but could not rewrite its Lua`, or in a minified build
`could not minify its Lua`. The compiler compiles the operators `&`, `|`, `~`, `<<` and `>>`, but its next step,
which prepares the Lua for the map, does not read them. Move the code that uses one into a Lua module under `lua/`,
which goes into the map as it is written
([Gameplay code](../gameplay-code#bitwise-operators-and-floor-division)).

### A module is not found

The error says `Module '<name>' not found.` and names the file that imports the module. No file gives a module of
that name. The hint lists where one can come from: a file under `src/`, a file under `lua/`, or a library that
`moonwell.toml` lists ([Gameplay code](../gameplay-code#a-module-that-is-missing-or-has-no-code)).

When the file that the error names is below `.moonwell/libraries/`, a library of the project requires a module of
another library, which the project does not list. Add that library to `moonwell.toml`
([Libraries](../libraries#a-library-that-needs-another)).

### The generated ids are stale

`moonwell check` and `moonwell objects:check` fail with an error that names `src/generated/objects.yue`, the ids
module. It says `The file does not match the project's objects.` or, in a project with objects,
`The file is missing, but the project has objects.` The two commands compare the module with the object files and
do not write it. Run `moonwell build`, `moonwell test` or `moonwell dev`, which write it, and commit the file
([Objects](../objects#the-generated-ids)).

### The declared ids are stale

`moonwell check` fails with `The file does not match the declared objects.` and names
`src/generated/declared-ids.json`, the file of declared ids. The file is missing, or holds other kinds, keys or ids
than the objects that the code declares, or it is there in a project whose code declares nothing. `check` compares
the file and does not write it. Run `moonwell build`, `moonwell test` or `moonwell dev`, which write it or remove it,
and commit the change ([Objects](../objects#ids-of-declared-objects)).

An error that says `The declared object ids cannot be used:` names the same file, which is not a mapping of kinds to
keys and ids, or holds an id of the wrong form. Put it right, or delete it: the next build then chooses new ids for
every declared object without an `id` of its own.

### A build fails in code that runs at build

In a project that declares objects with `moonwell.declare`, a build runs the entry once, with every module that it
requires while it loads, in the run that reads the declarations, and the game's natives do not exist there
([Objects](../objects#how-a-build-reads-the-declarations)). An error in that run fails `build`, `test`, `check` and
`dev` at its file and line, and the hint says which of three cases it is:

- **It says `with no natives: call natives inside functions.`** The top-level code calls a native, or another
  global that is `nil` in that run. Move the call into a function, such as an `on_main` hook.
- **It says `Fix this call of moonwell.declare`.** A declaration is wrong. The message says what is wrong, such as
  a `category` that is not a kind of object, a function of the level without `levels`, or a key declared twice.
  [What a declaration takes](../objects#what-a-declaration-takes) has the rules.
- **It says `and this error ended that run.`** Another error was raised at the top level, such as one that uses a
  global of the source map's `war3map.lua`, which does not exist in that run either. Put it right, or move the code
  into a function.

In a minified build an error in a YueScript module names the file without a line: build without minifying to find
the line. An error in a Lua module keeps its line.

### The program and the project's Pkl package differ in version

A command that reads the object files stops with an error that names `PklProject`. It says that the Pkl package
`does not match Moonwell CLI`, with the version of each. The project's `PklProject` names the `moonwell` Pkl
package that its object files are written for, and the package and the program must have the same major and minor
version. Change the version in `PklProject` and run `pkl project resolve`, or install the Moonwell that the project
names: [Installation](../installation#a-project-with-object-files) shows both.

An error that says `PklProject.deps.json is missing.` is put right the same way: run `pkl project resolve` in the
project folder ([Objects](../objects#pklproject)).

### Another build is running

The error names `dist/.lock`, the build lock, and says `Another Moonwell build is running in this project.` Either
another command is at work in the same project, such as a `moonwell dev` that is in the middle of a check, or a
command ended without the chance to remove its lock. Wait, and run the command again. When no process has the
number that the hint names, delete `dist/.lock` ([Commands](./commands#one-build-at-a-time)).

### A link is refused

The error says that a path `is a link`, or it says `Symlinks are not supported:` and gives the path. Moonwell
writes into real files and folders. It refuses a symbolic link or a Windows junction on the way to what it writes
and at the folders it reads the project from, and anywhere in the source map and under `assets/`. Remove the link,
or put the real files in its place ([Project layout](../project-layout#real-folders-no-links)).

### A library's tag moved

The error names `moonwell.lock` and a library. It says that the library's tag `moved from` one commit `to` another
`since moonwell.lock recorded it`, or that the files of the tag `are not those moonwell.lock recorded`. Moonwell
fetched the library and got other code than the file records, and it takes nothing of that code. When you mean to
take the tag as it is, delete the library's record from `moonwell.lock` and run the command again
([Libraries](../libraries#moonwell.lock)).

### Staging the map fails

`moonwell build` or `moonwell test` fails with an error that starts with `Staging the map into`. The two commands
replace the staged map, `dist/stage/<map.folder>`, and something kept them from it, as when the game or World
Editor has `dist/stage` open. Close the game and World Editor, and run the command again
([Commands](./commands#build)).

## The map and World Editor

### Moonwell refuses the map

The error names the source map, `maps/<map.folder>`, or a file in it, and its hint says what to do. For a map that
is not there, the error names `moonwell.toml`, and its message names the folder.
[Using your own map](../own-map#when-moonwell-refuses-the-map) goes through these errors: a map that is not there
or is one file, a script without `main` or `config`, a map info that is missing, and object data that Moonwell
cannot read. For a script, a map info or a file of the map's object data that is refused, open the source map in
World Editor and save it again, as a folder and with Lua as its script language.

Two more kinds of error name a file of the map:

- A map setting that the map cannot take:
  [a player slot or a force that the map does not have](../map-settings#players-and-forces),
  [a map info of a version that Moonwell does not edit](../map-settings#what-the-map-must-be), or
  [a call that the script lacks](../map-settings#world-editors-calls-in-war3map.lua).
- A link, two names that differ only in letter case, or a name that Windows cannot hold, anywhere in the map's
  folder: see [What Moonwell needs of the map](../own-map#what-moonwell-needs-of-the-map).

### An asset or a setting does not show in World Editor

A build never changes the source map, and the source map is the one that World Editor opens. Your assets, your map
settings and your objects go into the staged map and the archive
([Using your own map](../own-map#the-staged-copy)).

- **Assets.** Run `moonwell assets:sync`, with the map closed in World Editor. It writes the assets into the
  source map ([Assets](../assets#seeing-assets-in-world-editor)).
- **Map settings and objects.** They have no such command. To look at them in World Editor, open the built map
  there, and do not work in it: the next build replaces it
  ([Map settings](../map-settings#what-a-setting-changes)).

### `assets:sync` refuses a file you edited {#assets-sync-refuses-a-file-you-edited}

The error names a file of the source map and says that it `was modified in the map after assets:sync wrote it.`
`assets:sync` owns the files that it wrote into the source map, and never writes over one that is not as it wrote
it. The same error stops `assets:check` and a build. Move your edited copy into `assets/`, or put the file in the
source map back as it was, and run `moonwell assets:sync` again
([Assets](../assets#seeing-assets-in-world-editor)).

## In the game

### The game shows its main menu in place of the map

`moonwell test` starts the game on the staged map, which is a folder. A game may not load a map that is a folder.

::: note
Warcraft III Reforged 3.0.1 showed its main menu for a map that is a folder, with no error, and loaded a map that
is packed into one file.
:::

For such a game, set `test.archive`:

```toml
[test]
archive = true
```

`moonwell test` then packs the staged map into `dist/test/<map.folder>` and starts the game on that file
([Commands](./commands#test)). Write the setting in `moonwell.toml` when everyone on the project is to test on an
archive, and in your `config.toml` when only your machine is
([Settings](./settings#a-setting-in-the-wrong-file)).

### The game does not start

`moonwell test` fails with an error that names your `config.toml`. It says `launch.gameExecutable is not set.`,
`Game executable not found:` with a path, that the path `is not a file`, or that Moonwell cannot run the program.
`test` starts the program that `launch.gameExecutable` names, and the path there is missing or wrong: the install
script writes the path where Battle.net installs the game on Windows by default. Write the path of your
`Warcraft III.exe` into the file, between single quotes
([Your first map](../first-map#tell-moonwell-where-the-game-is)). [Settings](./settings#config-launch) has the
rule of the setting.

### An error names a line of `war3map.lua`

An error that your own code catches, with `pcall` or `xpcall`, does not reach Moonwell's runtime. Its message names
a line of `war3map.lua`, the one script that holds every module of the map. Give the message to `format_error` of
the `moonwell` module, which turns that place into the source file and the line, or look the line up in
`dist/stage/<map.folder>/war3map.lua` ([Gameplay code](../gameplay-code#an-error-you-catch-yourself)).

### `moonwell.declare` fails in the game

The runtime reports an error, such as `[moonwell] on_main failed:`, whose message says `moonwell.declare:`, a kind
and a key, and `was not declared at build: call moonwell.declare at the top level of a module the entry reaches.`
The build reads a declaration only when it runs while the entry loads: at the top level of the entry, or of a module
that is required while the entry loads. In the game `declare` returns the id that the build gave. A call inside a
function that only the game runs, such as a hook, or in a module that only such a function requires, has no id.
Move the declaration to the top level of a module that the entry requires as it loads, and use the id it returns
inside the function ([Objects](../objects#declared-objects-in-the-game)). A message that says `moonwell.id_of:`
names a kind and a key that no declaration the build read has: declare that object at the top level of a module
that the entry requires as it loads, or name a key that is declared.

### An error in a callback is not printed

A map that Moonwell builds prints an error that is raised in a callback, such as the function of a timer or the
action of a trigger. When you see none, one of these is the case:

- **The guard is off.** `build.protectCallbacks = false` in `moonwell.toml` builds the map without it
  ([Settings](./settings#build)).
- **The guard does not cover the call.** It covers the eight natives that take a function, called by their global
  names. It does not cover an error that your code catches itself, a function that the game runs through
  `ExecuteFunc`, or a coroutine that you resume yourself.
- **The error repeats.** The runtime prints an error the first time, and then at its 10th, its 100th and its 1000th
  time, and so on.
- **The callback ran before `main`.** For an error in a callback that the top-level code of a module runs, `main`
  has not started: the runtime keeps the line, and prints it when `main` starts. For a callback that a `config`
  hook runs, the runtime keeps the line too: see [An error in a hook](../gameplay-code#an-error-in-a-hook).

[Gameplay code](../gameplay-code#an-error-in-a-callback) describes the guard and what it prints.

### The game closes when the map is selected in the map list

`war3mapMap.blp` is the picture that the game's map list shows for the map.

::: warning
On Warcraft III Reforged 3.0.0.24268, a `war3mapMap.blp` that held the bytes of a TGA or a DDS file closed the
game the moment the map was selected in the single-player map list.
:::

To give the map a picture of your own, name it in `settings.info.preview`: Moonwell takes a `.png`, a `.tga` or a
`.blp` file of 256×256 or 512×512 pixels, and refuses any other at the build
([Map settings](../map-settings#the-file)).

## The editor

### The editor completes nothing

- **VS Code has another folder open.** lua-language-server reads `.luarc.json` only from the first folder of the
  workspace. Open the project folder itself, the one that holds `moonwell.toml`
  ([Editor setup](../editor-setup#open-the-project-folder-itself)).
- **One of the two extensions is missing.** Completion in a `.yue` file needs the YueScript extension and the Lua
  extension ([Editor setup](../editor-setup#install-vs-code-and-the-two-extensions)).
- **The project is a fresh clone.** Git leaves `.moonwell/` out, and that folder holds what your editor reads. Run
  `moonwell setup` ([Editor setup](../editor-setup#what-else-setup-does)).
- **Only the modules of a library are missing.** `setup` compiles nothing: run `moonwell check`
  ([Editor setup](../editor-setup#modules-of-a-library)).

### `yue` is not found

VS Code's YueScript extension runs the compiler, `yue`, from your PATH, and has no setting for its place. Moonwell
keeps the compiler in its cache folder, which is not on your PATH. Run `moonwell setup` in the project. It copies
the compiler into the `bin` folder of the cache, and when the `yue` on your PATH is missing or is another version
than the project's, it prints a warning with a command that adds the folder to your PATH. Run that command once,
open a new terminal and restart VS Code ([Editor setup](../editor-setup#run-moonwell-setup)).

An error of `moonwell` that says `yue.path does not exist:` is about your `config.toml`: its `yue.path` names a
file that is not there ([Settings](./settings#config-yue)).

### A new `gg_` global is unknown {#a-new-gg-global-is-unknown}

Moonwell learns the map's own globals from the script of the source map, which it reads at every run of `build`,
`test`, `check` and `dev`. After you make a variable, a unit or a trigger in World Editor, save the map, then run
`moonwell check`. `moonwell dev` does not watch the source map: while it runs, save a `.yue` file to start a check.
The check then knows the name, and your editor has it from the declarations that the command writes
([Using your own map](../own-map#the-maps-own-globals)).
