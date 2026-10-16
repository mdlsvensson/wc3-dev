# Project layout

After this page you know what each file and folder of a project is, which of them Moonwell writes, and which of
them you commit. The page goes through the project that `moonwell init` makes, the one of
[Your first map](./first-map).

## What init makes

`moonwell init <dir>` writes these files and folders into the new project:

| Path | What it is |
| --- | --- |
| `moonwell.toml` | The settings of the project and of its map ([Settings](./reference/settings#the-project-moonwell.toml)). A folder is a project because it holds this file |
| `src/main.yue` | The entry: the file a build compiles from. Every `.yue` file under `src/` is a module of your gameplay code |
| `src/generated/objects.yue` | The ids module: the ids of the objects of your object files, for your code to import. Moonwell writes it |
| `lua/` | Plain Lua modules, beside `src/`. Empty in a new project |
| `objects/units.pkl` | An object file, with the template's one custom unit. Every `.pkl` file under `objects/` is an object file |
| `PklProject` | Names the `moonwell` Pkl package that the object files are written for, and its version |
| `PklProject.deps.json` | What `pkl project resolve` wrote when `init` ran it. Moonwell reads the package's version from it |
| `maps/map.w3x/` | The source map: a map that World Editor saved as a folder, with Lua as its script language. You open it in World Editor, and a build only reads it |
| `assets/` | Files to import into the map. A new project has World Editor's three icon folders there, empty: `CommandButtons/`, `CommandButtonsDisabled/` and `PassiveButtons/`, under `assets/ReplaceableTextures/` |
| `yueconfig.yue` | Settings for VS Code's YueScript extension. A build does not read it |
| `.luarc.json` | Settings for lua-language-server, in your editor |
| `.vscode/extensions.json` | Recommends the two VS Code extensions, YueScript and Lua |
| `.gitignore` | Names what git leaves out: see [What to commit](#what-to-commit) |
| `.gitattributes` | Says how git treats line ends: see [What to commit](#what-to-commit) |

Git keeps no empty folder, so `lua/` and the three icon folders each hold one empty file, `.gitkeep`. A build passes
it over: under `lua/` it reads the `.lua` files, and under `assets/` it leaves out a file whose name starts with a
dot.

The pages after this one take the folders one by one: [Gameplay code](./gameplay-code#modules-and-imports) for `src/`
and `lua/`, [Objects](./objects#object-files) for `objects/` and [`PklProject`](./objects#pklproject),
[Assets](./assets#files-under-assets) for `assets/` and [its icon folders](./assets#icons),
[Editor setup](./editor-setup#install-vs-code-and-the-two-extensions) for the three files of the editor, and
[Using your own map](./own-map) for `maps/`.

## What Moonwell writes

`init` makes no `dist/` and no `.moonwell/`: the commands that follow do. Moonwell writes into five places of a
project, and [Files and caches](./reference/files#in-the-project) has every file of each.

- **`.moonwell/`** holds the libraries that the project names, the declarations and the macro module that your
  editor and the compiler read, and the module that gathers the object files. The commands write it as they need
  it, and you never edit it ([Files and caches](./reference/files#project-moonwell)).
- **`dist/`** holds what a build makes: the staged map in `dist/stage/`, the archive, which is `dist/bin/map.w3x`
  in a new project, the compile's cache, which holds the Lua that your code compiles to, the log
  `dist/moonwell.log` and the build lock ([Files and caches](./reference/files#dist)).
- **`src/generated/objects.yue`** is the ids module. `build`, `test` and `dev` write it when the objects of your
  object files change, and `check` compares it with them. Your code imports it, and you never edit it
  ([Files and caches](./reference/files#src-generated)).
- **`src/generated/declared-ids.json`** is the file of declared ids, there when your code declares objects with
  `moonwell.declare`. `build`, `test` and `dev` write it, and `check` compares it with the declarations
  ([Objects](./objects#ids-of-declared-objects)).
- **`moonwell.lock`** holds a record of each library that is fetched from GitHub, with the commit of its tag, so
  that everyone who builds the project gets the same code. When no record is left in it, the file is removed
  ([Files and caches](./reference/files#moonwell.lock)).
- **`.asset-state/`** is there when `moonwell assets:sync` has written assets into the source map. It records
  which files of the source map that command owns ([Files and caches](./reference/files#asset-state)).

Besides `init`, two commands write into files that are yours. `moonwell setup` adds the editor's files that are
missing, the entries that three lists of `.luarc.json` lack, and the lines `.moonwell/` and `src/**/*.lua` where
`.gitignore` lacks them ([Editor setup](./editor-setup#what-else-setup-does)). `moonwell assets:sync` writes into
the source map, and it is the one command that changes it ([Assets](./assets#seeing-assets-in-world-editor)).

## What to commit

Commit everything that `init` made, and four of the things Moonwell writes:

- `src/generated/objects.yue`. In a project with objects, `moonwell check` fails when the file is missing or does
  not match the objects, and it does not write the file itself ([Objects](./objects#the-generated-ids)).
- `src/generated/declared-ids.json`, where the code declares objects. It keeps the id of each declared object from
  one build to the next, and `moonwell check` fails when it is missing or does not match the declarations
  ([Objects](./objects#ids-of-declared-objects)).
- `moonwell.lock`. A fresh clone then gets the same code of each library. When a tag is moved on GitHub, the
  command that fetches the library fails, and does not take the other code.
- `.asset-state/`. It goes with the source map: it says which of the map's files `assets:sync` wrote.

`PklProject.deps.json` is among what `init` made, and it is committed too: without it, a project with object
files is not read, and the error tells you to run `pkl project resolve` ([Objects](./objects#pklproject)).

The template's `.gitignore` leaves four things out:

```text
dist/
.pkl-lsp/
.moonwell/
src/**/*.lua
```

- `dist/` and `.moonwell/` are Moonwell's, and the commands write them again.
- `src/**/*.lua` are the `.lua` files that VS Code's YueScript extension writes beside each `.yue` file you save.
  It needs them for lua-language-server. A build never reads them: Moonwell compiles the `.yue` files itself. Keep
  Lua of your own in `lua/`.
- `.pkl-lsp/` is not Moonwell's: no command writes it.

The file names `dist/` and not your `build.folder`. When you set `build.folder` to a folder outside `dist/`, add
that folder to `.gitignore` yourself.

The template's `.gitattributes` has git check text files out with LF line ends on every system, which is how
Moonwell writes them. It has git keep the files under `maps/` and `assets/` byte for byte: the files of the map
are World Editor's, and an asset goes into the map as it is.

## The project's settings and your machine's

Moonwell reads two settings files, and only one of them is in the project.

`moonwell.toml` is in the project folder and is committed with it. It holds what is the same for everyone who works
on the project: which map it builds from, the entry, where the archive goes, the libraries, and the settings of the
map itself.

`config.toml` holds the settings of your machine. It is in your Moonwell folder, which is `.moonwell` in your user
folder, outside every project. It holds the path of the game, the arguments the game is started with, a `yue`
program of your own, and the folders of libraries that you work on. The install script makes the file, and no
command writes it ([Installation](./installation#your-settings-file)).

The game's path is not in the project for two reasons. It differs from one machine to the next, so no value would
be right for everyone. And a project does not choose the program that runs on your machine: `moonwell test` starts
the program that `launch.gameExecutable` names, so that setting is yours alone. Moonwell holds the two files
apart: a `launch` table or a `yue.path` in `moonwell.toml` is refused, with a hint that names your `config.toml`,
and a setting of the project in your `config.toml` is refused too. One setting may stand in both, `test.archive`,
and there your file wins ([Settings](./reference/settings#a-setting-in-the-wrong-file)).

Your Moonwell folder and the folder `.moonwell/` of a project have one name and are two folders. The first holds
your `config.toml`; the second holds what the commands write for one project
([Files and caches](./reference/files#the-moonwell-folder)).

## Real folders, no links

Moonwell removes and replaces what it wrote: the staged map, the archive, the copies of the libraries. Through a
link, that would happen outside the project folder. So Moonwell writes into real files and folders, and refuses a
link on the way to them. A link here is a symbolic link or, on Windows, a junction.

A command refuses a link at any of these places:

- `dist`, and what a build writes below it: `dist/stage`, the staged map, the folder of the Lua your code compiles
  to, `dist/stage/lua`, with its two JSON files, the archive under `dist/test` and the build lock.
- The archive, `<build.folder>/<map.folder>`, and every folder on the way to it.
- `.moonwell`, and below it `objects.pkl`, `types/` and its files, the macro module, and `libraries/` and
  `library-assets/` with the folder of each library. `.moonwell/lua` is refused too, but a link below it is not:
  Moonwell removes that link, and writes the real file where one belongs.
- `moonwell.lock`, `.asset-state` with the file in it, and an output path inside the project that `assets:gltf`
  writes to.
- The folders the project is read from: `maps`, `objects`, `src`, `lua` and `assets`. Inside the source map and
  inside `assets`, a link is refused wherever it is.

The command that comes to the link stops there, and its error names the link. Where the link is on the way to the
staged map, to an archive or to the build lock, the error reads as this one does, for a link at `dist`:

```text
error: dist › dist is a link: Moonwell writes what it builds into real files and folders.
hint: Remove the link (or Windows junction) at dist, then try again: Moonwell makes what it needs there.
```

Everywhere else the error says `Symlinks are not supported:` and gives the path of the link:

```text
error: src › Symlinks are not supported: C:\Users\<you>\my-map\src
hint: Replace the link (or Windows junction) with the real files.
```

Only a command that comes to the link refuses it: `moonwell settings:check` writes nothing below `.moonwell`, and
runs with a link there. `moonwell setup` also refuses one of the editor's files, or a `.gitignore`, that is a link
to a file that does not exist.

## Build only a project you trust

A project brings code that runs on your machine while it is built. YueScript has macros, and the compiler runs a
macro while it compiles the file that uses it. The project's `.yue` files can define macros, and so can the
modules of its libraries. So the commands that compile, which are `build`, `test`, `check` and `dev`, run code
that the project brings.

Refusing links keeps Moonwell's own writes inside the project folder. It is no barrier against a project that
means harm. Build only a project whose code you trust, and add only a library you trust.
[Gameplay code](./gameplay-code#macros) describes macros.

## See also

- [Files and caches](./reference/files): every file Moonwell writes and which command writes it, the cache folder,
  the Moonwell folder and the environment variables.
- [Settings](./reference/settings): every setting of `moonwell.toml` and of your `config.toml`.
- [Troubleshooting](./reference/troubleshooting#a-link-is-refused): a link that Moonwell refuses.
- [Gameplay code](./gameplay-code): the next page. It describes the code under `src/` and `lua/`: hooks, modules,
  macros and errors.
