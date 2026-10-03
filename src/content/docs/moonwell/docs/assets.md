---
title: Import assets
description: Import map and library assets, inspect model paths, and sync resources into World Editor.
---

Drop models, textures, icons, sounds, and other map resources under `assets/`.
Moonwell imports them during builds. To make them available in the source map
for World Editor, run an explicit synchronization.

## Folder paths become map paths

`assets/Models/Knight.mdx` imports as `Models\Knight.mdx`. Keep the folder
layout that the model and your object definitions expect. Names starting with
`.` are skipped.

```text
assets/
  Models/Knight.mdx
  Textures/Knight.blp
  ReplaceableTextures/CommandButtons/BTNKnight.blp
  ReplaceableTextures/CommandButtonsDisabled/DISBTNKnight.blp
```

The model's texture references must match the imported paths. Warcraft path
matching ignores case; avoid two files whose map paths differ only in case.
Files cannot replace the map's own internal files, such as `war3map.lua`,
`war3mapMap.blp`, or `war3mapPreview.tga`. Use the
[preview setting](/moonwell/docs/map-settings/#a-picture-in-the-map-list) for a map-list picture.

## Mappings and exclusions

Change the `assets` block in the project manifest:

```pkl title="moonwell.pkl · assets"
assets {
  paths {
    ["icons/BTNSword.blp"] = #"ReplaceableTextures\CommandButtons\BTNSword.blp"#
  }
  exclude = List("credits/", "source-art.psd")
}
```

Mapping keys and exclusions are relative to `assets/`. A folder exclusion
ends in `/`. Mapping values are exact in-map paths; Pkl raw strings preserve
the backslashes. These controls apply to your own assets, not a library's files.

## Icons

`init` creates the standard icon folders. Follow Warcraft's names:

| Folder under `assets/` | Filenames |
| --- | --- |
| `ReplaceableTextures/CommandButtons/` | `BTN<Name>.blp` |
| `ReplaceableTextures/CommandButtonsDisabled/` | `DISBTN<Name>.blp`, `DISPASBTN<Name>.blp` |
| `ReplaceableTextures/PassiveButtons/` | `PASBTN<Name>.blp` |

Pair each `BTN` icon with a `DISBTN` and each `PASBTN` with a `DISPASBTN`.
Missing disabled icons show a placeholder when the game greys out the button.
Reference the enabled icon's imported path in object data.

## Assets shipped by libraries

A library can describe its module and asset folders in a root
`moonwell-library.json`:

```json title="Library metadata"
{ "dir": "src", "assets": "assets" }
```

Every file in that asset folder imports at its relative path. A project asset
at the same map path wins over a library asset, with a replacement message;
this lets you replace a library's model or icon. Two libraries importing the
same path fail. Library authors should put files under a distinctive path,
such as `war3mapImported/<library>/`.

Library assets participate in checks, builds, synchronization, and model-path
inspection. See [Libraries](/moonwell/docs/library/) for configuration and locking.

## Check, build, and sync

```powershell
moonwell assets:check
moonwell build
```

`assets:check` shows the proposed source-map changes without applying them.
The build imports files into `dist/stage/<map.folder>/` and packages them;
it does not modify `maps/<map.folder>/` or asset ownership state.

To use the resources in World Editor, **close the map in World Editor first**:

```powershell
moonwell assets:sync
```

This writes imports and `war3map.imp` into the source map and records ownership
in `.asset-state/`. Reopen the map afterwards. Commit the synchronized source
files and ownership record together. `check`, `build`, `test`, and `setup`
also synchronize configured libraries into the project cache as needed.

## Ownership and deletion

Sync owns only the source-map files recorded in its state. It never overwrites
or deletes an unowned file, and it refuses to change an owned file whose
contents you edited directly in the source map. Fix the conflict at its source
instead of deleting the ownership record to bypass it.

Removing an asset or excluding it causes the next sync to remove its managed
copy and import entry. Unrelated editor imports remain. Sync applies changes
with rollback if writing fails; keeping the editor closed avoids competing
writes to map files.

## Inspect a model's references

```powershell
moonwell assets:paths assets/Models/Knight.mdx
moonwell assets:paths
```

The first command lists that model's referenced textures, particle models,
and attachments. With no argument it checks every model under the project's
assets and the libraries' asset folders. Paths are shown as in Import Manager:

| Classification | Meaning |
| --- | --- |
| `in-game path` | Warcraft ships the file |
| `in-game path, replaced` | Your imports replace a game file |
| `custom path, imported` | The needed custom file is present in the import plan |
| `custom path, not imported` | The model references a custom file the map will be missing |

You can also run the command on a model outside a Moonwell project to inspect
which paths it needs. Moonwell does not download missing textures or rewrite
the model's references. Import the right files at the right paths, then rebuild.
