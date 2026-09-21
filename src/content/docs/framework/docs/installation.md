---
title: Installation
description: Set up the tools, build the template, and play your first map.
---

You'll need **Warcraft III: Reforged** with a Lua-capable World Editor to edit and
play maps. Run the commands below in PowerShell.

## 1. Install the tools

Install [Deno](https://deno.com/), [Pkl](https://pkl-lang.org), and
[Git](https://git-scm.com/), then verify they're available:

```powershell title="Check your tools"
deno --version
pkl --version
git --version
```

<details>
<summary>Pkl isn't on PATH?</summary>

Set its executable path for this terminal session:

```powershell
$env:PKL_EXECUTABLE = 'C:\path\to\pkl.exe'
```

</details>

## 2. Clone the repository and install dependencies

```powershell title="Get the framework"
git clone https://github.com/mdlsvensson/w3ts-framework.git
cd w3ts-framework
deno install --frozen
```

Deno downloads the locked dependencies and manages `node_modules/`. No separate
Node.js installation is needed.

## 4. Set your game path

Update `gameExecutable` in `config.json`, keeping the other settings:

```json title="config.json · gameExecutable"
{
  "gameExecutable": "C:\\Program Files (x86)\\Warcraft III\\_retail_\\x86_64\\Warcraft III.exe"
}
```

Use double backslashes or forward slashes. Select the game executable, not World
Editor or the Battle.net launcher.

:::tip[Working with others?]
Copy `config.json` to `config.local.json` and set your personal path there. Keep
shared settings in `config.json`. See [all configuration options](/framework/docs/reference/#configuration).
:::

## 5. Check and build

```powershell title="Validate and package"
deno task typecheck
deno task lint
deno task test:unit
deno task build
```

Each command should succeed. Your distributable map is **`dist/bin/map.w3x`**;
`dist/map.w3x/` holds the intermediate files, do not edit this map. The editable map is the map folder `maps/map.w3x`. To use your own map, see [custom maps](/framework/docs/custom-maps/).

## 6. Play the sample

```powershell
deno task test
```

This rebuilds and launches the staged map in Warcraft III. Look for build
information and a Footman at the map origin that changes color every second.

## 7. Set up VS Code

Open the repository in Visual Studio Code and install the recommended **Deno**
extension. The included settings enable Deno for `scripts/`; `src/` uses the
gameplay TypeScript configuration.

[Pkl language support](https://pkl-lang.org/vscode/current/index.html) adds schema
completion. Generated schemas and base constants are already included.
