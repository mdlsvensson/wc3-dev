---
title: Import assets
description: Import models, textures, icons, and sounds from folders with optional Pkl path mappings.
---

Keep resources under `assets/` in your **framework repository**. Builds and
playtests import them automatically. You do not need to add each file through the
World Editor Import Manager.

## Folder paths become map paths

```text
assets/
  Models/
    Knight.mdx
  Textures/
    Knight.blp
  ReplaceableTextures/
    CommandButtons/
      BTNMySword.blp
    CommandButtonsDisabled/
      DISBTNMySword.blp
```

The `assets/` prefix is removed. For example, the icon is imported at
`ReplaceableTextures\CommandButtons\BTNMySword.blp`. The disabled icon is imported
at `ReplaceableTextures\CommandButtonsDisabled\DISBTNMySword.blp`.
The framework registers these as custom paths in `war3map.imp`; it does not add a
`war3mapImported\` prefix. Forward and backward slashes in configuration are accepted;
map import paths use backslashes.

Keep texture paths exactly as the model expects. Copying a texture to a different
path does not rewrite references inside an MDX or MDL file. Assign the imported
model or icon path to the appropriate object field in Pkl or World Editor.
Importing a sound file does not create a Sound Editor variable.

## Optional Pkl mappings

With `assets.pkl`, source files can be organized differently from their map paths:

```text
assets/icons/my-sword/BTNMySword.blp
assets/icons/my-sword/DISBTNMySword.blp
```

```pkl
amends "assets-schema.pkl"

paths {
  ["icons/my-sword/BTNMySword.blp"] =
    "ReplaceableTextures\\CommandButtons\\BTNMySword.blp"
  ["icons/my-sword/DISBTNMySword.blp"] =
    "ReplaceableTextures\\CommandButtonsDisabled\\DISBTNMySword.blp"
}

exclude {
  "credits/"
  "source-art/"
  "README.txt"
}
```

Mapping keys are relative to `assets/`; values are complete in-map paths.
Unmapped files retain their relative paths. An excluded path ending in `/` excludes
that directory and its contents; other exclusions match exact files. These are
paths, not globs. Dotfiles and files in dot-directories are omitted automatically.
Other files, including license texts, are included unless explicitly excluded.
Respect resource authors' attribution requirements when distributing maps.

`assets-schema.pkl` validates the configuration's types. Deno validates actual files,
path safety, and case-insensitive collisions. A mapping for a missing or excluded
file is an error. If `assets.pkl` is absent, folder imports still work without Pkl
evaluation for assets (the overall build still evaluates Pkl object definitions).

## Check, build, and sync

| Command | Effect |
| --- | --- |
| `deno task assets:check` | Print source-to-map paths and validate changes without writing map files or sync state |
| `deno task build` | Include resources and the merged import index in the staged map and packed archive |
| `deno task test` | Include resources in the staged map before launching Warcraft III |
| `deno task assets:sync` | Update imported files and the import index in `maps/<mapFolder>/` |

Build and test never sync assets into the source map. To see resources while editing:

1. Save and **close the map in World Editor**.
2. Add or edit files in `assets/`, and update mappings if necessary.
3. Run `deno task assets:check`, then `deno task assets:sync`.
4. Reopen the source map in World Editor and assign or preview the imported resources.

Run sync, build, and editor saves serially. The tool does not detect an open editor
or provide live reload. `deno task dev` continues to watch object definitions and
editor Lua; it does not synchronize resources automatically.

## Ownership and deletion

Sync writes `.asset-state/<mapFolder>.json` outside the map. This generated file
records managed paths and SHA-256 hashes. **Commit it with the updated source map**
so collaborators have the same ownership information. Do not edit it by hand.

Existing editor imports retain their paths and flags. An asset that collides with
an unmanaged map file or import entry is rejected, even if its bytes are identical.
To migrate an existing editor import, first back up the source map, place the
resource in `assets/`, and remove the old editor-owned import and its map file
before syncing. There is no implicit adoption or overwrite option.

Deleting or remapping a managed asset removes its old copied file and import entry
on the next sync. Builds also remove stale synced imports from their fresh staged
copy. Unmanaged files are never deleted. Empty directories may remain.

If a managed file was edited directly in the map, both check and sync report a
conflict. Preserve those edits in `assets/`, then restore the managed map copy to
its previously synced contents (for example, from version control) before retrying.
Deleting state does not resolve ownership conflicts safely.

All paths and managed-file hashes are checked before any writes. Ordinary write
failures trigger file-content rollback, including the import index and state.
This is not a crash-proof transaction: keep source maps in version control and do
not run concurrent processes that modify the same map.

## Limits

- Only unpacked Lua source maps are supported by this workflow.
- Symlinks, traversal paths, Windows device names, case collisions, and reserved
  internal map paths such as `war3map.lua` are rejected.
- The importer copies bytes; it does not convert images/audio, rewrite models,
  resolve texture dependencies, or validate that Warcraft supports a file format.
- Removing a file does not remove object-field references to its old path.
- Binary and CLI tests verify import metadata and archive contents. Verify your
  actual resources in your World Editor/game version before distributing a map.
