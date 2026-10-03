---
title: Use your own World Editor map
description: Bring a complete Lua folder-format map into a Moonwell project.
---

Moonwell reads a complete **map directory with a `.w3x` suffix**. A packed
`.w3x` archive cannot serve directly as the source directory. Terrain,
placements, editor triggers, imported files, and the editor's Lua script all
remain part of the source map.

## 1. Prepare the map

Back up your map. Open it in World Editor and select **Lua** under
**Scenario > Map Options**, then save successfully. Moonwell does not convert
handwritten JASS to Lua; resolve incompatible custom-script triggers before
continuing.

## 2. Save a complete directory

Use **File > Save As** and the editor's directory/folder map format to save
`MyMap.w3x` under your project's `maps/` folder. The format's label varies by
editor version. In File Explorer, confirm that `MyMap.w3x` is a folder rather
than one archive.

If your editor cannot save directories, export a normal Lua map archive and
extract its complete contents with an MPQ-capable tool. A `.w3x` is not a ZIP;
renaming it does not unpack it. Keep the editable original separately and
replace the complete export after each editor save, so deleted files do not
linger. Preserve internal paths and imported resources.

```text title="Complete source map"
maps/
  MyMap.w3x/
    war3map.lua
    war3map.w3i
    war3map.w3e
    ...other map and imported files...
```

Do not nest another folder between `MyMap.w3x` and its files. Copying only
`war3map.lua` loses the map's terrain and placements. If replacing the template,
move its folder aside first instead of merging two maps' contents.

## 3. Select the map

Change the existing `map` block in `moonwell.pkl`:

```pkl title="moonwell.pkl · map"
map {
  folder = "MyMap.w3x"
  entry = "src/main.yue"
}
```

`folder` is relative to `maps/`; do not include that prefix or use an absolute
path. Check whether `moonwell.local.pkl` overrides the shared value.

Review the template's `src/main.yue` and `objects/` too. They remain your project
sources when you replace the map. Remove unwanted demo gameplay, choose object
rawcodes that do not collide with objects already in your map, and replace
references to `gg_` or `udg_` globals that belonged to the previous source map.

## 4. Refresh, build and play

```powershell
moonwell build
moonwell check
moonwell test
```

`build` refreshes the generated object-ID module and editor declarations,
then packages the map. `check` validates the current project without creating
a map. `test` stages and launches it. The archive is now `dist/bin/MyMap.w3x`;
staging is `dist/stage/MyMap.w3x/`.

After saving the source map in World Editor, run `moonwell check` to refresh
editor globals, or save a watched source file while `moonwell dev` runs.
Restart `dev` after changing which map or local library it should watch.

## 5. Keep source and output separate

Commit your complete `maps/` source, `moonwell.pkl`, `PklProject` and its
resolved dependencies, gameplay and Pkl objects, and generated `objects.yue`.
Commit `.asset-state/` with source changes made by asset synchronization, and
`moonwell.lock` when using libraries. Keep `.moonwell/`, `dist/`, and local
machine configuration ignored.

Objects and settings from Pkl apply to the staged copy. Imported assets reach
World Editor only through explicit [asset synchronization](/moonwell/docs/assets/#check-build-and-sync).
Continue with [your first custom unit](/moonwell/docs/map-making/).
