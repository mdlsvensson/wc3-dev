---
title: Pkl object data
description: Define Warcraft III objects with Moonwell's Pkl schemas and generated gameplay IDs.
---

Author custom objects under `objects/`. Moonwell validates them against its
game metadata and the source map, then writes the built map's object tables.
The source map and its World Editor object definitions remain unchanged.

## Files and categories

Each object file amends `@moonwell/ObjectFile.pkl`. It can contain any of
`heroes`, `units`, `buildings`, `items`, `abilities`, `buffs`, and `upgrades`:

```pkl title="objects/units.pkl"
amends "@moonwell/ObjectFile.pkl"

units {
  ["vanguard"] {
    id = "h001"
    base = "hfoo"
    name = "Vanguard"
    hitPointsMaximumBase = 350
  }
}
```

The project merges files recursively:

```pkl title="moonwell.pkl · object definitions"
amends "@moonwell/Project.pkl"

import "@moonwell/Objects.pkl"
objects = Objects.merge(import*("objects/**.pkl"))
```

Organize by category, hero, or subsystem. Every `.pkl` under `objects/` is an
object file; put shared helper modules outside that folder and import them.
`Objects.merge` records each object's source file for diagnostics.

## Keys, rawcodes and bases

| Field | Rule |
| --- | --- |
| Category key, such as `vanguard` | Letters, digits and `_`, starting with a letter or `_`; no Lua/YueScript keyword. Unique within its category across all files |
| `id` | Four ASCII letters or digits; unique across all authored categories, absent from standard IDs and conflicting source-map custom objects |
| Hero `id` | Starts with an uppercase letter |
| Unit/building `id` | Must not start with an uppercase letter |
| `base` | A standard object of the correct category, such as `hfoo`; custom objects cannot be bases |

Modified standard objects and existing custom objects in the source map are
preserved. A Pkl ID colliding with an editor-created custom object fails;
choose another ID or remove that editor object. Heroes, units, and buildings
share the unit table, even though they have separate authoring categories.

Pkl amendment can share authoring values, but `base` still names a standard
Warcraft object. Moonwell does not implement copying a custom object as a base.

## Fields and values

Typed property names come from World Editor labels: **Hit Points Maximum
(Base)** becomes `hitPointsMaximumBase`. A Pkl-aware editor shows each field's
label and rawcode on hover. The package's generated `*Props.pkl` modules list
the supported fields.

- An omitted or `null` field inherits the base value.
- `false`, `0`, and `""` are explicit values. For a list-valued field,
  `List()` explicitly empties it.
- Text you set is stored literally. Moonwell does not generate `TRIGSTR_*`
  entries or change `war3map.wts`.
- A scalar on a per-level field sets level 1. A `List` supplies consecutive
  levels; remaining levels retain their base values.
- A level list cannot exceed the object's `levels`, or the base's level count
  when you inherit it. An empty level list sets no levels and is rejected.
- List-valued fields take a comma-separated string or `List<String>`, such as
  `normal = List("Adef", "Aslo")`. Per-level list-valued fields take nested
  lists, one inner list per level.

## Ability-specific properties

Abilities, buffs, and upgrades have typed properties for common fields.
Fields specific to an ability's base go in `properties`, keyed by friendly
name or rawcode:

```pkl title="objects/abilities.pkl"
amends "@moonwell/ObjectFile.pkl"

abilities {
  ["holy_light"] {
    id = "A000"
    base = "AHhb"
    levels = 4
    properties {
      ["amountHealedOrDamaged"] = List(111, 222, 333, 444)
    }
  }
}
```

`Hhb1` is the rawcode alternative for that property. Do not set it under both
names, or duplicate a typed field in `properties`. A field that does not apply
to the selected base fails validation.

## Generated gameplay IDs

`build`, `test`, and `dev` refresh `src/generated/objects.yue` before compiling
gameplay. Commit it with your object definitions:

```text title="src/main.yue · YueScript"
import "moonwell" as mw
import "generated.objects" as objects

mw.on_main ->
  CreateUnit Player(0), objects.units.vanguard, 0, 0, 270
```

`objects.units.vanguard` is an integer, already converted from the rawcode.
It is not a record with `.id`, and needs no `FourCC`. For a standard object
literal, use `$FourCC` from `moonwell.macros` instead.

## Validation and inspection

```powershell
moonwell objects:check
moonwell objects:eval
```

`objects:check` lists the internal tables a build would change and reports
whether the generated IDs are current. Stale or missing IDs fail it; use
`build`, `test`, or `dev` to refresh them. `objects:eval` prints validated,
resolved objects as JSON to stdout; it does not rewrite `objects.yue`.

Pkl reports schema errors with file and line. Moonwell reports metadata and
map conflicts with the file, object, and field, gathering problems rather
than stopping after the first invalid object. A misspelled base can include
suggestions for valid IDs.

Builds plan object changes before compiling and apply them to staged standard
and skin tables. Removing a Pkl object removes it from the next build because
each build starts from the source map.

## Limits

Moonwell does not import `.w3o` exports, place units, create per-unit skins,
or read packed maps as its source. Object field validation does not replace
in-game testing: many fields accept basic numbers or strings without encoding
every game-specific range or named value. The [first-map guide](/moonwell/docs/map-making/)
shows the complete authoring and playtest loop.
