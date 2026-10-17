# Installation

After this page, `moonwell` is on your PATH, you know which files the install made, and you know how to update it.
These pages describe Moonwell 0.12.10.

## What you need

- **Windows or Linux on x86-64.** Moonwell is built for these two systems.
- **Warcraft III Reforged, with its World Editor.** The game plays your map, and World Editor edits the map that a
  project builds from. Installing Moonwell and building a map need neither.
- **An editor of your choice.** Moonwell needs none in particular. [Editor setup](./editor-setup) shows how to set up
  VS Code for a project.

## Install Moonwell

On Windows, run this line in PowerShell:

```powershell
irm https://github.com/mdlsvensson/moonwell/releases/latest/download/install.ps1 | iex
```

On Linux, run this line in a shell:

```sh
curl -fsSL https://github.com/mdlsvensson/moonwell/releases/latest/download/install.sh | sh
```

The line runs the install script of the newest release. The script downloads one program, `moonwell`, from that
release on GitHub and checks it against the release's SHA-256 checksums. When the two do not match, it installs
nothing.

**On Windows** the program is `%LOCALAPPDATA%\moonwell\bin\moonwell.exe`. The script adds that folder to your user
PATH, and to the PATH of the PowerShell window you ran it in. A terminal that was already open does not see the
change: open a new one. The `bin` folder is part of Moonwell's cache folder, which the variable `MOONWELL_CACHE`
moves: see [Files and caches](./reference/files#the-cache-folder).

**On Linux** the program is `~/.local/bin/moonwell`. The script does not change your PATH. When that folder is not on
it, the script says so and prints the line that adds it:

```sh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.profile
```

Run that line once, then open a new terminal.

To check the install, ask for the version:

```sh
moonwell --version
```

It prints the version that is installed ([Commands](./reference/commands#help-and-version)).

## Your settings file

The script also makes `config.toml`, the settings of your machine, when that file is missing. It is in the folder
`.moonwell` in your user folder: `C:\Users\<you>\.moonwell\config.toml` on Windows, `~/.moonwell/config.toml` on
Linux. When the variable `MOONWELL_HOME` is set, the file is in the folder it names
([Files and caches](./reference/files#the-moonwell-folder)). Both scripts write the same two lines:

```toml
[launch]
gameExecutable = 'C:\Program Files (x86)\Warcraft III\_retail_\x86_64\Warcraft III.exe'
```

That is where Battle.net installs the game on Windows by default. The Linux script writes the same line, with this
Windows path. The script says where the file is and asks you to check the path. It never changes a `config.toml` that
is already there.

`moonwell test` reads the game's path from this file ([Your first map](./first-map#tell-moonwell-where-the-game-is)),
and [Settings](./reference/settings#your-machine-config.toml) lists everything else it can hold.

## Pkl

A project's object files, the `.pkl` files under `objects/`, are written in [Pkl](https://pkl-lang.org), and Moonwell
runs the `pkl` program to read them (see [Objects](./objects#object-files)). You do not have to install Pkl
yourself:

- When the `pkl` on your PATH is Pkl 0.32 or newer, Moonwell runs that one.
- Otherwise Moonwell downloads Pkl 0.32.1 into its [cache folder](./reference/files#the-cache-folder) and runs
  that. The download is about 100 MB. It is checked against a SHA-256 checksum that is part of Moonwell, and it
  happens once. When the `pkl` on your PATH is older than 0.32, Moonwell also warns you, and says that a `pkl`
  command you type yourself still runs the old one.

In a project, Pkl runs only where there are object files: a project without a `.pkl` file under `objects/` needs no
Pkl. `moonwell init` runs Pkl too: it runs `pkl project resolve` in the project it makes, which has an object file.
So the download, when Moonwell needs it, comes with the first command that runs Pkl, such as your first
`moonwell init`.

A `pkl` command that you type yourself, such as `pkl project resolve`, runs the `pkl` on your PATH, and the one in
the cache is not there. For that, run [`moonwell setup`](./reference/commands#setup) in a project with object
files. It copies the Pkl that Moonwell downloaded into the `bin` folder of the cache, the folder where `setup` keeps
`yue` for your editor ([Editor setup](./editor-setup#run-moonwell-setup)). On Windows that is the folder the install
script added to your PATH. On Linux it is `~/.cache/moonwell/bin`, unless a variable moved the cache. On either
system, when no `pkl` is on your PATH, `setup` prints the line that adds the folder to it. With an older `pkl` on
your PATH, `setup` makes the copy and does not print that line, and a `pkl` command that you type still runs the one
that comes first on your PATH: take the old `pkl` off your PATH and run `moonwell setup` again, or put Pkl 0.32 or
newer in its place.

## Installing one version

The install line above installs the newest release. A release also has an install script of its own, which installs
that release. For Moonwell 0.12.10, on Windows:

```powershell
irm https://github.com/mdlsvensson/moonwell/releases/download/moonwell@0.12.10/install.ps1 | iex
```

On Linux:

```sh
curl -fsSL https://github.com/mdlsvensson/moonwell/releases/download/moonwell@0.12.10/install.sh | sh
```

When a project's object files do not go with the Moonwell you have (see [Updating](#updating)), Moonwell's error
prints this line for the version the project names.

## Updating

Run the install line again. It installs the newest release in place of the one you have, and it leaves your
`config.toml` as it is. There is no update command.

On Windows, when the script cannot write `moonwell.exe`, it tells you to close every running `moonwell`, such as a
terminal that runs `moonwell dev`, and to run the line again.

### A project with object files

A project with object files names the Moonwell it is written for: the version of the `moonwell` Pkl package in its
[`PklProject`](./objects#pklproject). The program and the package must have the same major and minor version, the
first two of the three numbers. Where they differ, a command that reads the object files stops with an error that
names both versions and says what to change.

To move such a project to the Moonwell you installed, change the version at the end of the package's address in
`PklProject`. For Moonwell 0.12.10 the file is this, as `moonwell init` writes it:

```pkl
amends "pkl:Project"

dependencies {
  ["moonwell"] { uri = "package://pkg.pkl-lang.org/github.com/mdlsvensson/moonwell/moonwell@0.12.10" }
}
```

Then run `pkl project resolve` in the project folder. It writes `PklProject.deps.json` beside `PklProject`, and that
is the file Moonwell reads the package's version from.

::: note
If you have no `pkl` command for this step, `moonwell setup` gives you one: see [Pkl](#pkl). In a project that is not
moved yet, `setup` still copies Pkl, and then stops with the version error.
:::

The other way works too: keep the project as it is and install the Moonwell it names, with the line under
[Installing one version](#installing-one-version).

## See also

- [Commands](./reference/commands): [`moonwell setup`](./reference/commands#setup) and every other command.
- [Settings](./reference/settings#your-machine-config.toml): every setting of `config.toml`.
- [Files and caches](./reference/files): the cache folder, the Moonwell folder and the variables that move them.
- [Troubleshooting](./reference/troubleshooting#installing): a `moonwell` that is not found after the install, and
  a Pkl that is missing or too old.
- [Your first map](./first-map): the next page. It makes a project, builds it and starts the game on it.
