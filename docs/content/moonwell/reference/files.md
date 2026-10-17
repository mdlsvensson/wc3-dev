# Files and caches

This page lists what Moonwell writes and where: in a project, in the cache folder and in the Moonwell folder. It
says which command writes which file, and it lists the environment variables Moonwell reads.
[Project layout](../project-layout) describes the files of a project that you write yourself, and says
[which files you commit](../project-layout#what-to-commit).

## In the project

A project is the folder that holds `moonwell.toml`. Moonwell writes into five places of it:

| Place | What it holds | In git |
| --- | --- | --- |
| [`.moonwell/`](#project-moonwell) | The libraries, and the files your editor and the compiler read | Left out by the template's `.gitignore` |
| [`dist/`](#dist) | What a build makes: the staged map, the archive, the compile's cache, the log and the build lock | Left out by the template's `.gitignore` |
| [`src/generated/`](#src-generated) | The ids module, `objects.yue`, and the file of declared ids, `declared-ids.json` | Commit it |
| [`moonwell.lock`](#moonwell.lock) | The commit of each library that is fetched from GitHub | Commit it |
| [`.asset-state/`](#asset-state) | Which files of the source map `assets:sync` owns | Commit it |

Four commands also write files that are yours: `init` writes the whole project, `setup` adds the editor's files
that are missing, `assets:sync` writes into the source map, and `assets:gltf` writes the `.glb` or `.gltf` files
you ask for.

Each of these places is a real file or folder. Moonwell refuses a link on the way to what it writes:
[Project layout](../project-layout#real-folders-no-links) lists what is refused.

### `.moonwell/` {#project-moonwell}

The folder holds copies and generated files, and nothing that you write. The commands write its files as they need
them. It is not the Moonwell folder of your machine, which has the same name and is in your user folder: see
[The Moonwell folder](#the-moonwell-folder).

| Path | What it is | Written by |
| --- | --- | --- |
| `objects.pkl` | The module that gathers the object files | `build`, `test`, `check`, `dev`, `setup`, `objects:check`, `objects:eval` |
| `types/` | The declarations your editor reads | `build`, `test`, `check`, `dev`, `setup` |
| `yue/moonwell/macros.yue` | The macro module, `moonwell.macros` | `build`, `test`, `check`, `dev`, `setup` |
| `yue/moonwell/build.lua` | The build mode, `moonwell.build`, for macros to read | `build`, `test`, `check`, `dev`, `setup` |
| `libraries/<name>/` | The modules of the library `<name>` | `build`, `test`, `check`, `dev`, `setup`, `assets:check`, `assets:sync`, `assets:paths`, `assets:gltf` |
| `library-assets/<name>/` | The files the library `<name>` ships for the map | The same nine |
| `lua/` | The libraries' modules as Lua, for your editor | `build`, `test`, `check`, `dev`, and in part `setup` |

`objects.pkl` is written only in a project with a `.pkl` file under `objects/`. It imports every object file, and
Moonwell runs Pkl on it to evaluate them together.

`types/` holds four files of declarations for lua-language-server:

- `natives.d.lua`: the game's types, functions and globals, from its `common.j` and `blizzard.j`.
- `moonwell.d.lua`: the `moonwell` module, with its hooks, `format_error`, `declare`, `id_of` and `declaring`.
- `objects.d.lua`: the ids module, `generated.objects`, with a field for each object of your object files.
- `map.d.lua`: the globals and the functions that the source map's `war3map.lua` defines.

The compiler and VS Code's YueScript extension find `import "moonwell.macros"` in `yue/`. `yue/moonwell/build.lua`
holds `return { mode = "release" }` after `build`, and `return { mode = "dev" }` after `build --dev`, `test`,
`check`, `dev` and `setup`. A macro reads it with `require "moonwell.build"`
([Gameplay code](../gameplay-code#build-modes)).

`<name>` is the `name` of a library's entry in `moonwell.toml`. `libraries/<name>/` holds the library's modules:
fetched from GitHub at the entry's tag, or copied from the folder the library is read from. Beside the modules is
one file of Moonwell's own, `.moonwell-library.json`, which says what the copy was made from. Moonwell fetches a
library from GitHub when its folder is missing or is not the copy that `moonwell.lock` records, and when the
entry's `github`, `tag` or `dir` changed. A library that is read from a folder is compared with the copy at every
run, and the files that differ are written. `library-assets/<name>/` is there only for a library that ships files
for the map. The folders of a library that the project lists no more are removed.

`lua/` holds every module of every library as a Lua file, at the path of its name: the module `mylib.hello` is
`lua/mylib/hello.lua`. `build`, `test`, `check` and `dev` write a Lua module as it is and a YueScript module as the
Lua it compiles to. `setup` compiles nothing: it writes the Lua modules, and leaves the compiled ones as the last
of the other four wrote them. A file whose module no library has is removed.

### `dist/` {#dist}

| Path | What it is | Written by |
| --- | --- | --- |
| `dist/stage/<map.folder>/` | The staged map: the built map as a folder | `build`, `test` |
| `dist/stage/lua/` | The compile's cache | `build`, `test`, `check`, `dev` |
| `dist/stage/declare/war3map.lua` | The script that a build runs to read the objects that the code declares | `build`, `test`, `check`, `dev`, where the code declares objects |
| `<build.folder>/<map.folder>` | The archive: the built map as one file. `dist/bin/map.w3x` in a new project | `build` |
| `dist/test/<map.folder>` | The archive that `test` starts the game on, with `test.archive` | `test` |
| `dist/moonwell.log` | The log | Every command in a project but `init` and `completion` |
| `dist/.lock` | The build lock | `build`, `test`, `check`, `dev`, `setup`, `assets:check`, `assets:sync`, `assets:paths`, `assets:gltf` |

**The staged map.** `build` and `test` replace `dist/stage/<map.folder>` with a copy of the source map, and write
the planned files of the build into the copy. They do so only when the whole plan of the build stands, so a build
that fails before that leaves the staged map of the build before as it was. Without `test.archive`, it is the
folder `moonwell test` starts the game on.

**The compile's cache.** `dist/stage/lua/` holds the Lua that each `.yue` file compiles to: `src/main.yue` is
`main.lua` there, and a module of a library is below `.libraries/<name>/`. Two more files are Moonwell's
bookkeeping. `.hashes.json` records which source file gave which Lua file, with a hash of the source. `.globals.json`
records which globals each file uses, for the check of unknown globals. Moonwell compiles a file again when the file
changed or its Lua file is gone. It compiles every file again when the compiler is another program, when minifying
is switched on or off, when the build changes between a release and a development build, when a file that holds the
word `macro` changed, and when Moonwell's own macro module is another. A Lua file whose source is gone is removed.

**The run that reads the declarations.** Where the code declares objects, a build writes
`dist/stage/declare/war3map.lua` and runs it once with the compiler: Moonwell's runtime and the modules that the
entry reaches, without World Editor's part of the map's script. The run starts the entry, which runs every module
that it requires while it loads ([Objects](../objects#how-a-build-reads-the-declarations)). The file is written again
at every build that runs it, and the map does not get it.

**The archive.** `build` writes the archive beside its place first, as `<map.folder>.tmp`, and moves it there when
it is whole. So the place holds a whole archive or none. A build that is ended midway can leave the `.tmp` file,
and the next build replaces it. `build` removes the archive of the build before as soon as it has the build lock
([Commands](./commands#build)). With `test.archive`, `test` treats `dist/test/<map.folder>` in the same way.
Without it, `test` neither writes that file nor removes it.

**The log.** A command adds each line it writes for you to `dist/moonwell.log`, with the time in UTC and `info`,
`warn` or `error` before it:

```text
[2026-10-13T06:59:45.541Z] info: Built dist/bin/map.w3x (2 module(s)).
```

Moonwell only ever adds to the file, and never reads it: delete it when it has grown. A command that cannot write
the log runs all the same and does not say so. That is the case when `dist` is a link, for the commands that take
no build lock: `settings:check`, `objects:check` and `objects:eval`.
[Commands](./commands#output-and-the-log-file) says what goes to the log and what does not.

**The build lock.** `dist/.lock` is there while a command plans a build or brings the libraries up to date, and
holds the process id of that command. [Commands](./commands#one-build-at-a-time) says what to do when one is left
behind.

### `src/generated/` {#src-generated}

`src/generated/objects.yue` is the ids module: the ids of the objects of your object files, for your code to import
as `generated.objects`. Its first line says that Moonwell wrote it and that it is not to be edited.

- `init` writes the file as the template has it, with the id of the template's one object.
- `build`, `test` and `dev` write the file when it does not match the objects.
- `check` and `objects:check` compare it with the objects and write nothing. They fail when it does not match, or
  when it is missing in a project with objects.
- `setup` and `objects:eval` do not look at it.

In a project without objects, `build`, `test` and `dev` do not make a file that is missing, and a missing file is
no failure. Moonwell writes the file with LF line ends, and compares it without regard to the line ends: a checkout
that gave it Windows line ends matches all the same. `dev` does not watch `src/generated/`.

`src/generated/declared-ids.json` is the file of declared ids: the id of each object that the code declares with
`moonwell.declare`, by its kind and its key ([Objects](../objects#ids-of-declared-objects)). The next build gives
each key the id that the file holds for it, so commit the file.

- `build`, `test` and `dev` write the file when it does not match the declarations, and remove it when the code
  declares nothing.
- `check` compares it with the declarations and writes nothing. It fails when the file does not match, when it is
  missing, and when it is there in a project whose code declares nothing.
- `setup`, `objects:check` and `objects:eval` do not look at it.

Moonwell writes this file with LF line ends too, and compares it without regard to the line ends.

### `moonwell.lock` {#moonwell.lock}

`moonwell.lock` is a JSON file in the project folder. It holds a record of each library that is fetched from
GitHub. A record has the `github`, the `tag` and the `dir` of the library's entry in `moonwell.toml`, the `commit`
that the tag named when the library was fetched, a hash of the library's modules as `files` and, where the library
ships files for the map, a hash of those as `assets`.

The commands that bring the libraries up to date keep the file current: `build`, `test`, `check`, `dev`, `setup`
and the four `assets:` commands. They write it when its content changes, and remove it when no record is left in
it. A library that is read from a folder gets no record. A record that the file has under the library's name, from
a time when the library was fetched, stays there.

When Moonwell fetches a library again at the tag the file records, and the tag names another commit or gives other
files than the file records, the command fails and names the library. To take the tag as it is, delete the
library's record from `moonwell.lock` and run the command again ([Libraries](../libraries#moonwell.lock)). A
`moonwell.lock` that is not valid JSON, or is no lock file, is an error too: put it right, or delete it, and the
next command fetches every library again and writes a new one. [Libraries](../libraries#add-a-library) describes how
a library is added and fetched.

### `.asset-state/` {#asset-state}

`.asset-state/<map.folder>.json` records which files of the source map `assets:sync` wrote, each with a SHA-256
hash of what it wrote. `assets:sync` is the only command that writes it. `build`, `test`, `check`, `dev`,
`assets:check` and `assets:sync` read it, and tell by it which files of the source map are Moonwell's and which are
yours.

When `assets:sync` owns no file of the map, it writes no state file, and removes one that is there. A state file
that Moonwell cannot read as one is an error, whose hint tells you to restore the file from version control.
[Assets](../assets#seeing-assets-in-world-editor) describes `assets:sync`.

## Which command writes what

The table shows what a command writes when it runs to its end. `<dir>` is the folder `init` is given.

| Command | `.moonwell/` | `src/generated/` | `moonwell.lock` | `dist/stage/lua/` | Staged map | Archive | `dist/.lock` | Cache folder | Also |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [`init`](./commands#init) | No | The template's file | No | No | No | No | No | Pkl | The project, in `<dir>` |
| [`setup`](./commands#setup) | All of it | No | Yes | No | No | No | Yes | The compiler, Pkl, `bin/` | The editor's files and `.gitignore` |
| [`build`](./commands#build) | All of it | Yes | Yes | Yes | Yes | `<build.folder>/<map.folder>` | Yes | The compiler, Pkl | |
| [`test`](./commands#test) | All of it | Yes | Yes | Yes | Yes | With `test.archive`: `dist/test/<map.folder>` | Yes | The compiler, Pkl | |
| [`dev`](./commands#dev) | All of it | Yes | Yes | Yes | No | No | During a check | The compiler, Pkl | |
| [`check`](./commands#check) | All of it | No | Yes | Yes | No | No | Yes | The compiler, Pkl | |
| [`assets:check`](./commands#assets-check) | The libraries | No | Yes | No | No | No | Yes | No | |
| [`assets:sync`](./commands#assets-sync) | The libraries | No | Yes | No | No | No | Yes | No | The source map and `.asset-state/` |
| [`assets:paths`](./commands#assets-paths) | The libraries | No | Yes | No | No | No | Yes | No | |
| [`assets:gltf`](./commands#assets-gltf) | The libraries | No | Yes | No | No | No | Yes | No | The `.glb` file, or the `.gltf`, `.bin` and `.png` files |
| [`settings:check`](./commands#settings-check) | No | No | No | No | No | No | No | No | |
| [`objects:check`](./commands#objects-check) | `objects.pkl` | No | No | No | No | No | No | Pkl | |
| [`objects:eval`](./commands#objects-eval) | `objects.pkl` | No | No | No | No | No | No | Pkl | |
| [`completion`](./commands#completion) | No | No | No | No | No | No | No | No | |

Read the table with these in mind:

- Run in a project, every command but `init` and `completion` also adds its lines to `dist/moonwell.log`.
- "The libraries" are `libraries/` and `library-assets/` below `.moonwell/`. Of `.moonwell/lua/`, `setup` writes
  the Lua modules only.
- `objects.pkl` is written only in a project with object files.
- For `src/generated/`, "Yes" means that the command writes `objects.yue` when the file does not match the
  objects, and `declared-ids.json` when that file does not match the declarations. In a project without objects it
  does not make `objects.yue`, and where the code declares nothing it removes `declared-ids.json`. `init` writes
  `objects.yue` as the template has it, with the rest of the project.
- `dist/stage/declare/` is written by `build`, `test`, `check` and `dev` where the code declares objects, beside
  `dist/stage/lua/`.
- For `moonwell.lock`, "Yes" means that the command keeps the file current: it writes it when its content changes,
  and removes it when no record is left in it.
- In the cache folder, the compiler and Pkl are written when they are downloaded: the compiler when its version is
  not in the cache and `yue.path` is not set, Pkl when Moonwell needs its own and has not got it. But for `init`,
  which always runs Pkl, a command needs Pkl only in a project with object files.
- `assets:paths` and `assets:gltf` write what the first eight columns name only in a project. Outside one,
  `assets:paths` writes nothing and `assets:gltf` writes only the converted model.
- `setup` adds an editor's file only where it is missing. To `.gitignore` it adds only the lines the file lacks,
  and to `.luarc.json` only the entries that three of its lists lack: `runtime.path`, `workspace.library` and
  `workspace.ignoreDir` ([Editor setup](../editor-setup#what-else-setup-does)).

A command that fails has written less. [Commands](./commands) gives each command's steps in their order, and says
which commands take back what they wrote.

## The cache folder

The cache folder holds the programs Moonwell downloads: the YueScript compiler, and Pkl when Moonwell runs its own.
It is one folder on your machine, and every project uses it.

**On Windows** it is `%LOCALAPPDATA%\moonwell`.

**On Linux** it is `$XDG_CACHE_HOME/moonwell` when the variable `XDG_CACHE_HOME` is set, and `~/.cache/moonwell`
when it is not.

When the variable `MOONWELL_CACHE` is set, the folder it names is the cache folder, on both systems. Moonwell uses
that folder itself, and adds no `moonwell` to its path.

| Path | What it is |
| --- | --- |
| `yue/<version>/` | The YueScript compiler of that version: `yue.exe` on Windows, `yue` on Linux. There is one folder for each version that was downloaded |
| `pkl/0.32.1/` | Pkl 0.32.1: `pkl.exe` on Windows, `pkl` on Linux. Only when Moonwell had to download its own ([Installation](../installation#pkl)) |
| `bin/` | Programs for your PATH, which `moonwell setup` copies here |

`moonwell setup` copies the project's compiler into `bin/`, where VS Code's YueScript extension can find it once
the folder is on your PATH. `bin/` has room for one `yue`: a `setup` in a project that names another `yue.version`
replaces it. With `yue.path` set in your `config.toml`, `setup` copies no compiler. In a project with object files,
`setup` also copies Pkl into `bin/` when Moonwell runs its own.

On Windows the install script puts `moonwell.exe` itself into `bin/`, and it reads `MOONWELL_CACHE` as the program
does. On Linux the script puts `moonwell` into `~/.local/bin`, which is not in the cache folder.

### How a download is checked

Moonwell downloads a program when a command needs it and the cache does not have it: the compiler from the
releases of YueScript on GitHub, and Pkl from the releases of Pkl on GitHub. It checks the download before it uses
the program:

1. It compares the SHA-256 checksum of the download with a checksum that is part of Moonwell. Moonwell holds one
   for each program, version and system. When the two differ, the command fails with both checksums in its error,
   and nothing is written to the cache.
2. It unpacks the program into a new folder beside the place of the version's folder, with a name that starts with
   `.install-`, and runs the program there to ask for its version. When the program reports another version than
   the one that was asked for, the command fails, and Moonwell removes the new folder.
3. It moves the folder to its place, `yue/<version>/` or `pkl/0.32.1/`.

So a version's folder holds a program that passed both checks, and a download that is ended midway leaves nothing
there. A program that is in the cache is not downloaded again. To have Moonwell download one again, delete its
version's folder.

On Windows the compiler comes as a 7z archive, and Moonwell unpacks it with the `tar.exe` of Windows.

## The Moonwell folder

The Moonwell folder is the folder of your machine's settings. It is `.moonwell` in your user folder:
`C:\Users\<you>\.moonwell` on Windows, `~/.moonwell` on Linux. When the variable `MOONWELL_HOME` is set, the
folder it names is the Moonwell folder.

Moonwell reads one file there: `config.toml`, the settings of your machine, which
[Settings](./settings#your-machine-config.toml) lists. No command writes that file, or anything else in the folder.
The install script makes `config.toml` when it is missing, and it reads `MOONWELL_HOME` as the program does
([Installation](../installation#your-settings-file)).

Every command that reads the settings reads `moonwell.toml` first and your `config.toml` after it. A missing
`config.toml` is no error: each of its settings then has its default. An error in the file names it by its full
path, and so does the last line of `moonwell init`.

Moonwell finds your user folder by the variable `USERPROFILE` on Windows and by `HOME` on Linux. When that variable
and `MOONWELL_HOME` are both not set, Moonwell reads no `config.toml`, and each of its settings has its default.

The Moonwell folder is not the folder `.moonwell/` of a project, though the two have one name. The one in your user
folder holds your settings and belongs to your machine. The one in a project holds what the commands write for that
project: see [`.moonwell/`](#project-moonwell) above.

## Environment variables

Moonwell reads these variables. One that is set to nothing counts as not set.

| Variable | What it changes |
| --- | --- |
| `MOONWELL_CACHE` | The cache folder: when it is set, the folder it names is the cache folder |
| `MOONWELL_HOME` | The Moonwell folder: when it is set, your `config.toml` is read from the folder it names |
| `LOCALAPPDATA` | On Windows, where the cache folder is when `MOONWELL_CACHE` is not set: `moonwell` in this folder |
| `XDG_CACHE_HOME` | On Linux, where the cache folder is when `MOONWELL_CACHE` is not set: `moonwell` in this folder |
| `HOME` | On Linux, your user folder. The Moonwell folder is `.moonwell` in it when `MOONWELL_HOME` is not set, and the cache folder is `.cache/moonwell` in it when neither `MOONWELL_CACHE` nor `XDG_CACHE_HOME` is set |
| `USERPROFILE` | On Windows, your user folder. The Moonwell folder is `.moonwell` in it when `MOONWELL_HOME` is not set |
| `SystemRoot` | On Windows, the folder of Windows itself, where Moonwell finds `System32\tar.exe` to unpack the compiler. When it is not set, Moonwell takes `C:\Windows` |
| `PATH` | Where Moonwell looks for `pkl`, and where `moonwell setup` looks for `pkl` and `yue` to tell you whether a terminal and your editor find them |

On Windows with `LOCALAPPDATA` not set, Moonwell finds the cache folder as on Linux: by `XDG_CACHE_HOME`, then by
`HOME`, and then by `USERPROFILE`.

Moonwell sets no variable for the programs it starts. Pkl, the compiler and the game get the environment that
`moonwell` itself was started with.
