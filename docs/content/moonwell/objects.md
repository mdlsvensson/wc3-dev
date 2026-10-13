# Objects

After this page you can add a unit, a hero, an item or an ability to the map from a file, set its fields, and use
it in your code under a name of your own. These are the map's custom objects. They are written in
[Pkl](https://pkl-lang.org), in the files under `objects/`.

## Object files

A custom object is of one of seven kinds: a hero, a unit, a building, an item, an ability, a buff or an upgrade.
Every `.pkl` file under `objects/` is an object file, in that folder or in any folder below it, and Moonwell reads
them all as one set. How you split the objects over files is yours to choose: a file for each kind, or a hero in
one file with its abilities.

This is the object file of a new project, `objects/units.pkl`, with the template's Captain:

```pkl
// Custom units. Every file under objects/ amends ObjectFile.pkl; gameplay code uses them from src/generated/objects.yue.
amends "@moonwell/ObjectFile.pkl"

units {
  ["captain"] {
    id = "h000"    // the new object's rawcode
    base = "hfoo"  // copies the Footman
    name = "Captain"
    modelFile = #"units\human\TheCaptain\TheCaptain"#
    iconGameInterface = #"ReplaceableTextures\CommandButtons\BTNTheCaptain.blp"#
  }
}
```

An object file starts with the line `amends "@moonwell/ObjectFile.pkl"`. Below it, the file fills any of the seven
mappings `heroes`, `units`, `buildings`, `items`, `abilities`, `buffs` and `upgrades`. An entry of a mapping is one
object: its key between the square brackets, then its `id`, its `base` and the fields it sets. The Captain copies
the Footman and sets three fields: its name, its model and its icon. The two paths stand between `#"` and `"#`,
where Pkl takes a backslash as it is written.

A build adds your objects to the object data of the map it builds. Each kind goes into one file of the map, and
the build makes that file where the source map has none:

| Kind | File |
| --- | --- |
| Heroes, units and buildings | `war3map.w3u` |
| Items | `war3map.w3t` |
| Abilities | `war3map.w3a` |
| Buffs | `war3map.w3h` |
| Upgrades | `war3map.w3q` |

Each of these files has a second one beside it, `war3mapSkin.w3u` and so on, which holds some of an object's
fields, such as its name, its model and its icon. Moonwell puts each field into the file it belongs in, so the
Captain is in two files. Where the map's own file of a kind is in version 1 or 2 of its format, there is no second
file for that kind, and every field goes into the one. A build writes these files in the staged map and in the
archive. It does not change the source map.

Every `.pkl` file under `objects/` is read as an object file, so a module that only holds values or functions for
the others does not belong there: the evaluation fails on it. Put such a module in a folder outside `objects/`.
This one is `shared/text.pkl`:

```pkl
function trainTip(name: String): String = "Train \(name)"
```

An object file imports it by its path:

```pkl
amends "@moonwell/ObjectFile.pkl"

import "../shared/text.pkl"

units {
  ["veteran"] {
    id = "h001"
    base = "hkni"
    name = "Veteran"
    tooltipBasic = text.trainTip("Veteran")
  }
}
```

`moonwell dev` watches the `.pkl` files under `objects/`, and not a module outside that folder: a change to
`shared/text.pkl` alone starts no check.

A project with no `.pkl` file under `objects/` has no objects, and Moonwell runs no Pkl for it.

## `PklProject`

A project with object files has two more files in the project folder. `PklProject` names the `moonwell` Pkl
package that the object files are written for, and its version. This is the file as `moonwell init` writes it:

```pkl
amends "pkl:Project"

dependencies {
  ["moonwell"] { uri = "package://pkg.pkl-lang.org/github.com/mdlsvensson/moonwell/moonwell@0.12.4" }
}
```

The name `moonwell` in it is the `@moonwell` in the first line of an object file.

`PklProject.deps.json` is beside it. The command `pkl project resolve`, run in the project folder, writes that
file, and `init` runs the command for a new project. Moonwell reads the package's version from
`PklProject.deps.json` before it runs Pkl.

The package and the program must agree in the major and the minor version, the first two of the three numbers.
Where they differ, a command that reads the object files stops with an error that names both versions and says
what to change. [Installation](./installation#a-project-with-object-files) shows how to move a project to the
Moonwell you have installed.

A project that has object files and lacks one of the two files is not read either. The error says which one is
missing, and tells you to run `pkl project resolve`. Commit both files:
[Project layout](./project-layout#what-to-commit) says why.

## Keys, ids and bases

Three things of an object are not fields: its key, its `id` and its `base`.

**The key** is the object's name in your code: the Captain is `objects.units.captain` there, as
[The generated ids](#the-generated-ids) shows. A key is made of letters, digits and `_`, does not start with a
digit, and is not a keyword of Lua or of YueScript, such as `end` or `class`. A key is used once in a kind, over
all the files: two files that each have a unit with the key `captain` are an error that names both files. A unit
and a hero may have the same key.

**`id`** is the rawcode of the new object: four ASCII letters or digits. The id of a hero starts with an
upper-case letter, and the id of a unit or a building does not, because the game treats exactly the unit ids that
start with one as heroes. An item, an ability, a buff and an upgrade take any four. An id is used once in the
whole project, whatever the kind of the object. It is not the id of a standard object of the game, and not the id
of a custom object that the source map has already.

**`base`** is the standard object that the new one copies, by its rawcode: `hfoo` is the Footman. What the object
does not set, it has from its base. The base is a standard object of the same kind: a hero copies a hero, and a
copy of a building is written under `buildings`, not under `units`. An object cannot copy a custom object, neither
one of your object files nor one that was made in World Editor.

This file, `objects/paladin.pkl`, makes a hero, an ability and an item:

```pkl
amends "@moonwell/ObjectFile.pkl"

heroes {
  ["lightbringer"] {
    id = "H000"
    base = "Hpal"
    name = "Lightbringer"
  }
}

abilities {
  ["blessing"] {
    id = "A000"
    base = "AHhb"
    name = "Blessing"
  }
}

items {
  ["old_boots"] {
    id = "I000"
    base = "bspd"
    name = "Old Boots"
  }
}
```

The hero copies the Paladin, the ability copies Holy Light, and the item copies the Boots of Speed. The ids follow
the examples in Moonwell's own messages: `h000` for a unit or a building, `H000` for a hero, `I000` for an item,
`A000` for an ability, `B000` for a buff and `R000` for an upgrade.

## Fields

Every line of an object besides `id` and `base` sets one of its fields. A field has a friendly name, made from the
label that World Editor shows for it: `Hit Points Maximum (Base)` is `hitPointsMaximumBase`, and `Defense Base` is
`defenseBase`.

```pkl
amends "@moonwell/ObjectFile.pkl"

units {
  ["captain"] {
    id = "h000"
    base = "hfoo"
    name = "Captain"
    hitPointsMaximumBase = 600
    defenseBase = 4
  }
}
```

A field that you leave out keeps the value of the base. A name that no field of the kind has is an error from Pkl,
which offers the names that come near it. [Object fields](./reference/object-fields) says how a name is made from
a label, and where to look a field up.

## Values and levels

A field takes a whole number, a number, text, `true` or `false`, or a list, as its type says.

- **A value** sets the field: `hitPointsMaximumBase = 600`.
- **Levels.** Abilities and upgrades have levels, and some of their fields hold a value for each level. On such a
  field, one value sets level 1, and a `List` sets the levels 1, 2 and so on, in its order. A level that the list
  does not reach keeps the value of the base.
- **The level count.** A `List` may not have more entries than the object has levels. That count is the object's
  own `levels`, when it sets that field, and else the count of its base.
- **List fields**, such as the `normal` abilities of a unit, hold several values. Write a `List<String>`, as in
  `normal = List("Adef", "Aslo")`, or the same as one text with commas in it, `"Adef,Aslo"`. On a list field that
  has levels, a `List` of such lists sets the levels.
- **`null`**, like leaving the field out, keeps the value of the base. `false`, `0`, `""` and, on a list field,
  `List()` are values like any other: they set the field.
- **Text** is stored as you write it. Moonwell makes no `TRIGSTR_` reference of it, and does not change
  `war3map.wts`.

```pkl
amends "@moonwell/ObjectFile.pkl"

units {
  ["captain"] {
    id = "h000"
    base = "hfoo"
    name = "Captain"
    normal = List("Adef", "Aslo")
  }
}

abilities {
  ["blessing"] {
    id = "A000"
    base = "AHhb"
    name = "Blessing"
    manaCost = 50
    cooldown = List(8, 7, 6)
  }
}
```

`normal` sets the Captain's abilities to two, Defend and Slow. `manaCost = 50` sets the mana cost of level 1, and
levels 2 and 3 keep the cost that Holy Light has there. `cooldown` sets all three levels. Holy Light has three
levels, so a fourth entry in `cooldown` is an error until the object sets `levels = 4`.

## Fields of some abilities: `properties`

For six of the seven kinds, every field has a typed name like the ones above. Abilities are the seventh: most of
their fields belong to one base ability or to a few, such as the amount that Holy Light heals, and those have no
typed name. They go into the object's `properties` mapping, by friendly name or by rawcode:

```pkl
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

`amountHealedOrDamaged` is the friendly name of the field that World Editor labels `Amount Healed/Damaged`. The
field's rawcode does the same: with `["Hhb1"]` as the key, the object sets the same field.

Pkl cannot tell which keys `properties` may hold. Moonwell checks them after Pkl has run, against the game's data:

- A key that is neither a rawcode nor the name of a field that applies to the base is an error. Where a name comes
  near the key, the error offers it.
- A field that does not apply to the base is an error: `Hhb1` is a field of Holy Light, and a copy of Blizzard
  cannot set it.
- A field that is set twice is an error: once by its typed name and once in `properties`, or in `properties` once
  by name and once by rawcode.
- A value must fit its field, and a `List` the object's level count, as in the section above.

`properties` is there on an object of every kind, and it takes the fields that have a typed name too.
[Object fields](./reference/object-fields#typed-fields-and-properties) has the rules in full.

## The generated ids

Your code needs the id of an object as the integer that the game's functions take. A build writes those integers
as a module, `src/generated/objects.yue`: the ids module. For a project with two of the files above, the
template's `units.pkl` and `paladin.pkl`, it is this:

```yue
-- GENERATED by Moonwell from objects/**.pkl; do not edit.
export heroes = {
  lightbringer: 1211117616 -- H000
}
export units = {
  captain: 1747988528 -- h000
}
export buildings = {}
export items = {
  old_boots: 1227894832 -- I000
}
export abilities = {
  blessing: 1093677104 -- A000
}
export buffs = {}
export upgrades = {}
```

The module has one table for each kind, with your keys in it, sorted. A key holds the id as a number, and the
comment after it shows the rawcode. Import the module as `generated.objects`:

```yue
import "moonwell" as mw
import "generated.objects" as objects

mw.on_main ->
  CreateUnit Player(0), objects.units.captain, 0, 0, 270
```

`build`, `test` and `dev` write the module again whenever it does not match the objects, so you never edit it.
`check` and `objects:check` do not write the module. They compare it with the objects, and fail when it does not
match, or when it is missing in a project with objects. This is the error for a module that does not match:

```text
error: src/generated/objects.yue › The file does not match the project's objects.
hint: Run moonwell build, test or dev to regenerate it.
```

For a module that is missing, the error says `The file is missing, but the project has objects.`, with the same
hint.

Commit the module with the object files. [Project layout](./project-layout#what-to-commit) lists it among the
files to commit, and [Files and caches](./reference/files#src-generated) says which command does what with it.

## Errors

The object files are checked twice, first by Pkl and then by Moonwell. Every command that reads them does both:
`build`, `test`, `check`, `dev`, `setup`, `objects:check` and `objects:eval`.

**Pkl first.** Pkl evaluates the files against the types of the package. It finds a key or an id of the wrong
form, an object without `id` or `base`, a field name that the kind does not have, a value of the wrong type, and a
key that two files use in one kind. Pkl stops at the first mistake it meets, and Moonwell prints Pkl's own report
below the line `Evaluating the object files failed:`. With `hitPointsMaximumBase = "600"` in `objects/units.pkl`,
text where a whole number belongs, the report begins like this:

```text
error: objects › Evaluating the object files failed:
–– Pkl Error ––
Expected value of type `Int`, but got type `String`.
Value: "600"

556 | hitPointsMaximumBase: Int?
                            ^^^
at moonwell.generated.UnitProps#hitPointsMaximumBase (projectpackage://pkg.pkl-lang.org/github.com/mdlsvensson/moonwell/moonwell@0.12.4#/generated/UnitProps.pkl)

8 | hitPointsMaximumBase = "600"
                           ^^^^^
at units#units["captain"].hitPointsMaximumBase (file:///C:/Users/you/my-map/objects/units.pkl, line 8)
```

It says which type was expected, shows the line of the package that declares the field, and then your file with
the line of the mistake. More lines follow, from Pkl's own library.

**Then Moonwell.** When Pkl finds nothing, Moonwell checks every object against the game's data and against the
source map: that the base is a standard object of the kind, that the id is free, that each field applies to the
base and is set once, and that each value fits its field and its levels. It does not stop at the first problem.
One run reports the problems of all the objects, each with the file, the object, what is wrong in it and a hint:
the first 20 in full, and after them a line that counts the rest, such as `and 3 more`. This
`objects/paladin.pkl` has four mistakes:

```pkl
amends "@moonwell/ObjectFile.pkl"

heroes {
  ["lightbringer"] {
    id = "H000"
    base = "Hpla"
    name = "Lightbringer"
  }
}

abilities {
  ["blessing"] {
    id = "A000"
    base = "AHhb"
    cooldown = 6
    properties {
      ["acdn"] = 5
    }
  }
  ["storm"] {
    id = "A000"
    base = "AHbz"
    properties {
      ["Hhb1"] = 200
    }
  }
}
```

`moonwell objects:check` reports all four:

```text
error: objects/paladin.pkl › heroes["lightbringer"].base: 'Hpla' is not a standard hero.
hint: Did you mean 'Hpal' (Paladin), 'Hpb1' (Paladin) or 'Hpb2' (Paladin)?
error: objects/paladin.pkl › abilities["blessing"].properties["acdn"]: 'acdn' (Cooldown) is already set by cooldown.
hint: Set each field once.
error: objects/paladin.pkl › abilities["storm"].id: 'A000' is also the id of abilities["blessing"] (objects/paladin.pkl).
hint: Give each object its own id.
error: objects/paladin.pkl › abilities["storm"].properties["Hhb1"]: 'Hhb1' (Amount Healed/Damaged) does not apply to 'AHbz' (Blizzard).
hint: It applies only to copies of 'AHhb' (Holy Light).
```

The base of the hero is misspelt. `blessing` sets its cooldown twice, by the typed name and by the rawcode of the
same field. `storm` has the id that `blessing` has, and it sets a field of Holy Light on a copy of Blizzard.

[`moonwell objects:check`](./reference/commands#objects-check) runs both checks and builds nothing, and
[`moonwell objects:eval`](./reference/commands#objects-eval) prints the objects as Moonwell reads them, field by
field.

## Objects made in World Editor

The source map can have object data of its own: standard objects that were changed in World Editor, and custom
objects that were made there. Moonwell keeps all of it as it is. A build copies the objects that the map's own
`war3map.w3u` and the files like it hold, byte for byte, and adds yours after them.

An id of yours that a custom object of the source map has already is an error:

```text
error: objects/units.pkl › units["captain"].id: 'h000' is already the id of a custom object in the map.
hint: Change the id in Pkl, or delete the object in World Editor.
```

Every build starts from the source map. So an object that you take out of your object files is not in the next
build, and no object is added a second time. The source map itself never gets your objects: they are in the
staged map and in the archive, and not in the source map, the one you open in World Editor.

A `war3map.w3u` of the source map, or a file like it, that Moonwell cannot read is an error that names the file,
and its hint is to open the map in World Editor and save it again
([Using your own map](./own-map#when-moonwell-refuses-the-map)).

## What is not supported

- **Changing a standard object.** An object file adds custom objects. An `id` that a standard object has is an
  error. Change a standard object in World Editor: a build keeps the change.
- **Changing or removing an object made in World Editor.** A build keeps those objects as they are.
- **Copying a custom object.** A `base` is a standard object.
- **Doodads and destructables.** An object file has no mapping for them. A build keeps the files that the map has
  for them.
- **String references.** Moonwell makes no `TRIGSTR_` reference, and does not change `war3map.wts`.
- **Placing a unit on the map.** An object file places nothing on the map. Your code makes the unit, as in the
  example under [The generated ids](#the-generated-ids).
- **Other sources of object data.** Moonwell imports no `.w3o` file that World Editor exported, and it does not
  read a packed `.w3x` map.
- **Ranges and named values.** A field takes a plain `Int`, `Number` or `String`. Moonwell does not check a value
  against the range or the names that World Editor offers for the field, such as the attack types.

## See also

- [Object fields](./reference/object-fields): how a field gets its name, where to find a field, typed fields and
  `properties`, levels and value types.
- [Commands](./reference/commands): [`objects:check`](./reference/commands#objects-check) and
  [`objects:eval`](./reference/commands#objects-eval), and what each reads, writes and fails on.
- [Files and caches](./reference/files): [the ids module](./reference/files#src-generated), and
  `.moonwell/objects.pkl`, the module that gathers the object files.
- [Troubleshooting](./reference/troubleshooting):
  [an ids module that is stale](./reference/troubleshooting#the-generated-ids-are-stale), and [a Pkl package of
  another version](./reference/troubleshooting#the-program-and-the-projects-pkl-package-differ-in-version) than the
  program.
- [Assets](./assets): the next page. It describes the files under `assets/` that a build imports into the map.
