# Assets

After this page you can import models, textures and icons into the map, give a file an exact path there, see what
you imported in World Editor, and check or convert a model to glTF. An asset is a file under `assets/` in the
project folder, or a file that a library ships for the map.

## Files under assets/

A build imports every file under `assets/` into the map, at the path the file has below that folder:

| File | Path in the map |
| --- | --- |
| `assets/Models/Knight.mdx` | `Models\Knight.mdx` |
| `assets/Textures/Knight.blp` | `Textures\Knight.blp` |
| `assets/Textures/KnightArmor.blp` | `Textures\KnightArmor.blp` |

Moonwell does not look at what a file is: a model, a texture or any other file goes into the map as it is, byte for
byte. This page writes a path in the map with backslashes, the way World Editor's Import Manager shows it, and so
do `assets:check` and `assets:paths`. Some of Moonwell's errors show the same path with forward slashes.

A file or a folder whose name starts with a dot is passed over, with everything in such a folder: a `.gitkeep`, a
`.DS_Store`, a `.git` folder.

An asset cannot take the name of one of the map's own files. Moonwell refuses a path in the map that starts with
`war3map` or `war3campaign`, as `war3map.lua` and `war3map.imp` do, one that starts with `(listfile)`,
`(attributes)` or `(signature)`, and one that starts with `scripts/war3map.`, in any letter case:

```text
error: Reserved map path: war3map.lua
hint: Assets cannot replace map internals such as war3map.lua or war3map.imp.
```

One folder is free: a path below `war3mapImported/` is an asset's to take. A path that starts with
`war3mapPreview.` or `war3mapMap.` is refused in the same way, and the hint of that error names the setting for a
picture of your own in the game's map list, `settings.info.preview`: see
[Map settings](./map-settings#a-picture-in-the-map-list).

The rule is about the path in the map, not about the file's name. A file under `assets/` with such a name is no
error when the settings of the next section give it another path or leave it out.

## Exact paths and exclusions

Two settings of `moonwell.toml` change what is imported and where:

```toml
[assets]
exclude = ["credits/"]

[[assets.paths]]
file = "icons/BTNSword.blp"
path = 'ReplaceableTextures\CommandButtons\BTNSword.blp'
```

`assets.exclude` lists what stays out of the map. An entry is the path of a file under `assets/`, or the path of a
folder with `/` at its end, which leaves out everything below that folder. Here `assets/credits/readme.txt` is not
imported. Without the entry it is in the map as `credits\readme.txt`.

Each entry of `[[assets.paths]]` gives one file a path of its own in the map. `file` is the file's path under
`assets/`, and `path` is the path it gets. Here `assets/icons/BTNSword.blp` is imported as
`ReplaceableTextures\CommandButtons\BTNSword.blp`, and not as `icons\BTNSword.blp`. A file without an entry keeps
its path under `assets/`.

Write a `path` that has backslashes between single quotes, as above: between double quotes, TOML reads a backslash
as the start of an escape. A `path` with forward slashes names the same path in the map. Both settings find a file
without regard to letter case.

An entry of `[[assets.paths]]` whose file is not there, or is left out by `assets.exclude` or by its dot, is an
error. So are two assets that would get the same path in the map. Here a second `BTNSword.blp` was put into
`assets/ReplaceableTextures/CommandButtons/`, the place the entry above gives to the first:

```text
error: moonwell.toml › Two assets would be imported as ReplaceableTextures/CommandButtons/BTNSword.blp (target collision).
hint: Fix assets in moonwell.toml.
```

[Settings](./reference/settings#assets) has the rules of the two settings.

## Icons

`moonwell init` makes World Editor's three icon folders under `assets/ReplaceableTextures/`
([Project layout](./project-layout#what-init-makes)). An icon that you put into one of them, named the game's way,
is imported at the path the Object Editor expects, and needs no entry in `[[assets.paths]]`:

| Folder | File name | For |
| --- | --- | --- |
| `assets/ReplaceableTextures/CommandButtons/` | `BTN<Name>.blp` | Abilities, units, items and upgrades |
| `assets/ReplaceableTextures/CommandButtonsDisabled/` | `DISBTN<Name>.blp`, `DISPASBTN<Name>.blp` | Greyed-out versions |
| `assets/ReplaceableTextures/PassiveButtons/` | `PASBTN<Name>.blp` | Passive abilities |

Give every `BTN<Name>` a matching `DISBTN<Name>`, and every `PASBTN<Name>` a matching `DISPASBTN<Name>`: the game
shows a placeholder where a disabled icon is missing.

An object names an asset by its path in the map. This is the object file of a new project, `objects/units.pkl`,
without its comments, and with the model and the icon of this page in the Captain's two fields, where the template
names files of the game ([Objects](./objects#object-files)):

```pkl
amends "@moonwell/ObjectFile.pkl"

units {
  ["captain"] {
    id = "h000"
    base = "hfoo"
    name = "Captain"
    modelFile = #"Models\Knight.mdx"#
    iconGameInterface = #"ReplaceableTextures\CommandButtons\BTNSword.blp"#
  }
}
```

## A library's files

A library can ship files for the map beside its modules. Moonwell keeps a copy of them in
`.moonwell/library-assets/<name>/` ([Files and caches](./reference/files#project-moonwell)) and imports them with
yours, each at the path it has in the library's folder of such files. `assets.exclude` and `[[assets.paths]]` are
about your own files, and change nothing of a library's. [Libraries](./libraries#add-a-library) describes how a
library is added, and [how a library names that folder](./libraries#write-a-library).

When a file of yours and a file of a library have the same path in the map, yours is imported and the library's is
not. That is how you put an icon or a model of your own in the place of a library's. `build`, `test`, `check`,
`dev`, `assets:check` and `assets:sync` say so, here for a library that the project names `golems`:

```text
assets/Textures/Golem.blp replaces library golems's Textures/Golem.blp
```

Two libraries with a file at the same path in the map are an error, unless a file of yours takes that path. Here
the project names a second library, `ogres`, and both libraries ship `Textures/Golem.blp`:

```text
error: moonwell.toml › Libraries golems and ogres both import Textures\Golem.blp.
hint: Drop one of the libraries, or put your own file at that path under assets/ to replace both.
```

## Seeing assets in World Editor

A build imports the assets into the staged map, `dist/stage/<map.folder>`, and into the archive. It writes nothing
into the source map, `maps/<map.folder>`, and that is the map World Editor opens. A build says how many files it
imported:

```text
Imported 5 asset(s).
```

`moonwell assets:sync` writes the assets into the source map, so that World Editor shows them. Look first at what
it would do, with `moonwell assets:check`, which writes nothing into the map:

```sh
moonwell assets:check
```

```text
Models/Knight.mdx -> Models\Knight.mdx
icons/BTNSword.blp -> ReplaceableTextures\CommandButtons\BTNSword.blp
ReplaceableTextures/CommandButtonsDisabled/DISBTNSword.blp -> ReplaceableTextures\CommandButtonsDisabled\DISBTNSword.blp
Textures/Knight.blp -> Textures\Knight.blp
Textures/KnightArmor.blp -> Textures\KnightArmor.blp
write maps/map.w3x/Models/Knight.mdx
write maps/map.w3x/ReplaceableTextures/CommandButtons/BTNSword.blp
write maps/map.w3x/ReplaceableTextures/CommandButtonsDisabled/DISBTNSword.blp
write maps/map.w3x/Textures/Knight.blp
write maps/map.w3x/Textures/KnightArmor.blp
write maps/map.w3x/war3map.imp
Checked 5 asset(s); assets:sync would make 6 file change(s). Nothing was written.
```

First come the assets: the file under `assets/`, an arrow, and its path in the map. A library's file has
`library <name>:` before it. Then come the files of the source map that `assets:sync` would write or delete, and a
count. `war3map.imp` is the map's index of imports, the list that World Editor's Import Manager edits.

::: warning
Close the map in World Editor before you run `assets:sync`, and open it again afterwards.
:::

```sh
moonwell assets:sync
```

It prints the same list, writes the files, and ends with:

```text
Synced 5 asset(s) into maps/map.w3x (6 file change(s)). Reopen the map in World Editor.
```

::: note
With World Editor 3.0.0.24268, the Import Manager listed a synced file beside a file that was imported in World
Editor itself, and after the map was saved there, `assets:check` reported no change.
:::

When a file that `assets:sync` is about to write or delete was changed after the command read the map, it stops,
takes back the writes it made, and its hint tells you to close World Editor and anything else that writes to the
map.

`assets:sync` records the files it wrote in `.asset-state/<map.folder>.json`, each with a hash of its content.
Those are the files of the map that it owns. Commit the state file with the map
([Files and caches](./reference/files#asset-state)).

Run `assets:sync` again after you change what is under `assets/`. It writes an asset that is new or changed, and
deletes a file it owns that is an asset no more. After `assets/Textures/KnightArmor.blp` was removed, these two
lines follow the list of the assets:

```text
delete maps/map.w3x/Textures/KnightArmor.blp
write maps/map.w3x/war3map.imp
```

What `assets:sync` never does:

- **It never writes over or deletes a file it does not own.** The entries that `war3map.imp` has for files of the
  map's own stay as they are. An asset at the path of a file that the map has already, such as one you imported
  in the Import Manager, is an error:

  ```text
  error: maps/map.w3x/Textures/Mine.blp › Asset Textures/Mine.blp conflicts with a file or import already in the map.
  hint: Import it under another path with assets.paths, or remove the map's own copy.
  ```

- **It never writes over a file it owns that was changed in the map.** When the file in the source map is not what
  `assets:sync` wrote, the command stops:

  ```text
  error: maps/map.w3x/Textures/Knight.blp › Textures/Knight.blp was modified in the map after assets:sync wrote it.
  hint: assets:sync owns this file in the source map (a build stages a copy of it). Move your edited copy into assets/, or restore the file in the source map, then run assets:sync.
  ```

The two errors stop a build as well, and `assets:check`: a build plans the same imports, for the copy of the source
map that it stages.

When a write fails, or when you stop `assets:sync` with Ctrl+C, it takes back the writes it made. Where it cannot
put a file back, the error names that file, and its hint is to restore the map folder from version control.

A build does not wait for a sync. It reads the state file too, and so knows which files of the source map are
synced assets. The staged map gets the assets as they are under `assets/`: an asset that you removed after the last
sync is not in the build, though the source map has it until the next `assets:sync`.

## Checking a model's files

A model names other files: its textures, the models and textures of its particle emitters, its attachments.
`moonwell assets:paths` lists them, and says of each whether the game has a file at that path and whether one of
the assets does. Without a file it reports on every `.mdx` and `.mdl` file among the assets, yours and the
libraries':

```sh
moonwell assets:paths
```

```text
assets/Models/Knight.mdx
  texture         Textures\Knight.blp                         in-game path, replaced
  texture         Textures\KnightArmor.blp                    custom path, imported
  texture         team colour (slot 1)
  particle model  Abilities\Spells\Human\Heal\HealTarget.mdx  in-game path
  attachment      Models\Sword.mdx                            custom path, not imported
1 model, 5 paths: 2 in-game, 1 custom imported, 1 custom not imported.
```

A line has the kind of the reference, the path the model names, and a label. The kinds are `texture`,
`particle model`, `particle texture`, `attachment`, `popcorn` and `face effect`. The labels:

| Label | What it means |
| --- | --- |
| `in-game path` | The game has a file at this path. There is nothing to import |
| `in-game path, replaced` | The game has a file at this path, and one of the assets has the same path in the map |
| `custom path, imported` | The game has no file at this path, and one of the assets has it |
| `custom path, not imported` | The game has no file at this path, and no asset has it: the model will be missing this file |

A texture that the model takes from a replaceable slot has no path and no label. Its line reads
`team colour (slot 1)`, `team glow (slot 2)` or `replaceable texture (slot <n>)`. A model that names no file has
the one line `(no referenced files)`. The last line counts the models, the lines of the references, and the lines
of each label, with the two in-game labels as one number.

Moonwell knows the game's paths from a list that is part of the program: the paths of the files of Warcraft III
Reforged 3.0.0.24268. It compares a path with that list without regard to letter case, and takes the texture
formats `.blp`, `.dds`, `.tga`, `.tif`, `.tiff`, `.png` and `.jpg` for one: above, `Textures\Knight.blp` is an
in-game path because the game has that texture as a `.dds` file. An asset counts for a reference only when its path
in the map is the path the model names, with the same ending, in any letter case. In both comparisons a reference
that ends in `.mdl` is looked up as `.mdx`. So an asset whose path in the map ends in `.mdl` counts for no
reference: a model that names `Models\Sword.mdl` is met by an asset at `Models\Sword.mdx`, and not by one at
`Models\Sword.mdl`.

With a file, `assets:paths` reports on that one model. The path starts at the folder the command runs in:

```sh
moonwell assets:paths assets/Models/Knight.mdx
```

In a project the report is the one above. Outside a project the command needs the file, and it cannot know what
you import. It has two labels there, `in-game path` and `custom path`, and the custom paths are the files the model
needs you to import:

```text
Models/Knight.mdx
  texture         Textures\Knight.blp                         in-game path
  texture         Textures\KnightArmor.blp                    custom path
  texture         team colour (slot 1)
  particle model  Abilities\Spells\Human\Heal\HealTarget.mdx  in-game path
  attachment      Models\Sword.mdx                            custom path
1 model, 5 paths: 2 in-game, 2 custom.
```

Without a file, a project that has no model among its assets gets the line `No models under assets/.` A model that
cannot be read is an error. Without a file, the report comes first: in the place of that model's lines it has one
line that starts with `(unreadable:` and gives the reason.

## Converting a model to glTF

`moonwell assets:gltf <model> [output]` converts a `.mdx` or `.mdl` model to glTF 2.0, for viewing or editing in
tools such as Blender. Without `[output]`, it writes a single `.glb` file beside the model:

```sh
moonwell assets:gltf assets/Models/Knight.mdx
```

```text
Wrote assets/Models/Knight.glb.
```

Give a second path ending in `.glb` or `.gltf` to write there instead. When the output path ends in `.gltf`,
Moonwell writes `<stem>.gltf`, `<stem>.bin` and each decoded texture as `<name>.png` in the output file's folder:

```sh
moonwell assets:gltf assets/Models/Knight.mdx out/Knight.gltf
```

```text
Wrote out/Knight.gltf.
```

Before it writes anything, Moonwell checks every file it is about to write. If the `.bin` or a `.png` would replace
the model or a texture the model was converted from, as `Knight.png` would beside a `Knight.png` texture, the
command stops with an error that names that file. Choose an output in another folder, or a `.glb`. Writing again
over the files of an earlier conversion is allowed.

Both Classic SD (version 800) and Reforged HD (versions 900 to 1800) models are converted:

- **Meshes and coordinates.** Geosets are converted from Warcraft III's right-handed Z-up coordinates to glTF's
  right-handed Y-up coordinates via `(x, y, z) -> (y, z, x)`. In a Reforged HD model with level-of-detail
  geosets, only the base level (`LOD` 0, or the lowest `LOD` present) is exported.
- **Skeletons, weights and animations.** Bones, helpers and other scene nodes keep their hierarchy and pivot
  offsets under one `Root` node, the skin's `skeleton`, with up to four joint weights per vertex (from Classic
  matrix groups or Reforged HD skin data). Each sequence becomes one animation, with translation, rotation and
  scaling tracks sampled from the keys inside that sequence alone, Hermite, Bezier and Squad curves included. The
  first and last of those keys hold to the animation's start and end, and a track with no key in the sequence
  holds its rest value: no offset, no rotation, a scale of 1. A track of a global sequence is sampled over the
  global sequence's length and repeated at that length for as long as the animation runs, which is as long as its
  own sequence.
- **Geoset visibility.** A geoset that a sequence shows and hides is written with the glTF extension
  `KHR_node_visibility` and animated, step by step, through `KHR_animation_pointer`. A geoset with no key in a
  sequence keeps its geoset animation's own alpha. A viewer without those extensions shows every geoset at once.
- **Textures and materials.** Every texture that a material of an exported geoset uses must be found, or be one of
  the game's own files, or the command stops with an error (textures only referenced by particle or ribbon emitters, environment slots or unexported
  materials, and the placeholder emissive texture `Textures/Black32.blp`, are skipped):
  - A replaceable slot with no path is synthesized in memory for Player 1 Red (`#FF0303`): `ReplaceableId 1` (team
    colour) as a solid 8×8 PNG and `ReplaceableId 2` (team glow) as a 64×64 radial PNG. Any other replaceable
    slot, such as a cliff's or a tree's, becomes a grey 8×8 PNG named `replaceable_<id>.png`, and the command
    prints a warning before the line `Wrote`:

    ```text
    warning: assets/Models/Tree.mdx: ReplaceableId 31 has no texture file to convert, so a grey placeholder stands in for it.
    ```

  - A texture with a path is searched first in the assets of the project and of its libraries (when the command
    runs in a project), then at that path below the model's folder, then by its file name in the model's folder,
    then below the folder the command runs in, and last below `assets/` there. At each place Moonwell matches
    without regard to letter case, tries the file's own ending first and then the same stem with `.blp`, `.dds`,
    `.tga` and `.png`, and decodes `BLP1` (JPEG and paletted), `DDS` (`DXT1`/BC1, `DXT3`/BC2, `DXT5`/BC3,
    `ATI2`/BC5 normal maps and uncompressed 24-bit and 32-bit), `TGA` (24-bit and 32-bit, plain and RLE) and `PNG`
    to PNG.
  - A texture with a path that is found nowhere, but is one of the game's files (the list that
    [Checking a model's files](#checking-a-models-files) compares with), becomes a grey 8×8 PNG under the texture's own name, as
    Moonwell cannot read the game's files. The command prints a warning for it before the line `Wrote`:

    ```text
    warning: assets/Models/Knight.mdx: Texture Textures\Footman.blp ships with the game, which Moonwell cannot read, so a grey placeholder stands in for it.
    ```

    Put the texture in `assets/` or beside the model to convert it with its real look.
  - Classic SD materials map their diffuse layer and filter mode (`None` to `OPAQUE`, `Transparent` to `MASK` with
    cutoff `0.75`, `Blend` to `BLEND`), composite a `ReplaceableId 1` team-colour layer under a `Blend` diffuse
    layer onto one PNG, and map additive or `ReplaceableId 2` team-glow layers to `emissiveTexture`. Reforged HD
    materials map diffuse, normal (with reconstructed `+Z` for two-channel BC5 normal maps), ORM (occlusion,
    roughness and metallic, after compositing the team-colour alpha mask into the diffuse texture) and emissive
    slots to glTF's metallic-roughness PBR textures. An emissive gain above 1 is written as the extension
    `KHR_materials_emissive_strength`.

The extensions are listed in the file's `extensionsUsed` and none is required, so a viewer that lacks one still
opens the model.

## What is refused

Moonwell refuses three things under `assets/`, and names the file or folder in the error. Every command that reads
the assets fails on them: `build`, `test`, `check`, `assets:check`, `assets:sync`, in a project `assets:paths` and
`assets:gltf`, and each check of `dev`.

- **A link.** A symbolic link or a Windows junction is refused at `assets` itself and anywhere below it, whatever
  it leads to ([Project layout](./project-layout#real-folders-no-links)):

  ```text
  error: assets/linked › Symlinks are not supported: assets/linked
  hint: Replace the link (or Windows junction) with the real files.
  ```

- **Two names that differ only in letter case.** `assets/Icons/` beside `assets/icons/`, or `a.blp` beside `A.blp`
  in one folder. The two would be one path in the map: the hint of the error says that Warcraft III ignores letter
  case in map paths. On a file system that holds two such names in one folder, as on Linux, the error says that
  the two paths `differ only in letter case`.
- **A name Windows cannot hold.** The name of a file or a folder cannot hold a backslash, a control character or
  any of `< > : " | ? *`. It cannot end with a dot or a space. And it cannot be one of the device names `CON`,
  `PRN`, `AUX`, `NUL`, `COM1` to `COM9` and `LPT1` to `LPT9`, in any letter case, alone or before a dot, as in
  `aux.blp`. On a system that holds such a name, as Linux does, the error says that it
  `cannot be used in a map that Windows tools read`. Each name in a `path` of `[[assets.paths]]` follows the same
  rules, and is neither empty nor `.` or `..`. There the error says `Invalid asset path:` and the path.

Among the files that a library ships, Moonwell refuses the same two kinds of names, and the error names the
library.

## See also

- [Commands](./reference/commands): [`assets:check`](./reference/commands#assets-check),
  [`assets:sync`](./reference/commands#assets-sync), [`assets:paths`](./reference/commands#assets-paths) and
  [`assets:gltf`](./reference/commands#assets-gltf), and what each reads, writes and fails on.
- [Settings](./reference/settings#assets): the rules of `assets.exclude` and `[[assets.paths]]`.
- [Files and caches](./reference/files#asset-state): the state file under `.asset-state/`, and
  `.moonwell/library-assets/`.
- [Troubleshooting](./reference/troubleshooting#the-map-and-world-editor): an asset that does not show in World
  Editor, and a file that `assets:sync` refuses.
- [Map settings](./map-settings): the next page. It describes the settings of the map itself that `moonwell.toml`
  holds.
