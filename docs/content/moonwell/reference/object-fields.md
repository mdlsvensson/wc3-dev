# Object fields

This page describes the fields of a custom object: how a field gets its name, where to look a field up, which
fields have a typed name and which go into `properties`, how a field with levels is set, and which values a field
takes. It lists no fields. The game has more than a thousand of them, and the modules that hold them are linked
under [Finding a field](#finding-a-field). [Objects](../objects) is the guide to the object files themselves. An
object [declared in code](../objects#fields-of-a-declaration) names its fields as `properties` does, and what this
page says of `properties` holds for it too.

## How a field gets its name

A field of the game has a rawcode, such as `uhpm`, and a label that World Editor shows for it, such as
`Hit Points Maximum (Base)`. Moonwell makes the field's friendly name from the label:

1. `/` becomes the word `Or`, `&` becomes `And`, `+` becomes `Plus` and `%` becomes `Percent`. An apostrophe, a
   `!` and a `.` are dropped.
2. The label is cut into words at everything that is not a letter or a digit: spaces, hyphens and brackets.
3. The first word starts with a small letter. When it is in capitals throughout, it is written in small letters
   throughout. Every later word starts with a capital, and the rest of the word stays as the label has it.
4. The words are joined.

| Label | Name |
| --- | --- |
| `Hit Points Maximum (Base)` | `hitPointsMaximumBase` |
| `Icon - Game Interface` | `iconGameInterface` |
| `Amount Healed/Damaged` | `amountHealedOrDamaged` |
| `Movement Speed Increase (%)` | `movementSpeedIncreasePercent` |
| `AI Placement Radius` | `aiPlacementRadius` |
| `Occlusion Type (HD)` | `occlusionTypeHD` |

Five names are written by hand and do not follow the label. The `Class` of an upgrade is `upgradeClass`, because
`class` is a keyword of Pkl. The other four are fields of the abilities Wind Walk and Taunt, where the game gives
two fields of one ability the same label. Wind Walk has two fields labelled `Backstab Damage`, and the second,
`Owk4`, is `backstabDamageEnabled`. Taunt has two labelled `Prefer Hostiles`, and its fields `Tau1`, `Tau2` and
`Tau3` are `preferHostiles`, `preferFriendlies` and `maxUnits`.

Among the fields of abilities, one name can stand for more than one field: `chanceToMiss` is a field of Curse and
another field of Bash. No object can have both, so for an object of a given base a name is one field.

## Finding a field

**In your editor.** In an editor with Pkl support, hover over a field of an object file to see its documentation:
the label, the rawcode and the notes that are described below. [Editor setup](../editor-setup#pkl-in-an-editor)
covers editors for Pkl.

**In the package.** The typed fields of each kind are one module of the `moonwell` Pkl package, in the folder
[`schema/generated`](https://github.com/mdlsvensson/moonwell/tree/moonwell@0.12.10/schema/generated) of Moonwell's
repository:

| Kind | Module |
| --- | --- |
| Heroes | [`HeroProps.pkl`](https://github.com/mdlsvensson/moonwell/blob/moonwell@0.12.10/schema/generated/HeroProps.pkl) |
| Units | [`UnitProps.pkl`](https://github.com/mdlsvensson/moonwell/blob/moonwell@0.12.10/schema/generated/UnitProps.pkl) |
| Buildings | [`BuildingProps.pkl`](https://github.com/mdlsvensson/moonwell/blob/moonwell@0.12.10/schema/generated/BuildingProps.pkl) |
| Items | [`ItemProps.pkl`](https://github.com/mdlsvensson/moonwell/blob/moonwell@0.12.10/schema/generated/ItemProps.pkl) |
| Abilities | [`AbilityProps.pkl`](https://github.com/mdlsvensson/moonwell/blob/moonwell@0.12.10/schema/generated/AbilityProps.pkl) |
| Buffs | [`BuffProps.pkl`](https://github.com/mdlsvensson/moonwell/blob/moonwell@0.12.10/schema/generated/BuffProps.pkl) |
| Upgrades | [`UpgradeProps.pkl`](https://github.com/mdlsvensson/moonwell/blob/moonwell@0.12.10/schema/generated/UpgradeProps.pkl) |

A module holds its fields in the order of their names. These are two entries, one of `UnitProps.pkl` and one of
`AbilityProps.pkl`:

```pkl
/// Hit Points Maximum (Base)
///
/// Field `uhpm` (stats, `int`).
hitPointsMaximumBase: Int?

/// Cooldown
///
/// Field `acdn` (stats, `unreal`). Per level: a `List` sets levels 1, 2, ...
cooldown: (Number|List<Number>)?
```

The first line of an entry is World Editor's label, so a search for the label finds the field. The line `Field`
has the rawcode and, between the brackets, the category and the type that the game's data gives the field. Up to
three notes follow it:

- ``Per level: a `List` sets levels 1, 2, ...`` marks a field with levels: see
  [Per-level fields](#per-level-fields).
- ``A comma-separated list: a `List<String>` is joined with commas.`` marks a list field: see
  [Value types](#value-types).
- `Skin field.` marks a skin field. A build writes it into the `war3mapSkin` file of the kind, or, where the map's
  own file of the kind is in version 1 or 2 of its format, into that file: see
  [Objects](../objects#object-files).

The last line is the name and the type that Pkl checks. The `?` at its end says that the field may be left out.

**In the output of `objects:eval`.** [`moonwell objects:eval`](./commands#objects-eval) prints the objects of the
project as JSON, after it has checked them. For every field that an object sets it prints an entry, and for a
field with levels one entry for each level that is set. This one is the name of the template's Captain:

```text
        {
          "rawcode": "unam",
          "name": "name",
          "level": 0,
          "column": 0,
          "skin": true,
          "type": "string",
          "value": "Captain"
        }
```

`rawcode` and `name` are the two ways to name the field. `level` and `column` are the two numbers that the map's
file stores with a field of an ability or an upgrade: the level, which is 0 for a field without levels, and the
data column that the game's data gives the field. For an object of another kind both are 0. `skin` says whether
the field is a skin field, whichever file a build writes it into. `type` is how the value is stored: `int`,
`real`, `unreal` or `string`.

A name that is not right gets an answer too. For a typed name that the kind does not have, Pkl offers names that
come near it. For a key of `properties` that fits no field, Moonwell offers up to three names, when any comes
near.

## Typed fields and properties

A typed field is a property of the object, with a type that Pkl checks: `hitPointsMaximumBase = 600`. `properties`
is a mapping that every object has, from the name or the rawcode of a field to its value, and Moonwell checks it.

| Kind | Typed fields |
| --- | --- |
| Heroes, units, buildings | Every field of the kind. The three have most of their fields in common. A field that a kind lacks is no property of it: a hero's `startingStrength` in a unit is an error from Pkl |
| Items, buffs, upgrades | Every field |
| Abilities | The fields that are not tied to particular base abilities. Every other field of an ability goes into `properties` |

So only an ability needs `properties`. This one sets a typed field and, by its rawcode, a field of Holy Light:

```pkl
amends "@moonwell/ObjectFile.pkl"

abilities {
  ["holy_light"] {
    id = "A000"
    base = "AHhb"
    cooldown = 6
    properties {
      ["Hhb1"] = List(250, 500)
    }
  }
}
```

**A key of `properties`** is read in three steps: as a rawcode of a field of the kind, then as a friendly name
among the fields that apply to the base of the object, and last as a name that exactly one field of the kind has.
A field that the first or the last step finds may not apply to the base, and the error is then the one for such a
field, below: `["startingStrength"]` on a copy of the Footman finds the hero's field. A key that fits none of the
three is an error of its own. A name that several fields of the kind have, none of which applies to the base, is
such a key. This is that error for the key `hitPointsMaximum`, on a unit `scout` that copies the Footman, in a
file `objects/a.pkl`:

```text
error: objects/a.pkl › units["scout"].properties["hitPointsMaximum"]: no field that applies to 'hfoo' (Footman) has this rawcode or name.
hint: Did you mean 'hitPointsMaximumBase'?
```

`properties` takes every field of the kind, the typed ones too, by name or by rawcode.

**A value of `properties`** is `true` or `false`, a number, text, a `List` of those, or a `List` of lists of text.
Pkl checks no more than that. Moonwell then checks the value against the field as it does for a typed field. A
key whose value is `null` counts as not written.

**A field set twice** is an error, whichever two ways set it: its typed name and a key of `properties`, or two
keys of `properties`, one the name and one the rawcode. The error is at the second of the two and names the first:

```text
error: objects/paladin.pkl › abilities["blessing"].properties["acdn"]: 'acdn' (Cooldown) is already set by cooldown.
hint: Set each field once.
```

**A field that does not apply to the base** is an error. There are three reasons, and the hint says which:

| The reason | The hint |
| --- | --- |
| The field belongs to another kind among heroes, units, buildings and items | `It is a field of heroes only.` |
| The field belongs to other base abilities | `It applies only to copies of 'AHhb' (Holy Light).` |
| The game's data takes the base out of a field that the other abilities have | `The game's metadata excludes 'AHsw' (Sweeping Strike) from it.` |

The first two come up through `properties` alone. The third comes up for a typed field too: `durationHero` is a
typed field of abilities, and a copy of `AHsw` cannot set it.

## Per-level fields

Abilities and upgrades have levels, and no other kind has. A field with levels holds one value for each level. In
the modules it carries the note `Per level`, and its type takes a `List`.

- **One value** sets level 1.
- **A `List`** sets the levels 1, 2 and so on, one entry for each. A level that the list does not reach keeps the
  value of the base.
- **A `List` of lists** sets the levels of a list field that has levels: each inner list is the value of one
  level. On such a field, one `List<String>` or one text with commas is the value of level 1.

This file, `objects/levels.pkl`, sets fields with levels on an ability and on an upgrade:

```pkl
amends "@moonwell/ObjectFile.pkl"

abilities {
  ["holy_light"] {
    id = "A000"
    base = "AHhb"
    levels = 4
    manaCost = 50
    cooldown = List(8, 7, 6, 5)
  }
}

upgrades {
  ["forged_blades"] {
    id = "R000"
    base = "Rhme"
    name = List("Forged Blades", "Tempered Blades", "Runed Blades")
    requirements = List(List(), List("hkee"), List("hcas"))
  }
}
```

The ability has a mana cost of 50 at level 1 and its own cooldown at each of its four levels. The upgrade has a
name for each of its three levels. Its `requirements` are a list field with levels: none at level 1, the Keep at
level 2 and the Castle at level 3.

**The level count** is the limit of a `List`. It is the object's own `levels`, when the object sets that field,
and else the level count of its base. `levels` is itself a field without levels, and it must be 1 or more. A
`List` with more entries than the count is an error. Without the line `levels = 4`, the example above gives this:

```text
error: objects/levels.pkl › abilities["holy_light"].cooldown: 4 levels given, but 'AHhb' (Holy Light) has 3.
hint: Set levels = 4 to add levels, or remove values.
```

Three more things are errors:

- A `List` with no entry, on a field with levels that is not a list field. Write `null` to keep every level of the
  base.
- A `List` on a field that has no levels and is not a list field.
- A `List` of lists on a list field that has no levels.

Pkl refuses the last two for a typed field, and Moonwell refuses them in `properties`.

## Value types

| Type in the module | You write | Stored as |
| --- | --- | --- |
| `Int` | A whole number from -2147483648 to 2147483647 | An integer |
| `Boolean` | `true` or `false` | The integer 1 or 0 |
| `Number` | A number, whole or with a fraction | A real number of 32 bits |
| `String` | Text | Text |
| `String\|List<String>` | A list field: a `List<String>`, or one text with commas in it | One text, the entries joined with commas |

A field with levels has the same types with a `List` of them beside: `(Number|List<Number>)?` for a number,
`(String|List<String>|List<List<String>>)?` for a list field.

Text may not hold a NUL character, and it is stored as UTF-8. A field that takes one of a set of names in World
Editor, such as an attack type or an armor type, is a `String` here, and Moonwell does not check the value against
those names. It checks no number against a range of the game either, only against what the stored type can hold.

In `properties`, where Pkl has no type for the key, a field that is stored as an integer takes a whole number, and
also `true` and `false`, which are stored as 1 and 0.

What you write for "nothing" decides whether the field is set at all:

| You write | What it means |
| --- | --- |
| The field left out, or `null` | The field is not set. The object has the value of its base |
| `false` | The field is set to false |
| `0` | The field is set to the number 0 |
| `""` | The field is set to the empty text |
| `List()` on a list field | The field is set to the empty list |
| `List()` on another field with levels | An error: an empty `List` sets no levels |

```pkl
amends "@moonwell/ObjectFile.pkl"

units {
  ["scout"] {
    id = "h000"
    base = "hfoo"
    name = "Scout"
    goldCost = 0
    scalingValue = 0.8
    canFlee = false
    normal = List()
    tooltipExtended = ""
    hitPointsMaximumBase = null
  }
}
```

This unit copies the Footman. Its gold cost is 0, its scaling value is 0.8 and `canFlee` is false. Its list of
normal abilities is empty, and its extended tooltip is the empty text. Its hit points are the Footman's, because
`null` sets nothing.
