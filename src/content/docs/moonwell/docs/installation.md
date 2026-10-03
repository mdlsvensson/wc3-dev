---
title: Install Moonwell
description: Install the Moonwell CLI, build a template map, and set up your editor.
---

Moonwell's release installer supports **Windows and Linux on x86-64**. You do
not need to install Go, Deno, Node.js, or clone the Moonwell repository.
Warcraft III and a Lua-capable World Editor are needed to edit and play maps.
The Linux CLI installer is not a tested Linux game-launch recipe.

## 1. Install Moonwell

Run this in PowerShell on Windows:

```powershell title="Install the latest release"
irm https://github.com/mdlsvensson/moonwell/releases/latest/download/install.ps1 | iex
```

On Linux, use:

```sh title="Install on Linux"
curl -fsSL https://github.com/mdlsvensson/moonwell/releases/latest/download/install.sh | sh
```

The installer checks the downloaded program against the release's SHA-256
checksums. On Windows it installs to `%LOCALAPPDATA%\moonwell\bin` (or
`MOONWELL_CACHE\bin` when that variable is set) and adds that folder to your
user PATH. Open a new terminal afterwards. On Linux it installs to
`~/.local/bin` and tells you if that folder needs adding to PATH.

```powershell title="Check the installed CLI"
moonwell --version
```

These guides target 0.9.1. To install that version explicitly:

```powershell
irm https://github.com/mdlsvensson/moonwell/releases/download/moonwell@0.9.1/install.ps1 | iex
```

Moonwell uses Pkl 0.32 or newer from PATH when available. Otherwise it downloads
Pkl 0.32.1 once into its cache, checks its pinned checksum, and runs that copy.
The download is about 100 MB. An older Pkl on PATH produces a warning because
typing `pkl` yourself still runs that older executable. Moonwell also downloads
the project's pinned YueScript compiler, currently 0.34.3.

## 2. Create and build a project

```powershell
moonwell init my-map
cd my-map
moonwell check
moonwell build
```

`init` creates a new project and resolves its Pkl package. The first commands
may need internet access for the package and managed tools. Your editable map
is `maps/map.w3x/`, a folder containing the World Editor map files.

The distributable archive is **`dist/bin/map.w3x`**. The folder
`dist/stage/map.w3x/` is a generated staging copy. Edit the source map, never
the staging copy. To use a different map, follow [Use your own map](/moonwell/docs/custom-maps/).

## 3. Set your game path

`init` writes an ignored `moonwell.local.pkl` with the default Battle.net
install path. Change that file if Warcraft III is installed elsewhere:

```pkl title="moonwell.local.pkl"
amends "moonwell.pkl"

launch {
  gameExecutable = #"C:\Program Files (x86)\Warcraft III\_retail_\x86_64\Warcraft III.exe"#
}
```

Pkl's raw string syntax `#"…"#` keeps single backslashes. An ordinary quoted
string needs doubled backslashes. Select `Warcraft III.exe`, not World Editor
or the Battle.net launcher. Shared project settings belong in `moonwell.pkl`;
`moonwell.local.pkl` amends it for this machine.

## 4. Play the sample

```powershell
moonwell test
```

This compiles, stages, and launches the map folder in Warcraft III. It does not
refresh the packed archive. The template prints “Moonwell is running.” and
creates a Captain and a Footman just north of its preplaced heroes. The
Captain changes player color every second; turn off ally color mode with
Alt+A to see those changes.

## 5. Set up VS Code

Open the project folder itself in VS Code. Install its recommended
**YueScript** (`LiJin.yuescript`) and **Lua** (`sumneko.lua`) extensions, then run:

```powershell
moonwell setup
```

`setup` prepares missing editor files, `.moonwell/types/`, the macro module,
and the pinned compiler for the editor. When Moonwell uses its managed Pkl,
`setup` copies that into the cache's `bin` folder too, making commands such as
`pkl project resolve` available from the shell once that folder is on PATH.
Follow any PATH command it prints, open a new terminal, and restart VS Code.
The CLI's `setup` command does not change PATH itself.

Open the map project as the first workspace folder. Lua language server reads
`.luarc.json` there; opening a parent folder, a single file, or the project as
a second workspace folder can prevent completion from working. Saving YueScript
in VS Code creates ignored `.lua` files beside it for completion. Builds compile
the `.yue` source independently and do not use those editor-generated files.

A Pkl editor extension is optional. It adds schema completion through
`PklProject`; sync its projects after `init` and set its CLI path if it cannot
find Pkl. Native, Blizzard.j, object-ID and editor-global declarations are
refreshed by `check`, `build`, `test`, and `dev`.

## Updating an existing project

Run the installer again to update the CLI. The CLI and the `moonwell` package
in `PklProject` must have the same major and minor version. When changing the
package version, run `pkl project resolve`; use `moonwell setup` first if you
need the managed Pkl exposed to your shell. See [Upgrades](/moonwell/docs/reference/#upgrades)
for older Moonwell projects and the distinction from the TypeScript framework.
