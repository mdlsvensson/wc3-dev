# Editor setup

After this page, VS Code completes the game's functions in your `.yue` files, shows what each one takes and returns,
and warns when you pass a value of the wrong type. Moonwell needs no editor in particular, and a project builds
without one. This page sets up VS Code, the editor that a new project brings its files for.

## Install VS Code and the two extensions

Install [VS Code](https://code.visualstudio.com/), and open the project folder in it with File > Open Folder. VS Code
offers the two extensions that the project recommends:

- **YueScript**, `LiJin.yuescript`.
- **Lua**, `sumneko.lua`.

Install both. The YueScript extension uses the lua-language-server that the Lua extension brings, so there is nothing
else to install.

`moonwell init` wrote three files for the editor into the project:

| File | What it is |
| --- | --- |
| `.vscode/extensions.json` | Recommends the two extensions to VS Code |
| `yueconfig.yue` | The settings of the YueScript extension. A build does not read it |
| `.luarc.json` | The settings of lua-language-server: see [The game's Lua in the editor](#the-games-lua-in-the-editor) |

`yueconfig.yue` tells the YueScript extension four things:

- To write a `.lua` file when you save a `.yue` file, with the line numbers and the comments of the source: see
  [The `.lua` files beside your `.yue` files](#the-lua-files-beside-your-yue-files).
- To report no unknown global itself. lua-language-server reports them, from Moonwell's declarations, and so does
  `moonwell check`.
- Where it finds `import "moonwell.macros"`: in `.moonwell/yue`, a folder that Moonwell writes.
- To compile for Lua 5.3.

## Run `moonwell setup`

The YueScript extension runs the compiler, `yue`, from your PATH, and it has no setting for the place of `yue`.
Moonwell keeps the compiler in its cache folder, in a folder of the compiler's version, and runs it from there.
`moonwell setup` makes a copy for your PATH. Run it in the project folder:

```sh
moonwell setup
```

```text
YueScript 0.34.3: C:\Users\<you>\AppData\Local\moonwell\yue\0.34.3\yue.exe
Copied YueScript for the editor to C:\Users\<you>\AppData\Local\moonwell\bin\yue.exe.
```

`setup` finds the compiler of the version that the project's `yue.version` names, downloads it when the cache does
not have it, and prints where it is. Then it copies that program into the `bin` folder of the cache
([Files and caches](./reference/files#the-cache-folder)). The second line is there when the copy is new or changed.

Then `setup` asks the `yue` on your PATH for its version. When no `yue` is there, or when it is another version than
the project's, `setup` prints a warning that holds a command. On Windows it reads:

```text
warning: yue is not on PATH; VS Code's YueScript extension needs YueScript 0.34.3 there. Run this once in PowerShell, then open a new terminal and restart VS Code:
  [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'User') + ';C:\Users\<you>\AppData\Local\moonwell\bin', 'User')
```

The command puts the `bin` folder on your PATH. No command of `moonwell` changes your PATH: `setup` prints the line,
and you run it, once. Then open a new terminal and restart VS Code.

**On Windows** `bin` is `%LOCALAPPDATA%\moonwell\bin`, the folder that holds `moonwell.exe`. The install script put
that folder on your user PATH ([Installation](./installation#install-moonwell)), so one entry serves `moonwell` and
`yue`.

**On Linux** `bin` is `~/.cache/moonwell/bin`, unless a variable moved the cache, and the install script put nothing
on your PATH. There the command is a line for your shell:

```sh
echo 'export PATH="/home/<you>/.cache/moonwell/bin:$PATH"' >> ~/.profile
```

Two variables move the cache folder, and `bin` with it: `MOONWELL_CACHE` on both systems and, on Linux,
`XDG_CACHE_HOME` ([Files and caches](./reference/files#the-cache-folder)). The command names the folder as it is on
your machine.

Three more things about the copy:

- **One `yue` for every project.** `bin` holds one `yue`. Projects that name different versions in `yue.version`
  share it: each `setup` replaces it with the version of its own project.
- **A `yue` of your own.** With `yue.path` set in your `config.toml`, `setup` copies nothing. It takes the folder of
  your program in the place of `bin`: the command of the warning names that folder
  ([Settings](./reference/settings#config-yue)).
- **A copy that is in use.** When `setup` cannot write the copy, as when VS Code is running the `yue` that is there,
  it fails. Its hint tells you to close the programs that run that `yue`, and to run `moonwell setup` again.

### What else setup does

`setup` also prepares the rest of what your editor reads. [Commands](./reference/commands#setup) has its steps in
their order, and says when each one fails.

- **The editor's files.** It adds `yueconfig.yue`, `.luarc.json` and `.vscode/extensions.json` where they are
  missing, and never writes over one that is there. It adds the lines `.moonwell/` and `src/**/*.lua` to `.gitignore`
  where the file lacks them, and makes the file when there is none. It says what it added, in lines such as
  `Added .luarc.json for the editor.`
- **A `.luarc.json` that is there.** `setup` adds the entries that three of its lists lack: `runtime.path`,
  `workspace.library` and `workspace.ignoreDir`. When it adds one, it writes the file anew, with every other setting
  as it was. A file that is not plain JSON, such as one with a comment in it, is left alone: `setup` warns, and
  lists the entries for you to add.
- **The declarations and the libraries.** It writes the declarations into `.moonwell/types/` and the macro module
  into `.moonwell/yue/`, and it brings the libraries up to date: see
  [What completion covers](#what-completion-covers).
- **Pkl.** In a project with object files, when Moonwell runs a Pkl of its own, `setup` copies that program into
  `bin` too ([Installation](./installation#pkl)).

`setup` compiles nothing and builds no map. Run it once in a new project, and again in a project that you have
cloned: git leaves `.moonwell/` out, so a fresh clone has nothing of what your editor reads there.

## Open the project folder itself

Always open the project folder itself in VS Code: the folder that holds `moonwell.toml` and `.luarc.json`.
lua-language-server reads `.luarc.json` only from the first folder of the workspace. So the editor recognises
nothing of the game when you open:

- a folder above the project,
- a single file of the project, or
- the project as the second folder of a workspace.

## What completion covers

In a `.yue` file you get completion, hover and signature help for:

- **The game's functions and globals.** Every function and global of the `common.j` and the `Blizzard.j` of
  Warcraft III Reforged 3.0.0.24268: a native such as `CreateUnit`, a constant such as `PLAYER_NEUTRAL_AGGRESSIVE`,
  a global of `Blizzard.j` such as `bj_MAX_PLAYERS`.
- **The `moonwell` module.** After `import "moonwell"`: the four hooks and `format_error`, each with a description.
- **Your objects.** After `import "generated.objects"`: every object under its key, such as `captain` among the
  `units`, with its rawcode.
- **The map's own globals.** The `gg_` and `udg_` globals and the functions that the source map's script defines:
  see [Using your own map](./own-map#the-maps-own-globals).

You also get a warning for a value of the wrong type, such as a `unit` passed where a `player` is expected. And the
editor resolves an import of one of your own modules or of a library's module: the sections below say how.

Moonwell writes what the editor knows of these four as declarations: four files in `.moonwell/types/`, which
[Files and caches](./reference/files#project-moonwell) lists. `.luarc.json` names that folder as a library. A function
is declared with the type of each parameter and of what it returns. This is `CreateUnit`, in `natives.d.lua`:

```text
---@param id player
---@param unitid integer
---@param x number
---@param y number
---@param face number
---@return unit
function CreateUnit(id, unitid, x, y, face) end
```

The game's types are declared there too, each as a class below the type it extends: a `unit` is a `widget`, and not
a `player`.

`build`, `test`, `check`, `dev` and `setup` bring the declarations up to date. Two of the four files follow your
project: the one of the map's globals, and the one of your objects.

- **After you save the map in World Editor,** run `moonwell check`. `moonwell dev` does not watch the map: while it
  runs, save a `.yue` file to start a check.
- **After you change an object file,** run `moonwell build`, or have `moonwell dev` running, which watches the
  object files. Both write the ids module and then the declarations. `moonwell check` writes no ids module: when
  you added or removed an object, or changed a key or an id, it stops on the module that matches no more, before it
  comes to the declarations ([Objects](./objects#the-generated-ids)).

The commands that compile your code write the declarations first. So one that stops on a compile error has still
brought them up to date.

### Modules of a library

Your editor finds the modules of the project's libraries in `.moonwell/lua/`, which `.luarc.json` names as a library
too. `setup` compiles nothing, and so writes only the modules there that are Lua already: after you add a library,
and in a fresh clone of a project that has one, run `moonwell check`
([Libraries](./libraries#libraries-and-the-checks)).

## The `.lua` files beside your `.yue` files

When you save a `.yue` file, the YueScript extension writes a `.lua` file beside it: `src/main.lua` beside
`src/main.yue`. The extension needs these files for lua-language-server, and `yueconfig.yue` has it keep the line
numbers and the comments of the source in them. The `runtime.path` of `.luarc.json` has entries for `src/` and for
`lua/`: the editor resolves a module of yours through them.

These files are the editor's, and no part of what you write:

- **Git leaves them out.** The template's `.gitignore` has the line `src/**/*.lua`, and `moonwell setup` adds the
  line where it is missing.
- **A build never reads them.** Moonwell compiles the `.yue` files itself, and under `src/` it reads nothing else.
- **Keep Lua of your own in `lua/`.** A `.lua` file under `src/` is no module of the project, and git leaves it
  out. [Gameplay code](./gameplay-code#lua-modules) describes the modules under `lua/`.
- **In a library, a `.lua` file beside a `.yue` file of the same name is skipped.** Moonwell takes it for one of
  these files ([Libraries](./libraries#write-a-library)).

## The game's Lua in the editor

`.luarc.json` holds the settings of lua-language-server. This is the file of a new project:

```json
{
  "runtime.version": "Lua 5.3",
  "runtime.path": ["src/?.lua", "src/?/init.lua", "lua/?.lua", "lua/?/init.lua"],
  "runtime.builtin": { "io": "disable", "debug": "disable", "package": "disable" },
  "workspace.library": [".moonwell/types", ".moonwell/lua"],
  "workspace.ignoreDir": ["dist", "maps", ".moonwell/libraries"],
  "workspace.useGitIgnore": false,
  "workspace.checkThirdParty": false,
  "completion.maxSuggestCount": 10000
}
```

- `runtime.version` sets Lua 5.3, the Lua that the game runs.
- `runtime.builtin` turns three libraries of standard Lua off in the editor: `io`, `debug` and `package`.
- `runtime.path` and `workspace.library` are where the editor finds modules and declarations, as the sections above
  describe.
- `workspace.useGitIgnore` is `false`, so that the language server reads the compiled `.lua` files, which git leaves
  out.
- `completion.maxSuggestCount` is above the number of the game's functions and globals, so that the editor can
  suggest every one of them.

The game's Lua lacks more than the three libraries that `runtime.builtin` turns off, and
[Gameplay code](./gameplay-code#the-games-lua) says what. lua-language-server cannot turn single functions off. So
the editor does not flag a use of `collectgarbage`, `dofile` or `loadfile`, nor of a function that `os` lacks.
`moonwell check` reports the first three, as unknown globals. It does not see a function that `os` lacks, such as
`os.exit`: that is a field.

With `package` off, the language server's own `require` is off as well. The declarations of the `moonwell` module
declare `require` in its place: in a built map, `require` is the runtime's own function.

lua-language-server also underlines most of the unknown globals that `moonwell check` reports, as you type. It does
not know the list `lint.globals` of `moonwell.toml`, which only the check reads
([Gameplay code](./gameplay-code#unknown-globals)).

## Pkl in an editor

Object files need no editor plugin: the `pkl` and `moonwell` programs do all the work. An editor with Pkl support
adds completion and hover documentation in the files under `objects/`. The Pkl extension for VS Code is one, and the
Pkl plugin for IntelliJ another.

- **Sync the project once.** These editors find Moonwell's Pkl package through the project's `PklProject`
  ([Objects](./objects#pklproject)). Run their "sync projects" command once after `moonwell init`.
- **The path of `pkl`.** If the VS Code extension cannot find `pkl`, set the path of the program in its setting
  `pkl.cli.path`. Where Moonwell runs a Pkl of its own, `moonwell setup` copies it into the `bin` folder of the cache
  ([Installation](./installation#pkl)).

[Object fields](./reference/object-fields#finding-a-field) says what the hover of a field shows.

## See also

- [Commands](./reference/commands#setup): `moonwell setup`, step by step, with what it reads, writes and fails on.
- [Files and caches](./reference/files): [`.moonwell/`](./reference/files#project-moonwell), with the declarations
  and the libraries' modules, and [the cache folder](./reference/files#the-cache-folder) with its `bin`.
- [Troubleshooting](./reference/troubleshooting#the-editor): an editor that completes nothing, a `yue` that is not
  found, and a new global of the map that is unknown.
- [Using your own map](./own-map): the next page. It makes a map of yours the source map of a project.
