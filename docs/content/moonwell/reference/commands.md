# Commands

This page lists every command of `moonwell`: what it does, what it reads, what it writes, when it fails and which
flags it takes. Before the commands it says how a command line is written, what the help and the exit codes are, and
where the log file is.

| Command | What it does |
| --- | --- |
| [`init`](#init) | Makes a new project in a new or empty folder |
| [`setup`](#setup) | Prepares a project on your machine: the compiler, the editor's files, the libraries |
| [`build`](#build) | Builds the map into the archive `<build.folder>/<map.folder>` |
| [`test`](#test) | Stages the map and starts Warcraft III on it |
| [`dev`](#dev) | Watches the project and checks it again after every save |
| [`check`](#check) | Compiles and validates, and builds no map |
| [`assets:check`](#assets-check) | Shows what `assets:sync` would change in the source map |
| [`assets:sync`](#assets-sync) | Writes the assets into the source map, for World Editor |
| [`assets:paths`](#assets-paths) | Lists the files a model references, as in-game or custom paths |
| [`assets:gltf`](#assets-gltf) | Converts a `.mdx` or `.mdl` model to `.glb` or `.gltf` |
| [`settings:check`](#settings-check) | Shows which files of the map the map settings would change |
| [`objects:check`](#objects-check) | Shows which files of the map the objects would change |
| [`objects:eval`](#objects-eval) | Prints the objects as JSON |
| [`completion`](#completion) | Prints a completion script for your shell |

Run a command in the project folder, the folder that holds `moonwell.toml`. Moonwell does not look for a project in
the folders above it: a command that reads the settings and finds no `moonwell.toml` in the folder it runs in
reports `No moonwell.toml found in this directory.` Four commands need no project: `init`, `completion`,
`assets:gltf` and, with a model file, `assets:paths`.

## Writing a command line

A command line is `moonwell`, then a command, then the flags and the arguments of that command:

```sh
moonwell build --entry src/arena.yue --minify
```

- A flag follows its command. `moonwell build --minify` is read, and `moonwell --minify build` is refused.
- `--entry` takes its file after a space or after `=`: `--entry src/arena.yue` or `--entry=src/arena.yue`.
- `--` ends the flags. What follows it is read as an argument, also when it starts with `-`.
- Only `--help` and `--version` have a short form: `-h` and `-v`.

A line Moonwell cannot read is refused, and nothing of it runs. That is a line with a flag or a command Moonwell does
not have, with a flag that lacks its value, or with an argument too many or too few. The refusal says what is wrong:

```text
error: unknown flag: --minfy
hint: moonwell --help lists the commands, and moonwell <command> --help the flags of one.
```

An `--entry` that is not a `.yue` file under `src/` is refused in the same way, before the command does anything.

### Help and version

`moonwell --help`, or `moonwell` alone, lists the commands. Every command has its own help, which shows how it is
written and which flags it takes: `moonwell build --help`, or `moonwell help build`.

```text
Build <build.folder>/<map.folder>

Usage:
  moonwell build [--entry f] [--minify] [--dev]

Flags:
      --dev            Build for development: keep the checks that macros add
      --entry string   Compile from this .yue file under src/ in place of map.entry
  -h, --help           help for build
      --minify         Shrink the script; runtime errors lose their line numbers
```

`--help` does not rescue a line that is refused: `moonwell build --minfy --help` prints the error above.

`moonwell --version` prints the version of the program.

### Exit codes

| Code | When |
| --- | --- |
| 0 | The command did its work. The help and the version end with 0 too |
| 1 | The command failed, or the line was refused |
| 130 | Ctrl+C stopped the command before it was done. A `dev` that has started ends this way: Ctrl+C is how you stop it |

Ctrl+C asks the command to stop. It ends its work as soon as it can and removes its
[build lock](#one-build-at-a-time). A second Ctrl+C ends the program at once, also with 130, and removes the lock
first.

### Output and the log file

A command writes its lines for you to standard error. What another program may want to read goes to standard output:
the JSON of `objects:eval`, a completion script, the help and the version. So `moonwell objects:eval > objects.json`
writes the JSON alone into the file.

Run in a project, every command but `init` also adds each line it writes for you to
[`dist/moonwell.log`](./files#dist) in the project folder. A line there starts with the time, in UTC, and with
`info`, `warn` or `error`. Moonwell only ever adds to the file. A line that is refused, the help, the version and
`completion` write nothing there. [Files and caches](./files) lists the other files Moonwell writes.

## Projects

### init {#init}

`moonwell init <dir> [--link]`

Makes a new project in the folder `<dir>`, which is new or empty. `init` writes the files of a project there, with a
`PklProject` that names the `moonwell` Pkl package of the program's own version. Then it runs `pkl project resolve`
in the new folder, which writes `PklProject.deps.json`. Its last line names your `config.toml`, for you to check the
game's path in it, and the next step: `cd <dir> && moonwell build`.
[Project layout](../project-layout#what-init-makes) describes the files of a project.

**Reads:** no project and no settings file. It runs Pkl, which it finds as [Installation](../installation#pkl)
describes: when the `pkl` on your PATH is not Pkl 0.32 or newer, Moonwell runs its own, which it downloads into the
cache folder once. `pkl project resolve` fetches the `moonwell` package from GitHub.

**Writes:** the folder `<dir>` and the project in it. It writes no log file. When a step fails, `init` takes back
what it wrote: a folder it made is removed, and a folder that was there is emptied.

**Fails when:**

- `<dir>` is a file, or a folder that holds anything.
- `<dir>` cannot be read, or a file of the project cannot be written.
- Pkl is not found and cannot be downloaded. `init` has written nothing by then.
- `pkl project resolve` fails, as it does without a network connection. The error holds what Pkl said.
- With `--link`: the command does not run in a Moonwell checkout, or the project is on another drive than the
  checkout.

**Flags:** `--link` uses the Pkl package of the Moonwell checkout the command runs in, in place of the published
package.

### setup {#setup}

`moonwell setup`

Prepares a project on your machine: it gets the compiler and the libraries, and writes the files your editor reads.
It compiles nothing and builds no map. [Editor setup](../editor-setup#run-moonwell-setup) shows where it fits.
`setup` works in this order, and the first step that fails ends it:

1. It reads the settings. Where the project has a `.pkl` file under `objects/`, it finds Pkl and evaluates the
   object files. When Moonwell runs its own Pkl, `setup` copies that program into the `bin` folder of the cache
   first, and when no `pkl` is on your PATH it prints the line that adds the folder to it.
2. It finds the YueScript compiler of the version [`yue.version`](./settings#yue) names, downloads it into the cache
   folder when it is not there, and prints where it is. It copies the compiler into the cache's `bin` folder, for
   your editor. When the `yue` on your PATH is missing or is another version, it prints the line that adds the
   folder to your PATH. With [`yue.path`](./settings#config-yue) set, it uses that program and copies nothing.
3. It adds the editor's files that are missing: `yueconfig.yue`, `.luarc.json` and `.vscode/extensions.json`. It adds
   the lines `.moonwell/` and `src/**/*.lua` to `.gitignore` where they are missing. To a `.luarc.json` that is
   there, it adds the entries that three of its lists lack, `runtime.path`, `workspace.library` and
   `workspace.ignoreDir`, and changes no other setting. One that is not plain JSON it leaves alone, with a warning
   that lists the entries.
4. It opens the source map, checks the objects, and writes the declarations for your editor into `.moonwell/types/`
   and the macro module into `.moonwell/yue/`, beside the build mode of a development build
   ([Gameplay code](../gameplay-code#build-modes)).
5. It takes the [build lock](#one-build-at-a-time), brings the libraries up to date under `.moonwell/`, keeps
   `moonwell.lock` current as a build does, and refreshes `.moonwell/lua/`, where your editor reads the libraries'
   modules.

**Reads:** `moonwell.toml` and your `config.toml`; the object files, through Pkl; the source map,
`maps/<map.folder>`; the libraries the project names. It reads your `config.toml` as every command in a project
does, and never writes it: the install script makes that file (see
[Installation](../installation#your-settings-file)).

**Writes:** the `bin` folder of the cache; the editor's files and `.gitignore` in the project; `.moonwell/`;
`moonwell.lock`; `dist/.lock` while it works on the libraries; `dist/moonwell.log`. It does not write the ids
module, `src/generated/objects.yue`, or the file of declared ids, and it does not run the code to read the objects
it declares. [Files and caches](./files#the-cache-folder) says where the cache folder is.

**Fails when:**

- The folder is no project, or a settings file is refused.
- The project has object files, and Pkl is not found and cannot be downloaded.
- Pkl or Moonwell refuses an object, or the project's `moonwell` package does not go with the program (see
  [Installation](../installation#a-project-with-object-files)). Moonwell's own Pkl is copied by then.
- The compiler cannot be downloaded, or `yue.path` names no program that runs.
- A program cannot be copied into `bin`, as when an editor is running the copy that is there.
- One of the editor's files is a link to a file that does not exist, or cannot be written.
- The source map is missing, or holds something Moonwell refuses.
- A library cannot be fetched.
- Another build is running in the project.

**Flags:** none.

## Building

`build`, `test`, `check` and `dev` plan the same build. `build` makes a release build, and `build --dev`, `test`,
`check` and `dev` make a development build, which differ in what your macros write
([Gameplay code](../gameplay-code#build-modes)). The four commands work out the whole map before any file of the
map is written, in this order:

1. Read the settings: `moonwell.toml`, then your `config.toml`. Where the project has a `.pkl` file under
   `objects/`, find Pkl and evaluate the object files.
2. Take the [build lock](#one-build-at-a-time), `dist/.lock`.
3. Open the source map, `maps/<map.folder>`, and read which globals its `war3map.lua` defines.
4. Check the objects of the object files against the game's data and against the objects the map has.
5. Write what your code and your editor read beside the sources: the ids module `src/generated/objects.yue`, the
   declarations in `.moonwell/types/`, and the macro module and the build mode in `.moonwell/yue/`. `check` writes
   no ids module: it compares the one that is there.
6. Bring the libraries up to date under `.moonwell/`, and keep [`moonwell.lock`](../libraries#moonwell.lock)
   current. The file holds a record of each library that is fetched from GitHub. When no record is left in it, the
   file is removed.
7. Find the compiler, which is downloaded into the cache folder when it is not there, and compile the `.yue` files
   of `src/` and of the libraries into the compile's cache, `dist/stage/lua/`. Then follow the imports from the
   entry, and check the modules they reach for [unknown globals](../gameplay-code#unknown-globals).
8. Where the code declares objects, run the entry once, with every module it requires while it loads, from
   `dist/stage/declare/`: the run that reads the declarations
   ([Objects](../objects#how-a-build-reads-the-declarations)). Check the declared objects with the
   objects of the object files, and write their ids into `src/generated/declared-ids.json`. Where the code declares
   nothing, the file is removed. `check` neither writes nor removes it: it compares the one that is there.
9. Plan the rest of the map on top of the objects' files, each part on the map as the one before leaves it: the map
   settings, then the assets with `war3map.imp`, and last the script, `war3map.lua`, with your code added to it.

The first step that fails ends the plan, and the command prints its error. Some steps write beside the map, so a
plan that fails after them leaves those files: step 1 writes `.moonwell/objects.pkl`, the module that gathers the
object files, where the project has object files, and steps 5 to 8 write what they name. None of the four commands
changes the source map. [Files and caches](./files#in-the-project) describes each of these files.

### build {#build}

`moonwell build [--entry f] [--minify] [--dev]`

Builds the map, as a release build, or with `--dev` as a development build. `build` plans the map as above. Then
it stages it: it replaces `dist/stage/<map.folder>` with a copy of the source map and writes the planned files into
the copy. Last it packs the staged map into the archive
`<build.folder>/<map.folder>`, which is `dist/bin/map.w3x` in a new project.

`build` writes the staged map only when the whole plan stands. A refused setting, an invalid object or a compile
error leaves the staged map of the build before as it was.

The archive of the build before is another matter: `build` removes it once it has the lock, before step 3. So the
old archive stays when step 1 fails (the folder is no project, a settings file is refused, Pkl is not found and
cannot be downloaded, Pkl refuses an object file, the `moonwell` package does not go with the program) and when the
lock is held. It is gone when a later step fails: an object Moonwell refuses, a map setting the map cannot take, a
compile error, an error in code that runs at build.

**Reads:** `moonwell.toml` and your `config.toml`; the object files under `objects/`, through Pkl, with
`PklProject.deps.json`; the source map; `src/` and `lua/`; the libraries; `assets/`; the file under `.asset-state/`
that says which files of the source map `assets:sync` owns; the picture
[`settings.info.preview`](./settings#settings.info) names.

**Writes:** `dist/.lock` while it runs; what the plan writes beside the map (`src/generated/objects.yue`,
`src/generated/declared-ids.json`, `.moonwell/`, `moonwell.lock`, `dist/stage/lua/`, and `dist/stage/declare/`
where the code declares objects); the staged map; the archive, which is written beside its place as
`<map.folder>.tmp` and moved there when it is whole; `dist/moonwell.log`.

**Fails when:**

- The folder is no project, or a settings file is refused.
- Another build is running in the project.
- The archive cannot go where [`build.folder`](./settings#build) and [`map.folder`](./settings#map) put it, as when
  a folder is in its place or a link or a file is on the way to it, or the archive of the build before cannot be
  removed.
- The plan fails: Pkl is not found and cannot be downloaded, or the project's `moonwell` package does not go with
  the program; Pkl or Moonwell refuses an object; the source map is missing or holds something Moonwell refuses; a
  library cannot be fetched; the compiler cannot be downloaded; a source file does not compile; the entry file is
  not there; a global is unknown (with [`lint.unknownGlobals = "warning"`](./settings#lint) it is a warning); the
  top-level code of a module fails in the run that reads the declarations, or Moonwell refuses a declared object;
  `src/generated/declared-ids.json` cannot be used, or no id of a declared object's kind is left free; the map
  cannot take a map setting; an asset cannot be imported; the map's `war3map.lua` is missing or defines no
  `main` or no `config` function.
- The staged map cannot be replaced, as when the game or World Editor has `dist/stage` open.
- The map cannot be packed: it has no `war3map.w3i`, or it is too large for an archive. The staged map is written by
  then.

**Flags:**

- `--entry <file>` compiles from this `.yue` file under `src/` in place of [`map.entry`](./settings#map). Write the
  path from the project folder: `src/arena.yue`.
- `--minify` shrinks the script; runtime errors lose their line numbers. [`build.minify = true`](./settings#build)
  in `moonwell.toml` does the same without the flag, and the flag cannot turn that off. See
  [Gameplay code](../gameplay-code#minified-builds).
- `--dev` makes a development build: Moonwell writes the mode `"dev"` for your macros to read, in place of
  `"release"`. See [Gameplay code](../gameplay-code#build-modes).

### test {#test}

`moonwell test [--entry f] [--minify]`

Stages the map as `build` does, as a development build, then starts Warcraft III on the staged map. `test` starts
the game with the arguments of [`launch.args`](./settings#config-launch), then `-loadfile` and the full path of the
staged map. It does not wait for the game: it ends when the game is started.

`test` needs [`launch.gameExecutable`](./settings#config-launch) in your `config.toml`, the path of the game's
program. It looks for the game last, so a `test` without that setting has planned and staged the map before it
fails. Its error then says `launch.gameExecutable is not set.` and names your `config.toml`.

`test` packs no archive, and it leaves what `build` made in `build.folder` as it is. The setting
[`test.archive`](./settings#test) changes the first of the two: with `test.archive = true`, `test` also packs the
staged map into `dist/test/<map.folder>` and starts the game on that file in place of the folder. It removes the
archive of the last test once it has the lock, before step 3. The setting may stand in `moonwell.toml` or in your
`config.toml`, and yours wins.
[Troubleshooting](./troubleshooting#the-game-shows-its-main-menu-in-place-of-the-map) says when a game needs it.

**Reads:** what `build` reads, and `launch.gameExecutable` and `launch.args` of your `config.toml`.

**Writes:** what `build` writes but the archive in `build.folder`; with `test.archive`, the archive
`dist/test/<map.folder>`.

**Fails when:**

- The plan fails, or the staged map cannot be replaced, as for [`build`](#build).
- Another build is running in the project.
- `launch.gameExecutable` is not set, names a file that is not there, or names something that is no file.
- The game cannot be started.
- With `test.archive`: `dist/test/<map.folder>` is a folder, the archive of the test before cannot be removed, or
  the map cannot be packed.

**Flags:** `--entry <file>` and `--minify`, as for [`build`](#build).

### dev {#dev}

`moonwell dev`

Watches the project and checks it again after every save. `dev` runs one check when it starts, then says what it
watches:

```text
Watching src/, assets/, objects/, lua/ and the project's settings. Press Ctrl+C to stop.
```

Each check is what [`check`](#check) does, with one difference: `dev` writes the ids module and the file of
declared ids as `build` does. An error of a check is printed, and `dev` watches on. It looks at the files four
times a second, and checks once they have stayed unchanged for 150 milliseconds. Stop it with Ctrl+C.

`dev` picks what it watches when it starts:

- `moonwell.toml`, `PklProject` and `PklProject.deps.json` in the project folder.
- The `.yue` files under `src/`, but for `src/generated/`.
- Every file under `assets/`, the `.pkl` files under `objects/` and the `.lua` files under `lua/`, each only when
  its folder is there as `dev` starts.
- For each library that is read from a folder, by [its `path` in `moonwell.toml`](../libraries#a-library-by-path)
  or by [your `config.toml`](../libraries#work-on-a-library-from-a-checkout): its modules, the files it ships and
  its `moonwell-library.json`.
- The picture `settings.info.preview` names.

A change to `moonwell.toml` is checked, and the list stays as it is. So after you make one of the three folders,
give a library a folder or name a picture, stop `dev` and start it again. `dev` does not watch your `config.toml`.

**Reads:** what `check` reads, at every check.

**Writes:** what `check` writes, `dist/moonwell.log` among it, the ids module `src/generated/objects.yue` and the
file of declared ids, `src/generated/declared-ids.json`. It holds `dist/.lock` during a check and not between two
checks.

**Fails when:** the folder has no `src/` folder. `dev` then ends at once. Nothing else ends it but Ctrl+C, after
which the check that is under way finishes and `dev` ends with the exit code 130.

**Flags:** none.

### check {#check}

`moonwell check`

Compiles and validates the project, and builds no map: `check` runs the plan of a development build, steps 1 to 9
above, and stops there. It stages nothing and packs nothing. When the plan stands it says so:

```text
Check passed: 2 module(s) reachable from main, 0 asset(s).
```

`check` fails wherever the plan of a build fails, with the same error. So a project that passes `check` has
objects, settings, assets and code that `build` plans without an error.

**Reads:** what [`build`](#build) reads.

**Writes:** `dist/.lock` while it runs; what the plan writes beside the map but for two files: `.moonwell/`,
`moonwell.lock`, the compile's cache `dist/stage/lua/` and, where the code declares objects, `dist/stage/declare/`;
`dist/moonwell.log`. It does not write the ids module, `src/generated/objects.yue`, or the file of declared ids,
`src/generated/declared-ids.json`: it compares each with the project's objects.

**Fails when:**

- The folder is no project, or a settings file is refused.
- Another build is running in the project.
- The plan fails, as for [`build`](#build).
- `src/generated/objects.yue` does not match the project's objects, or is missing where the project has objects.
  `build`, `test` and `dev` write the file; `check` leaves it and fails. In a project without objects, a file that
  is not there is no failure.
- `src/generated/declared-ids.json` does not match the objects that the code declares, is missing where the code
  declares objects, or is there where it declares none
  ([Objects](../objects#ids-of-declared-objects)).

`check` does not find what `build` finds only when it writes: an archive that cannot go to its place, a staged map
that cannot be replaced, a map too large for an archive. It finds a source map without `war3map.w3i` only when a map
setting is written into that file.

**Flags:** none.

### One build at a time

A command that plans a build or brings the libraries up to date takes the build lock for that work: the file
`dist/.lock`, which holds the process id of the command. The command removes the file when it is done, also when it
fails or when you stop it with Ctrl+C. `build`, `test`, `check`, every check of `dev`, `setup`, `assets:check`,
`assets:sync` and, in a project, `assets:paths` and `assets:gltf` take the lock. `settings:check`, `objects:check`
and `objects:eval` do not.

When the file is there already, the command stops:

```text
error: dist/.lock › Another Moonwell build is running in this project.
hint: Wait for it to finish. If process 1234 is not running, delete dist/.lock.
```

You see this error in two cases. In the first, another command is at work in the same project, such as a
`moonwell dev` in another terminal that is in the middle of a check. Wait, and run the command again. In the
second, a command ended without the chance to remove its lock, and the file was left behind. Then no process has the
number the hint names: delete `dist/.lock`.

## Assets

None of the four commands runs Pkl: of a project they read the settings and not the object files.
[Assets](../assets) describes how assets are written and mapped to paths in the map.

### assets:check {#assets-check}

`moonwell assets:check`

Shows what [`assets:sync`](#assets-sync) would change in the source map, and writes nothing into it. It prints each
asset with the path it gets in the map, then each file of the map it would write or delete, and ends with a count:

```text
Checked 5 asset(s); assets:sync would make 7 file change(s). Nothing was written.
```

**Reads:** `moonwell.toml` and your `config.toml`; the source map; `assets/`; the libraries and the files they ship;
the file under `.asset-state/`.

**Writes:** `dist/.lock` while it runs; the libraries under `.moonwell/` and `moonwell.lock`, which it brings up to
date; `dist/moonwell.log`.

**Fails when:**

- The folder is no project, or a settings file is refused.
- Another build is running in the project.
- The source map is missing, holds something Moonwell refuses, or has no `war3map.lua` or no `war3map.w3i`.
- A library cannot be fetched.
- An asset cannot be imported, as when two assets get the same path in the map, an asset takes the place of a file
  the map has, or a file that `assets:sync` wrote was changed in the map afterwards.

**Flags:** none.

### assets:sync {#assets-sync}

`moonwell assets:sync`

Writes the assets into the source map, `maps/<map.folder>`, so that World Editor shows them. A build imports assets
into the staged map only; `assets:sync` is the one command that changes the source map. It prints the list
`assets:check` prints, then writes the files and `war3map.imp` into the map and deletes the files it wrote before
that are assets no more. It records which files of the map it owns in `.asset-state/<map.folder>.json`
([Assets](../assets#seeing-assets-in-world-editor)).

::: warning
Close the map in World Editor before you run `assets:sync`, and open it again afterwards.
:::

**Reads:** what [`assets:check`](#assets-check) reads.

**Writes:** what `assets:check` writes; the source map; `.asset-state/<map.folder>.json`. When a write fails,
`assets:sync` takes back the writes it made.

**Fails when:** `assets:check` would fail, or a file of the source map or the file under `.asset-state/` cannot be
written.

**Flags:** none.

### assets:paths {#assets-paths}

`moonwell assets:paths [file]`

Lists the files a model references, and says of each whether it is an in-game path or a custom path. In a project it
also says whether a custom path is among the assets the build imports. With a file it reports on that model, whose
path starts at the folder the command runs in. Without a file it reports on every `.mdx` and `.mdl` file among the
assets of the project and of its libraries, and says `No models under assets/.` when there is none
([Assets](../assets#checking-a-models-files)).

**Reads:** the model file. In a project also `moonwell.toml`, your `config.toml`, `assets/` and the libraries. It
does not open the source map.

**Writes:** outside a project, nothing. In a project: `dist/.lock` while it collects the assets, the libraries under
`.moonwell/` and `moonwell.lock`, and `dist/moonwell.log`.

**Fails when:**

- It is run outside a project without a file.
- The file is not there, is a folder, or cannot be read as a model.
- Without a file: a model among the assets cannot be read. The report comes first and says why.
- In a project: a settings file is refused, another build is running, a library cannot be fetched, or the assets
  cannot be collected.

**Flags:** none. The one argument is the model file.

### assets:gltf {#assets-gltf}

`moonwell assets:gltf <model> [output]`

Converts a `.mdx` or `.mdl` model to glTF 2.0 (`.glb` or `.gltf`), with its meshes, skeleton, vertex weights,
sequence animations and materials ([Assets](../assets#converting-a-model-to-gltf)). Without `[output]`, it writes
`<stem>.glb` beside `<model>`. With `[output]` ending in `.glb`, it writes that file; with `[output]` ending in
`.gltf`, it writes `<stem>.gltf`, `<stem>.bin` (when the model has binary buffer data) and each texture as
`<name>.png` in the output file's folder, and prints `Wrote <output>.` A replaceable slot other than
`ReplaceableId 1` (team colour) or `ReplaceableId 2` (team glow) is written as a grey placeholder,
`replaceable_<id>.png`, with a warning line before that, and so is a texture that is found nowhere but is one of
the game's files, under its own name.

**Reads:** the model file and the texture files that its exported materials use (in a project, from the assets of
the project and of its libraries first, then beside the model, below the folder the command runs in and below
`assets/`; outside a project, from those folders on disk). In a project also `moonwell.toml`, your `config.toml`,
`assets/` and the libraries. It does not open the source map.

**Writes:** the `.glb` file, or the `.gltf`, `.bin` and `.png` files. In a project also `dist/.lock` while it
collects the assets, the libraries under `.moonwell/` and `moonwell.lock`, and `dist/moonwell.log`.

**Fails when:**

- `<model>` does not end in `.mdx` or `.mdl`, is not there, is a folder, or cannot be read as a model.
- `[output]` is a folder, does not end in `.glb` or `.gltf`, or cannot be written; or a file it would write has a
  link on the way to it inside the folder the command runs in.
- The `.bin` or a `.png` of a `.gltf` would replace the model or a texture the model was converted from. Nothing
  is written then.
- A texture that an exported material uses by path is not found and is not one of the game's files, or cannot be
  decoded as a `.blp`, `.dds`, `.tga` or `.png` texture.
- In a project: a settings file is refused, another build is running, a library cannot be fetched, or the assets
  cannot be collected.

**Flags:** none. The arguments are `<model>` and, optionally, `[output]`.

## Settings and objects

### settings:check {#settings-check}

`moonwell settings:check`

Shows which files of the map the map settings of `moonwell.toml` would change in a build. It prints the name of each
file, and ends with a count:

```text
Map settings valid: 4 internal file(s) would change during build.
```

[Map settings](../map-settings) describes the settings, and has
[a run of the command](../map-settings#checking-settings).

**Reads:** `moonwell.toml` and your `config.toml`; the source map; the picture `settings.info.preview` names. It
runs no Pkl and takes no build lock.

**Writes:** `dist/moonwell.log`, and nothing else.

**Fails when:**

- The folder is no project, or a settings file is refused.
- The picture `settings.info.preview` names is not there or cannot be read.
- The source map is missing, or holds something Moonwell refuses.
- The map cannot take a map setting.

**Flags:** none.

### objects:check {#objects-check}

`moonwell objects:check`

Shows which files of the map the objects would change in a build. It prints the name of each file, then whether the
ids module is `current`, `stale` or `missing`, and ends with a count:

```text
Object data valid: 1 object(s), 2 internal file(s) would change during build.
```

In a project without objects, an ids module that is not there counts as `current`.

`objects:check` reads the object files alone. It runs no code, so the objects that the code declares are not in its
list or its count, and it does not look at the file of declared ids
([Objects](../objects#what-the-object-commands-do-not-show)).

[Objects](../objects) describes the object files and [the ids module](../objects#the-generated-ids).

**Reads:** `moonwell.toml` and your `config.toml`; the object files under `objects/`, through Pkl, with
`PklProject.deps.json`; the source map. It takes no build lock.

**Writes:** `.moonwell/objects.pkl`, the module that gathers the object files, where the project has object files;
`dist/moonwell.log`. It does not write the ids module.

**Fails when:**

- The folder is no project, or a settings file is refused.
- The project has object files, and Pkl is not found and cannot be downloaded, Pkl refuses an object file, or the
  project's `moonwell` package does not go with the program.
- The source map is missing, or holds something Moonwell refuses.
- Moonwell refuses an object.
- The ids module, `src/generated/objects.yue`, is stale, or is missing where the project has objects. `build`,
  `test` and `dev` write it.

**Flags:** none.

### objects:eval {#objects-eval}

`moonwell objects:eval`

Prints the objects as JSON on standard output, after the same checks as `objects:check` but for the ids module,
which it does not look at. The JSON has one member for each kind of object: `heroes`, `units`, `buildings`, `items`,
`abilities`, `buffs` and `upgrades`. Each holds the objects of that kind by their key, with the `id`, the `base`,
the `source` file and the `fields` of each. Like `objects:check`, it reads the object files alone: an object that
the code declares is not in the JSON.

**Reads:** what [`objects:check`](#objects-check) reads, but for the ids module.

**Writes:** what `objects:check` writes.

**Fails when:** `objects:check` would fail, but for the ids module.

**Flags:** none.

## The shell

### completion {#completion}

`moonwell completion <shell>`

Prints a completion script for `bash`, `zsh`, `fish` or `powershell` on standard output. Each shell has a help of
its own, which says how to load the script: `moonwell completion bash --help`. Without a shell, `completion` prints
its help.

For PowerShell, add this line to your profile (`notepad $PROFILE`):

```powershell
moonwell completion powershell | Out-String | Invoke-Expression
```

If PowerShell has no profile yet, make the file first:

```powershell
if (!(Test-Path $PROFILE)) { New-Item -Force $PROFILE }
```

`completion` needs no project, reads no settings and writes no file.

**Flags:** `--no-descriptions` leaves the descriptions out of the completions.
