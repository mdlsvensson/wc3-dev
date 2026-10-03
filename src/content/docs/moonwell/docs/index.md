---
title: Moonwell documentation
description: Build Warcraft III maps with YueScript and Lua gameplay, Pkl data, and the Moonwell CLI.
---

Moonwell combines a World Editor map with gameplay code, custom objects, assets,
and map settings. You keep terrain, placements, and editor triggers in World
Editor; Moonwell builds a separate map from those sources.

These guides describe **Moonwell 0.9.1**, **moonwell-wrappers v0.9.1**, and
**moonwell-systems v0.5.1**. The installed CLI is a Go program. Gameplay starts
in YueScript, compiles to Lua 5.3, and can import handwritten Lua modules.
Pkl describes project configuration and object data. Teal and Fennel support
are planned; they are not available in this release.

## Start building

1. [Install Moonwell and play the template](/moonwell/docs/installation/).
2. [Bring in your World Editor map](/moonwell/docs/custom-maps/), or keep the template while learning.
3. [Create a custom unit and gameplay code](/moonwell/docs/map-making/).
4. [Import models, textures, icons, and sounds](/moonwell/docs/assets/).
5. [Configure map settings](/moonwell/docs/map-settings/).
6. [Add wrappers and systems](/moonwell/docs/library/) when you need them.

Run project commands from the folder containing `moonwell.pkl`. Shell examples
use PowerShell on Windows unless labeled otherwise. Building requires no game
installation; editing and playtesting require Warcraft III and a Lua-capable
World Editor.

## Keep nearby

| Guide | Covers |
| --- | --- |
| [Object data](/moonwell/docs/object-data/) | Pkl files, rawcodes, fields, levels, and generated gameplay IDs |
| [Architecture](/moonwell/docs/architecture/) | Source ownership, build stages, modules, hooks, and outputs |
| [Commands and configuration](/moonwell/docs/reference/) | CLI commands, manifest defaults, caches, editor files, and upgrades |
| [Troubleshooting](/moonwell/docs/troubleshooting/) | Tool setup, diagnostics, source maps, and launch failures |
| [Moonwell README](https://github.com/mdlsvensson/moonwell#readme) | Upstream project documentation |
| [Contributing](https://github.com/mdlsvensson/moonwell/blob/main/CONTRIBUTING.md) | Contributor checks and release playtesting |
| [Changelog](https://github.com/mdlsvensson/moonwell/blob/main/CHANGELOG.md) | Release changes and verification gates |

The libraries' in-game gates were run on Warcraft III: Reforged 3.0.0.24268.
Multiplayer desync checks are deferred until before Moonwell 1.0; the recorded
single-player gates do not establish multiplayer verification.
