# Moonwell

Moonwell is one program, `moonwell`, that builds a Warcraft III map from a project folder. A project holds a map that
World Editor saved as a folder, gameplay code in YueScript and plain Lua, settings in a TOML file, custom objects
written in Pkl or declared in the gameplay code, and files to import into the map.

## What a build does

`moonwell build` works out the whole map first, and writes it afterwards. Its steps, in order:

1. It reads the settings: `moonwell.toml` of the project, then `config.toml` of your machine.
2. Where the project has a `.pkl` file under `objects/`, it runs Pkl to evaluate the object files.
3. It opens the source map, `maps/<map.folder>`, which is the map as World Editor saved it, and reads which globals
   its script defines.
4. It checks the objects of your object files against the game's data and against the objects the map already has.
5. It writes the ids of the objects of your object files as a module for your code to import,
   `src/generated/objects.yue`, and the files your editor reads, under `.moonwell/`.
6. It brings the libraries that the project names up to date, under `.moonwell/`.
7. It compiles the YueScript files to Lua, follows the imports from the entry, which is `src/main.yue` in a new
   project, and checks the modules it reaches for unknown globals.
8. Where the code declares objects, it runs the entry once, without the game, in the run that reads the
   declarations, checks the declared objects with the others, and writes their ids into
   `src/generated/declared-ids.json`.
9. It plans every file of the map that changes, each on the map as the one before leaves it: the object data, the map
   settings, the imported files, and last the map's script, with your code added at its end.
10. It replaces `dist/stage/<map.folder>` with a copy of the source map and writes the planned files into the copy.
11. It packs that map into one archive, `<build.folder>/<map.folder>`.

Nothing of the map is written before step 10: the first step that fails ends the build with its error. The archive
of the build before is another matter. `build` removes it before step 3, once it has the
[build lock](./reference/commands#one-build-at-a-time). So the old archive stays when step 1 or step 2 fails and
when the lock is held, and it is gone when a later step fails ([Commands](./reference/commands#build)).

A build never changes the source map: it only reads it. It writes the built map in two forms. The folder
`dist/stage/<map.folder>` is the staged map: a copy of the source map with the planned files written into it, the
built map as a folder. The archive is the built map as one file, which is `dist/bin/map.w3x` in a new project.

The other commands that build are parts of this. `moonwell check` works everything out and writes no map,
`moonwell test` writes the staged map and starts the game on it, and `moonwell dev` checks again after every save.
[Commands](./reference/commands#building) has the full account.

## What you need

Moonwell is built for Windows and Linux on x86-64. You need Warcraft III Reforged with its World Editor to play a map
and to edit the map a project builds from, and an editor of your choice for the code:
[Installation](./installation#what-you-need) has the list.

## The two libraries

A project can add libraries, which [Libraries](./libraries) describes. Two are written for Moonwell, and each has its
own section of these pages.

- [moonwell-wrappers](../wrappers/) is an annotated Lua library that wraps the game's natives: players, units, timers,
  triggers, frames and more, with completion in your editor and explicit cleanup.
- [moonwell-systems](../systems/) is a set of gameplay systems built on moonwell-wrappers: a scheduler, buffs and
  auras, a damage pipeline, missiles and knockbacks, and save files.

## The version these pages describe

These pages describe Moonwell 0.12.10. The releases of the two libraries that go with it are moonwell-wrappers v0.10.1
and moonwell-systems v0.6.1. Where a page says what the game does, that was measured on Warcraft III Reforged
3.0.0.24268, unless the page names another version.

## Where to start

Start with [Installation](./installation), which puts `moonwell` on your PATH. Then
[Your first map](./first-map) makes a project, builds it and starts the game on it.
