# Gameplay code

After this page you can lay out your gameplay code in modules, run it at the right moment of the game, and read the
errors it gives, at a build and in the game. Gameplay code is YueScript, in the `.yue` files under `src/`, and plain
Lua, in the `.lua` files under `lua/`. A build compiles the YueScript to Lua 5.3 and adds your modules to the end of
the map's script, `war3map.lua`, with a small piece of Lua of Moonwell's own before them. These pages call that piece
the runtime.

## Hooks

World Editor writes two functions into the map's script, `config` and `main`, and the game calls them. Your code
runs before and after each of the two, through the four hooks of the `moonwell` module:

```yue
import "moonwell" as mw

mw.on_main ->
  print "Hello from YueScript"
```

A hook takes a function and keeps it until its moment comes:

| Hook | When its functions run |
| --- | --- |
| `before_config` | When the game calls `config`, before World Editor's `config` sets up the players, the forces and the start locations |
| `on_config` | When the game calls `config`, after World Editor's `config` |
| `before_main` | When the game calls `main`, before World Editor's `main` makes the units that are placed in the map and runs the initialization triggers |
| `on_main` | When the game calls `main`, after World Editor's `main`: the placed units are there, and the initialization triggers have run |

A hook can be given any number of functions, from any module. The functions of one hook run in the order they were
added. What a hook is given must be a function: anything else raises an error that names the hook, such as
`moonwell.on_main expects a function`.

Code at the top level of a module is in no hook. It runs while the map's script loads, before the game calls
`config` or `main`. So keep the top level for imports, for functions and for the lines that add hooks, and make game
objects, such as units, timers and triggers, inside a hook.

A hook that fails does not stop the others. The runtime reports the error, with the hook's name and with the source
file and the line the error was raised at, and runs the next function. For an `on_main` hook it prints the report
at once:

```yue
import "moonwell" as mw

mw.on_main ->
  error "no gold"

mw.on_main ->
  print "The second hook runs."
```

```text
[moonwell] on_main failed: src/main.yue:4: no gold
The second hook runs.
```

The runtime writes the first part of its line, up to the colon after `failed`, between the colour codes
`|cffff4040` and `|r`, which make it red in the game. [Errors in the game](#errors-in-the-game) describes every line
the runtime prints.

## Modules and imports

Every `.yue` file under `src/` is a module. Its name is its path below `src/`, without the `.yue` and with a dot for
each `/`: `src/main.yue` is the module `main`, and `src/players/gold.yue` is `players.gold`. A module exports what
other modules may use. This is `src/players/gold.yue`:

```yue
export give = (player, amount) ->
  current = GetPlayerState player, PLAYER_STATE_RESOURCE_GOLD
  SetPlayerState player, PLAYER_STATE_RESOURCE_GOLD, current + amount
```

Another module imports it by its name:

```yue
import "moonwell" as mw
import "players.gold" as gold

mw.on_main ->
  gold.give Player(0), 500
```

A file named `init.yue` answers to the name of its folder too: `src/players/init.yue` is `players.init` and
`players`. Import it by one of the two names. Each name is a module of its own in the map, so a file that is
imported under both goes into the map twice, and runs twice.

Dots separate the parts of a module's name, so a module's file or folder with a dot in its own name, such as
`src/my.helpers.yue`, is refused, with `Module file and folder names cannot contain dots.`

In the map, a module runs once: the first time it is imported. Every later import of that name gets the value that
the module returned then.

### The entry

A build starts from one file, the entry. It is the setting [`map.entry`](./reference/settings#map) of
`moonwell.toml`, which is `src/main.yue` in a new project. The flag `--entry` of
[`build`](./reference/commands#build) and of `test` names another file for one run:

```sh
moonwell build --entry src/arena.yue
```

The entry is a `.yue` file under `src/`. The map runs it while its script loads.

A build compiles every `.yue` file under `src/`, so a file that does not compile fails the build, also when nothing
imports it. Then the build follows the imports from the entry, and only the modules it reaches go into the map. A
file that nothing imports adds nothing to the map. The last line of a build counts the modules:

```text
Built dist/bin/map.w3x (2 module(s)).
```

Moonwell finds the imports in the Lua that a file compiles to, where an `import` is a call of `require` with the
module's name. When you write a `require` yourself, give it one string literal without an escape in it. A name that
is worked out while the map runs is refused, with `require must be called with a single string literal.` Two modules
that import each other are refused too, and the error shows the chain: `Circular require: main → tools → main`.
Each of the two errors names the file and, in a plain build, the line of the `require` or the `import`.

### A module that is missing or has no code

An import of a module that no file gives is an error. In a plain build it names the line of the import:

```text
error: src/main.yue:2 › Module 'players.gold' not found.
hint: Expected src/players/gold.yue, lua/players/gold.lua, lua/players/gold/init.lua or a module of a library in moonwell.toml. Built-in modules: moonwell.
```

The hint lists where a module can come from: a file under `src/`, a file under `lua/` (see
[Lua modules](#lua-modules)) or a library of the project (see [Libraries](./libraries#import-its-modules)). An entry
that names no file gives the same error, without a file and a line.

YueScript writes no Lua for a file that holds nothing but comments and macros. An import of such a file is an error
too. It names the import, as the error above does, and the file:

```text
error: src/main.yue:2 › Module 'players.gold' has no code.
hint: YueScript writes no Lua for a file with nothing but comments and macros, and src/players/gold.yue is such a file.
```

Give the file code, or take the import out. When the entry is such a file, the error names the entry itself.

In a minified build these errors name another line: see [Minified builds](#minified-builds).

## Lua modules

Plain Lua goes in `lua/`, beside `src/`. A `.lua` file there is a module, named by its path below `lua/` in the same
way: `lua/flags.lua` is `flags`, `lua/utils/timer.lua` is `utils.timer`, and `lua/tools/init.lua` answers to
`tools`. This is `lua/flags.lua`:

```lua
local flags = {}

function flags.has(value, flag)
  return (value & flag) ~= 0
end

return flags
```

A YueScript module imports it as it imports any module:

```yue
import "moonwell" as mw
import "flags" as flags

mw.on_main ->
  print flags.has 6, 2
```

`src/`, `lua/` and the libraries of the project share one set of names. Two files that give the same name fail the
build:

```text
error: lua/players/gold.lua › Module players.gold is defined by src/players/gold.yue and lua/players/gold.lua.
hint: Rename one of them: module names are shared by src/ and lua/.
```

A Lua module goes into the map as it is written, and only when a module that the entry reaches requires it.
Moonwell does not compile it, does not minify it and does not check it for unknown globals. An error in it names the
`.lua` file and the line. Moonwell changes two things as it reads the file: it takes a byte order mark off the start,
and it blanks a first line that starts with `#`.

The name `moonwell` belongs to the built-in module. A file that would take the name, such as `lua/moonwell.lua` or
`src/moonwell.yue`, fails the build. For the first of the two the error reads
`Module moonwell is built into Moonwell; rename lua/moonwell.lua.`

Under `src/` a build reads the `.yue` files and nothing else, and under `lua/` it reads the `.lua` files. The `.lua`
files under `src/` are not yours: VS Code's YueScript extension writes one beside each `.yue` file that you save,
and the template's `.gitignore` leaves `src/**/*.lua` out (see
[Editor setup](./editor-setup#the-lua-files-beside-your-yue-files)). Keep Lua of your own in `lua/`.

## Macros

A macro is code that the compiler runs while it compiles a file, and what the macro returns is compiled in its
place. Moonwell brings one macro, `$FourCC`, in the module `moonwell.macros`:

```yue skip
import "moonwell" as mw
import "moonwell.macros" as {:$FourCC}

mw.on_main ->
  CreateUnit Player(0), $FourCC("hfoo"), 0, 0, 270
```

`$FourCC("hfoo")` is the rawcode `hfoo` as the integer that the game's functions take, 1751543663: the bytes of its
four characters, the first one highest. The compiler writes the number into the Lua, so the map converts nothing
while it runs. For the objects that your project makes, the ids module has these numbers under names of your own
(see [Objects](./objects#the-generated-ids)).

`$FourCC` takes one string literal of exactly four characters, between double or single quotes. Each of the four is
a printable ASCII character, from the space to `~`, and none is a backslash. Everything else is refused: a variable,
a text of three characters such as `"hfo"`, a text with a backslash escape, and a second argument. Between double
quotes, a text with `#{` in it is refused too, because YueScript puts a value into a text there; between single
quotes `#{` is two characters like any other. A refusal fails the compile at that line, with
`$FourCC needs a string literal of exactly 4 characters, such as "hfoo".`

Among other arguments, write the macro with parentheses, as above. In
`CreateUnit Player(0), $FourCC "hfoo", 0, 0, 270` the macro takes the three numbers after it as arguments of its
own, and is refused.

The line `import "moonwell.macros" as {:$FourCC}` gives a file the macro, and a file that uses `$FourCC` without it
does not compile. The line compiles to no Lua, and the macro module adds nothing to the map.

Moonwell writes the macro module into the project, as `.moonwell/yue/moonwell/macros.yue`, where the compiler and VS
Code's YueScript extension find it. `build`, `test`, `check`, `dev` and `setup` write it
([Files and caches](./reference/files#project-moonwell)).

Your own `.yue` files can define macros as well. A macro runs on your machine, during a build: see
[Build only a project you trust](./project-layout#build-only-a-project-you-trust).

## Unknown globals

`build`, `test`, `check` and `dev` stop on a global name that nothing defines. Such a name is almost always a typing
mistake:

```text
error: src/main.yue:4:3 › Unknown global CreatUnit.
hint: Did you mean CreateUnit? Declare your own globals with `global`, or add them to lint.globals in moonwell.toml.
```

The error names the file, the line and the column. Where known names are close to the one you wrote, the hint
offers up to three of them. One run reports every unknown global of the code it checks: the first 20 as above, then
a line that counts the rest.

### What counts as known

A global is known when it is one of these:

- A native, a function, a global or a constant of the game's `common.j` and `Blizzard.j`, such as `CreateUnit` or
  `PLAYER_NEUTRAL_AGGRESSIVE`. Moonwell has these names from Warcraft III Reforged 3.0.0.24268.
- A global of the game's Lua, such as `print`, `pcall`, `require`, `math`, `string`, `table` or `os`.
- A global or a function that the source map's own `war3map.lua` defines, such as `gg_unit_Hpal_0002` or
  `udg_Score`. Moonwell reads the script at every run, so after you save the map in World Editor, run the command
  again.
- A name that a YueScript module declares with `global`: `global Score = 0`, `global a, b` or `global class Hero`.
- A name that a Lua module defines at its top level (see [Globals of a Lua file](#globals-of-a-lua-file)).
- A name in the list [`lint.globals`](./reference/settings#lint) of `moonwell.toml`.

For the two kinds of module, only a module that the entry reaches counts, and a module of a library counts as one of
your own does.

```toml
[lint]
globals = ["Score"]
```

### What is not checked

- **Fields.** In `math.flor`, only `math` is checked.
- **A file that nothing imports.** Moonwell checks the YueScript modules under `src/` that the entry reaches. A file
  outside them is not checked, and its `global` lines do not count.
- **Lua modules and the modules of libraries.** They are not checked. What they declare and define counts as known.
- **`global *` and `global ^`.** After one of these lines, YueScript makes an assignment global without a line that
  names it. Moonwell learns a name from the `global` line that declares it, so it does not know these names: each
  is reported, at its assignment too. List them in `lint.globals`.

To have unknown globals reported without failing the build, set `unknownGlobals = "warning"` under `[lint]`. The
commands then print the same lines as warnings, and go on.

### Globals of a Lua file

Moonwell does not run a Lua file to learn its globals. It scans the file for the two common ways of defining one at
the top level, which is outside every function and every block:

- A function definition: `function Name(`.
- An assignment that starts a line or follows a `;`: `Name = …` or `A, B = …`.

A name that the file declares `local` at its top level is left out, wherever in the file that line stands: with
`local Timer` in the file, `Timer = {}` defines no global.

The scan does not see a global that is assigned inside a function or a block, or through `_G`. List such a name in
`lint.globals`.

## Errors in the game

A map that Moonwell builds prints the errors of your code that the runtime can catch. It prints with `print`, and
each of its lines starts with `[moonwell]` in red.

Once `main` has started, the runtime prints each line as it comes up. A line from before that is kept: the runtime
prints the kept lines, in their order, when `main` starts, before the first `before_main` hook.

### An error in a hook

The runtime calls each function of a hook under `xpcall`. When one fails, the runtime reports it as `[moonwell]`,
the hook's name, `failed:` and the error's message, and calls the next function.

World Editor's own `config` and `main` run under the same protection. An error in one of them is reported as
`[moonwell] config failed:` or `[moonwell] main failed:`, and the hooks after it still run.

For an error in a `config` hook or in World Editor's `config`, the runtime keeps the line, as it keeps every line
from before `main`.

::: note
No test on Warcraft III Reforged 3.0.0.24268 had an error in `config` or in a `config` hook, so whether such a line
reaches the screen was not seen.
:::

Lua writes the place of an error in front of its message, as a line of `war3map.lua`. The runtime knows which lines
of the script each module has, and writes the module's file and its line in the place's stead: `src/main.yue:4:` for
a YueScript module, `lua/flags.lua:4:` for a Lua module. Where Lua has its `debug` library, the runtime also adds a
traceback to the message. The game has no such library (see [The game's Lua](#the-games-lua)), so a line in the game
is the message alone.

### An error while the script loads

The entry runs while the map's script loads, and so does the top-level code of every module that it imports there.
An error in that code ends the entry at once. The lines after it do not run, so the hooks that they would have added
are missing, while a hook that was added before the error stays. A hook that is given something that is no function
fails in this way. The runtime catches the error and reports it under the name of the entry's module. `main` has not
started then, so the runtime keeps the line, and prints it when the game calls `main`, before the first
`before_main` hook. For an entry `src/main.yue` that raises `no gold` at its top level, on line 3, it prints this:

```text
[moonwell] load main failed: src/main.yue:3: no gold
```

The map goes on: the game calls `config` and `main` as it does in every map.

::: note
In a test on Warcraft III Reforged 3.0.0.24268, a line that a module printed at its top level, while the script
loaded, was not on the screen. Lines printed in a `before_main` hook, in an `on_main` hook and from a timer of zero
seconds were there, and so was the runtime's line for a failing `on_main` hook. The two `config` hooks were not part
of the test. In a second test, the entry of a map added a `before_main` hook with a line of its own, and then
raised an error at its top level. When the map started, the red `load … failed` line was on the screen, with the
hook's line below it. So text of your own that a module prints at its top level is text you do not see: print from
a `before_main` or an `on_main` hook.
:::

### An error in a callback

The game calls many of your functions later: the function of a timer, the action or the condition of a trigger, the
function of a loop over a group. The runtime guards the eight natives that take a function: `TimerStart`,
`TriggerAddAction`, `Condition`, `Filter`, `ForGroup`, `ForForce`, `EnumDestructablesInRect` and `EnumItemsInRect`.

While the script loads, before the entry runs, the runtime puts a function of its own in the place of each of the
eight global names. That function wraps the function it is given, and calls the native with the wrapped one and
with every other argument as it is. So the guard holds for all code that calls one of the eight by its global name:
your modules, the modules of libraries, the BJ functions, and the triggers that World Editor's part of the script
makes.

When the game calls a wrapped function, the runtime calls yours under `xpcall`, with the arguments the game gave.
Without an error, what your function returns goes back to the game. With an error, the rest of your function does
not run, the runtime prints a line, and nothing goes back to the game:

```yue
import "moonwell" as mw

mw.on_main ->
  TimerStart CreateTimer!, 1.0, true, ->
    error "no gold"
```

```text
[moonwell] TimerStart callback failed: src/main.yue:5: no gold
```

The line names the native that the function was given to, then the source file and the line, as for a hook.

A timer that fails every second would fill the screen, so the runtime counts an error that repeats. Two errors are
the same error when the native and the whole message are the same. The runtime prints an error the first time, and
then at its 10th, its 100th and its 1000th time, and so on at every power of ten, with the count:

```text
[moonwell] TimerStart callback failed 10 times: src/main.yue:5: no gold
```

The runtime keeps the count of 100 different errors. A different one beyond those is printed every time it happens.
An error in a callback that the top-level code of a module runs is counted in the same way. `main` has not started
then, so the runtime keeps its lines, and prints them when `main` starts.

An error value that is a table, a function, a userdata or a thread, and has no `__tostring` of its own, is printed
by its kind: `(error object is a table value)`.

The guard does not cover everything:

- An error that your function catches itself, with `pcall` or `xpcall`, is yours: see
  [An error you catch yourself](#an-error-you-catch-yourself).
- The runtime wraps a function and nothing else. Another value, such as `nil` or a table that can be called,
  reaches the native as it is, and so does a call that leaves the function out.
- A function that the game runs by its name, through `ExecuteFunc`, is not wrapped: that native takes a name, and is
  none of the eight.
- In a coroutine that you resume yourself, `coroutine.resume` hands the error back to your code and raises nothing.

`build.protectCallbacks = false` in `moonwell.toml` builds the map without the guard: the eight natives stay as the
game has them, and an error in a callback is not printed ([Settings](./reference/settings#build)).

::: note
On Warcraft III Reforged 3.0.0.24268, the game dropped an error in the function of a timer or a trigger without a
word. In a map built with the guard, such errors were printed on the screen.

Four more things were measured there, not in a map built with the guard but with a test script that put `xpcall`
around each callback itself, as the guard does. A trigger's action that runs under `xpcall` still waits:
`TriggerSleepAction` and `PolledWait` return inside it, and an error after the wait is caught. A BJ function calls
what a script put in the place of a native: `ForGroupBJ` went through a replaced `ForGroup`. A condition that raises
an error counts as false. And 100,000 `ForGroup` callbacks took 212 ms with the `xpcall`, and 203 ms without.
:::

### An error you catch yourself

An error that your own code catches with `pcall` or `xpcall` does not reach the runtime. Its message names a line of
`war3map.lua`, the one script that holds every module of the map. The function `format_error` of the `moonwell`
module turns that place into the source file and the line:

```yue
import "moonwell" as mw

mw.on_main ->
  ok, err = pcall -> error "no gold"
  print mw.format_error err unless ok
```

This prints `src/main.yue:4: no gold`, where the message itself has a line of the script, such as
`war3map.lua:450: no gold`. `format_error` takes any value and returns text. It replaces every place in the text
whose line is inside a module. A place outside the modules stays as it is: a line of World Editor's part of the
script, or of the runtime.

To find a line of `war3map.lua` by hand, open the script of the last build,
`dist/stage/<map.folder>/war3map.lua`. Each module is there below a line of its own, which reads
`__mw.define("<name>", function(...)`.

## The game's Lua

Moonwell compiles YueScript to Lua 5.3, the Lua that the game runs. The game leaves parts of standard Lua out:

::: note
Warcraft III Reforged 3.0.0.24268 had no `collectgarbage`, `dofile`, `loadfile`, `debug`, `io` or `package`, and its
`os` had only `clock`, `date`, `difftime` and `time`. What `print` wrote showed on the screen for a few seconds.
:::

The check of [unknown globals](#unknown-globals) knows the six names that are missing. A use of one as a global is
reported, with a hint of its own: `Warcraft III's Lua does not provide collectgarbage.` A function that `os` lacks,
such as `os.exit`, is a field, and the check does not see it.

The game has no `package`, and the `require` of a built map is the runtime's own. It gives the modules that the
build put into the map, and it looks for no file while the map runs.

In your editor, the template's `.luarc.json` sets Lua 5.3 and turns `io`, `debug` and `package` off (see
[Editor setup](./editor-setup#the-games-lua-in-the-editor)).

## Bitwise operators and floor division

Lua 5.3 has the bitwise operators `&`, `|`, `~`, `<<` and `>>`. A YueScript file that uses one does not build. The
compiler compiles the operator, but its next step, which prepares the Lua for the map, does not read it, and
Moonwell stops the build with an error at the line:

```text
error: src/main.yue:5 › YueScript compiled this file but could not rewrite its Lua: Unexpected Symbol `&` in source.
hint: That step of YueScript does not read Lua 5.3's bitwise operators (&, |, ~, <<, >>). If the file uses one, move that code to a Lua module under lua/, which is bundled as written.
```

In a minified build the error says `could not minify its Lua`, and it names the file without a line.

Put such code in a Lua module, where the operators work as Lua 5.3 has them. `lua/flags.lua` under
[Lua modules](#lua-modules) is such a module.

Floor division, `//`, builds from YueScript with the compiler that Moonwell uses by default, YueScript 0.34.3. The
setting [`yue.version`](./reference/settings#yue) can name YueScript 0.34.2 in its place. That compiler writes no
Lua for a file that uses `//` or a bitwise operator, and reports no error. Moonwell then stops the build with an
error that names the file:
`YueScript reported success but wrote no Lua for src/main.yue, although the file has code.`

## Minified builds

The flag `--minify` of `build` and of `test` shrinks the map's script: the compiler writes each YueScript module as
compact Lua, with short names for its local variables. `build.minify = true` in `moonwell.toml` does the same for
every build, and for `check` and `dev`, and the flag cannot turn it off.

A minified module keeps no source lines, so an error in it loses its line. Where the runtime writes a file and a
line in a plain build, it writes the file alone:

```text
[moonwell] TimerStart callback failed: src/main.yue: no gold
```

That holds for an error in a hook, for an error while the script loads, for an error in a callback and for
`format_error`. When you look for an error in YueScript, build without minifying.

Four errors of the build itself change too: a module that is not found, a module with no code, a `require` without
a string literal and a circular require. Moonwell reads the line of an import from the Lua that the file compiles
to, and the minified Lua of a module is one line. So in a minified build each of the four names line 1 of the
YueScript file, whatever line the import is on. With `build.minify = true` that holds for `check` and `dev` as well.
The error for an unknown global keeps its line and its column.

Only the YueScript modules are minified. A Lua module goes into the map as it is written, and an error in it keeps
the file and the line. World Editor's part of the script and the runtime stay as they are too.

## See also

- [Commands](./reference/commands): [`build`](./reference/commands#build), with `--entry` and `--minify`,
  [`check`](./reference/commands#check) and [`dev`](./reference/commands#dev), and when each fails.
- [Settings](./reference/settings): the tables [`map`](./reference/settings#map),
  [`build`](./reference/settings#build) and [`lint`](./reference/settings#lint) of `moonwell.toml`.
- [Files and caches](./reference/files): the macro module, the Lua that your code compiles to and the staged map.
- [Troubleshooting](./reference/troubleshooting#building): a global that is unknown, a bitwise operator and a
  module that is not found, and [errors in the game](./reference/troubleshooting#in-the-game).
- [Objects](./objects): the next page. It describes the object files and the ids module that your code imports.
