# Libraries

After this page you can add a library to a project and pin it to the code you built with. You can work on a library
from a checkout while a map uses it, and you can lay out a library of your own.

## Add a library

A library is a folder of YueScript and Lua modules. It can also ship files for the map. A project lists the
libraries it uses in `moonwell.toml`, one entry for each. This entry adds moonwell-wrappers, at one tag of its
repository on GitHub:

```toml
[[libraries]]
name = "wrappers"
github = "mdlsvensson/moonwell-wrappers"
tag = "v0.10.1"
```

`name` is the library's name in your project: Moonwell keeps the library in a folder of that name under
`.moonwell/`, and its messages call the library by it. `github` is the repository, and `tag` is a tag of it.
[Settings](./reference/settings#libraries) has the rule of each setting.

The next command that brings the libraries up to date fetches the tag from GitHub. Eight commands do that: `build`,
`test`, `check`, `dev`, `setup`, `assets:check`, `assets:sync` and `assets:paths`. The one that fetches says so in
a line that starts with `Fetched library wrappers:`. After that come the repository, the tag and, in parentheses,
the first seven characters of the commit that the tag names.

The library's modules are then in `.moonwell/libraries/wrappers/`. The files that a library ships for the map go
into `.moonwell/library-assets/`, in a folder of the library's name. moonwell-wrappers ships none, and
[Assets](./assets#a-librarys-files) describes what a build does with such files. The template's `.gitignore` leaves
`.moonwell/` out of git, so every clone of the project fetches its libraries itself.

A library that is there is not fetched at every run. Moonwell fetches it again when its folder is missing or is not
the copy that `moonwell.lock` records, and when you change the entry's `github`, `tag` or `dir`. A run that fetches
nothing prints no line about the library. When the repository has no such tag, the command fails, and its hint
names the page of the repository's tags on GitHub.

A library brings code that runs in your map, and its YueScript modules are compiled on your machine, where the
compiler runs their macros. Add only a library you trust: see
[Build only a project you trust](./project-layout#build-only-a-project-you-trust).

### Import its modules

A module of a library is named by its path, as a module of your own is
([Modules and imports](./gameplay-code#modules-and-imports)). The path starts below one folder of the library, the
folder that its module names start from (see [Write a library](#write-a-library)). In moonwell-wrappers that folder
is `src`, so its file `src/wrappers/unit.lua` is the module `wrappers.unit`. In the project of
[Your first map](./first-map), this `src/main.yue` makes the template's Captain through the library:

```yue
import "moonwell" as mw
import "generated.objects" as objects
import "wrappers.player" as Player
import "wrappers.unit" as Unit

mw.on_main ->
  captain = Unit.create Player.fromIndex(0), objects.units.captain, 45, -650, 270
  captain\setLife 250
```

The `wrappers` at the start of the two names is a folder of the library, not the `name` of your entry. With another
`name`, the imports stay as they are.

A library adds to the map only the modules that your code reaches from the entry
([The entry](./gameplay-code#the-entry)).

### One set of module names

`src/`, `lua/` and the libraries of the project share one set of module names. A file of yours that gives a name
that a library has fails the build. Here the project has a `lua/wrappers/unit.lua` of its own:

```text
error: .moonwell/libraries/wrappers/wrappers/unit.lua › Module wrappers.unit is defined by lua/wrappers/unit.lua and .moonwell/libraries/wrappers/wrappers/unit.lua.
hint: Rename one of them, or narrow the library's `dir`: module names are shared by src/, lua/ and libraries.
```

Rename your file. Two libraries that give the same name fail in the same way.

### A library that needs another

A library cannot name another library that it needs. Its `moonwell-library.json` has no setting for that (see
[Write a library](#write-a-library)), and Moonwell fetches the libraries that `moonwell.toml` lists and no others.
So the project lists both. moonwell-systems requires modules of moonwell-wrappers, and a project that uses it has
two entries:

```toml
[[libraries]]
name = "wrappers"
github = "mdlsvensson/moonwell-wrappers"
tag = "v0.10.1"

[[libraries]]
name = "systems"
github = "mdlsvensson/moonwell-systems"
tag = "v0.6.1"
```

With the second entry alone, a build fails as soon as your code reaches a module that requires one of
moonwell-wrappers. The error is the one for a missing module, and it names the file of the library that requires
it. Here the project's code imports `systems.buffs`:

```text
error: .moonwell/libraries/systems/systems/scheduler.lua:4 › Module 'wrappers.timer' not found.
hint: Expected src/wrappers/timer.yue, lua/wrappers/timer.lua, lua/wrappers/timer/init.lua or a module of a library in moonwell.toml. Built-in modules: moonwell.
```

## `moonwell.lock`

A command that fetches a library from GitHub writes `moonwell.lock` in the project folder. For each such library
the file records the entry's `github`, `tag` and `dir`, the commit that the tag named, a hash of the library's
modules and, where the library ships files for the map, a hash of those
([Files and caches](./reference/files#moonwell.lock)).

Commit the file. A tag is a name, and the owner of a repository can move it to other code. With `moonwell.lock` in
git, a fresh clone of your project gets the code you built with, or none: when Moonwell fetches a library that the
file records, it compares what it got with the record. When the tag names another commit, the command fails and
takes nothing of the other code. Its error says that the tag `moved from` one commit `to` another
`since moonwell.lock recorded it`. When the commit is the same and the files are not, it says that the files of the
tag `are not those moonwell.lock recorded`. To take the tag as it is, delete the library's record from
`moonwell.lock` and run the command again.

Moonwell compares only when it fetches. A library whose folder is up to date is not fetched again, so a moved tag
shows on the machine that fetches next, such as a fresh clone.

To upgrade a library, change `tag` in `moonwell.toml` and run one of the eight commands. It fetches the other tag
and records its commit in `moonwell.lock`. Commit both files.

When you take an entry out of `moonwell.toml`, the next of those commands removes the library's folders under
`.moonwell/` and its record in `moonwell.lock`. When the file has no record left, the command removes the file.

## Work on a library from a checkout

To change a library while a map uses it, clone its repository, and say in your `config.toml` where the clone is:

```toml
[[libraries]]
github = "mdlsvensson/moonwell-wrappers"
path = 'C:\Users\me\Repo\moonwell-wrappers'
```

`config.toml` holds the settings of your machine ([Installation](./installation#your-settings-file)). `github` is
the repository as a project's entry names it. `path` is the folder of the clone, as an absolute path: the root of
the repository, not the folder of its modules. [Settings](./reference/settings#config-libraries) has the rules.

Every project on your machine that lists the repository then reads the library from that folder, whatever tag the
project names. The two repositories are compared without regard to letter case. The entry adds no library to a
project that does not list the repository. Each of the eight commands says at every run that it reads the folder:

```text
Library wrappers: the local folder C:\Users\me\Repo\moonwell-wrappers (C:\Users\me\.moonwell\config.toml).
```

The line names the library, the folder, and the `config.toml` that names the folder.

Nothing that you commit in the project changes. `moonwell.toml` names the tag as it did, and `moonwell.lock` keeps
its record of the library. Only the copy under `.moonwell/` is another: it holds the modules of your clone. To go
back to the tag, take the entry out of `config.toml`. The next command fetches the tag again, and compares it with
`moonwell.lock` as it does for a fresh clone.

## A library by path

A project can name a folder itself: a `path` in place of `github` and `tag`. That suits a library that lives inside
the project or beside it, such as one that you are writing:

```toml
[[libraries]]
name = "mylib"
path = "../my-library"
```

`path` is the root of the library, relative to the project folder or absolute. Moonwell fetches nothing for such an
entry, prints no line about it and records nothing of it in `moonwell.lock`. A record that the file has under the
library's name, from a time when the entry named a repository, stays there. An entry in your `config.toml` is
matched by `github`, so it does nothing to an entry that has a `path` and no `github`.

The examples below use this library. It has one module, the file `src/mylib/hello.yue`:

```yue
export greet = (name) ->
  print "Hello, #{name}."
```

[Write a library](#write-a-library) describes how such a folder is laid out, and shows the
`moonwell-library.json` of this one.

## What happens to a local folder

A checkout that your `config.toml` names and a folder that the project names by `path` are treated alike. Moonwell
does not build from the folder itself. At every run, each of the eight commands compares the folder with its copy
under `.moonwell/`, writes the files that differ and removes the ones that are gone from the folder:

- Into `.moonwell/libraries/<name>/` go the `.yue` and `.lua` files below the folder that module names start from.
- Into `.moonwell/library-assets/<name>/` goes every file of the library's folder of files for the map.

A file or a folder whose name starts with a dot, such as `.git`, is left out. Moonwell writes nothing into your
folder.

A build reads the copy. So an error in the library's code names the file of the copy, not the file you edit. Here
`src/mylib/hello.yue` of the library above has a third line, `if`, which does not compile:

```text
error: .moonwell/libraries/mylib/mylib/hello.yue:3 › expected valid expression
3: expected valid expression
1 | export greet = (name) ->
2 |   print "Hello, #{name}."
3 |   if
       ^
```

Correct the file in your own folder. A change that you make in the copy is gone at the next run.

`moonwell dev` watches a local folder: its modules, its files for the map and its `moonwell-library.json`. The line
that `dev` prints when it starts lists the folders, here for the library above, with its modules in `src` and with
files for the map in a folder `assets`:

```text
Watching src/, assets/, objects/, lua/, ../my-library/src/, ../my-library/assets/ and the project's settings. Press Ctrl+C to stop.
```

A save in one of them starts a check, as a save under `src/` does. `dev` picks the folders when it starts, and it
does not watch your `config.toml`. So after you add a library by `path`, or an entry to `config.toml`, stop `dev`
and start it again ([Commands](./reference/commands#dev)).

## Write a library

A library is a folder with modules in it. To share it, make it a repository on GitHub and give it a tag: a
project's entry names a tag. Below one folder of the library, every `.yue` and `.lua` file is a module, named by
its path below that folder. In the library of [A library by path](#a-library-by-path) that folder is `src`. So its
file `src/mylib/hello.yue` is the module `mylib.hello`, and a project that lists the library imports it by that
name.

A library says how it is laid out in a file `moonwell-library.json` in its root. This is the file of that library,
which also ships files for the map:

```json
{ "dir": "src", "assets": "assets" }
```

- `dir` is the folder that module names start from.
- `assets` is the folder of the files that the library ships for the map. Each is imported at the path it has
  below that folder: `assets/war3mapImported/mylib/Banner.blp` is `war3mapImported\mylib\Banner.blp` in the map
  ([Assets](./assets#a-librarys-files)).

Both are optional, and so is the file. Without a `dir`, module names start at the root of the library. Without
`assets`, the library ships no files. Each of the two names a folder inside the library, with `/` between its
parts: a value that is no text, or that holds a backslash, a colon, an empty part, `.` or `..`, is an error. The
file of moonwell-wrappers and the one of moonwell-systems are both `{ "dir": "src" }`.

Any other name in the file fails the command, in every project that uses the library:

```text
error: C:\Users\me\Repo\my-library\moonwell-library.json › Library mylib: moonwell-library.json has an unknown key "requires".
hint: This Moonwell knows dir and assets; the library may need a newer Moonwell.
```

A project's entry can name the module folder too, with `dir = "src"` in `moonwell.toml`. Where the entry has a
`dir`, it stands, whatever the library's file says. That serves a library that keeps its modules in a folder and
has no `moonwell-library.json`, and it is the narrower `dir` that some hints speak of.

Some rules for what the two folders hold:

- **Every `.yue` file below `dir` is compiled** whenever a project that uses the library is built or checked. A
  file that does not compile fails that command, also when nothing imports it.
- **A `.lua` file beside a `.yue` file of the same name is skipped.** Moonwell takes it for the Lua that the `.yue`
  file compiles to, which VS Code's YueScript extension writes beside a file you save
  ([Editor setup](./editor-setup#the-lua-files-beside-your-yue-files)).
- **No dot in a module's name.** A file such as `hello.test.lua` below `dir` fails the build, with
  `Module file and folder names cannot contain dots.` A module cannot take the name `moonwell` either. Keep the
  `.yue` and `.lua` files that are no modules outside `dir`.
- **File names.** In both folders, Moonwell refuses two names that differ only in letter case, and a name that
  Windows cannot hold ([Assets](./assets#what-is-refused) lists those).
- **Keep the files for the map under a folder of the library's own**, such as `assets/war3mapImported/mylib/`. Two
  libraries with a file at the same path in the map are an error, unless a file of the project takes that path.
  And a file of the project at a library's path is imported in the library's place
  ([Assets](./assets#a-librarys-files)).

The two libraries that are written for Moonwell each keep their modules in one folder below `src`: `src/wrappers/`
and `src/systems/`. So every module name of theirs starts with `wrappers.` or `systems.`. Do the same in a library
of your own: its module names share one set with the project's and with those of every other library the project
lists.

To try a library before it has a tag, list it by `path` in a project
(see [A library by path](#a-library-by-path)). Once a tag is out, do not move it: a project that has recorded its
commit fails when it fetches the other code (see [`moonwell.lock`](#moonwell.lock)). Give the new code a new tag.

## Libraries and the checks

The check for unknown globals reads the YueScript modules of your project, and not the modules of a library: a
library's code is not checked. What a library's modules declare counts as known in your code, when the entry
reaches the module: a name that a YueScript module declares with `global`, and a name that a Lua module defines at
its top level ([What counts as known](./gameplay-code#what-counts-as-known)).

Your editor finds the libraries' modules in `.moonwell/lua/`
([Editor setup](./editor-setup#modules-of-a-library)). The folder holds every module of every library as a
Lua file, at the path of its name: `wrappers.unit` is `.moonwell/lua/wrappers/unit.lua`. The `.luarc.json` of a new
project lists the folder under `workspace.library`, for lua-language-server. `build`, `test`, `check` and `dev`
write a Lua module there as it is, and a YueScript module as the Lua it compiles to. `setup` compiles nothing: it
writes the Lua modules, and leaves the compiled ones as the last of the four wrote them
([Files and caches](./reference/files#project-moonwell)). So after you add a library or change its tag, run
`moonwell check`, and your editor has its modules.

## See also

- [moonwell-wrappers](../wrappers/) and [moonwell-systems](../systems/): the two libraries that are written for
  Moonwell. Each has a section of its own.
- [Settings](./reference/settings#libraries): the `[[libraries]]` list of `moonwell.toml`, and
  [the one of your `config.toml`](./reference/settings#config-libraries).
- [Assets](./assets#a-librarys-files): what a build does with the files a library ships for the map.
- [Files and caches](./reference/files#project-moonwell): the folders of a library under `.moonwell/`, and
  [`moonwell.lock`](./reference/files#moonwell.lock).
- [Troubleshooting](./reference/troubleshooting#a-librarys-tag-moved): a tag that moved, and
  [a module that is not found](./reference/troubleshooting#a-module-is-not-found).
- [Editor setup](./editor-setup): the next page. It sets up VS Code for a project.
