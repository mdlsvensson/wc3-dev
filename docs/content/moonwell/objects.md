# Objects

After this page you can add a unit, a hero, an item or an ability to the map from a file or from your gameplay code,
set its fields, and use it in your code under a name of your own. These are the map's custom objects. They are
written in [Pkl](https://pkl-lang.org), in the files under `objects/`, or declared in the code that uses them
([Objects declared in code](#objects-declared-in-code)).

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
  ["moonwell"] { uri = "package://pkg.pkl-lang.org/github.com/mdlsvensson/moonwell/moonwell@0.12.10" }
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

The module holds the objects of the object files. An object declared in code is not in it: its id is what
`moonwell.declare` returns, and in the game what `moonwell.id_of` returns
([Objects declared in code](#objects-declared-in-code)).

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
at moonwell.generated.UnitProps#hitPointsMaximumBase (projectpackage://pkg.pkl-lang.org/github.com/mdlsvensson/moonwell/moonwell@0.12.10#/generated/UnitProps.pkl)

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

## Objects declared in code

An object can also be declared in the gameplay code that uses it, with the function `declare` of the `moonwell`
module. A build reads the declaration and adds the object to the map's object data, beside the objects of the object
files. In the game, `declare` returns the object's id, as the integer that the game's functions take:

```yue
import "moonwell" as mw

bolt = mw.declare {
  category: "abilities"
  key: "bolt"
  base: "AHtb"
  heroes: {"Hpal"}
  fields: {
    name: "Bolt"
    tooltipLearn: "Learn Bolt - [Level %d]"
    tooltipNormal: (level) -> "Bolt - [Level #{level}]"
    levels: 3
    cooldown: (level) -> 10 - level
  }
}

mw.on_main ->
  print "Bolt is", bolt
```

The ability copies Storm Bolt, has three levels with a cooldown of 9, 8 and 7 seconds, and is added to the abilities
that the Paladin can learn.

### What a declaration takes

`declare` takes a table with these settings, and a second argument, `level`, which
[The place of a declaration](#the-place-of-a-declaration) describes:

| Setting | What it is |
| --- | --- |
| `category` | The kind of the object: `"heroes"`, `"units"`, `"buildings"`, `"items"`, `"abilities"`, `"buffs"` or `"upgrades"` |
| `key` | A text that is not empty, and is used once in its kind, over the object files and the code. It may hold any characters, such as `spells.bolt` |
| `base` | The standard object that the new one copies, by its rawcode, as in an object file |
| `id` | Optional: the object's rawcode, which follows the rules of an `id` in an object file. Without it, Moonwell chooses one ([Ids of declared objects](#ids-of-declared-objects)) |
| `heroes` | Optional, and for an ability only: the standard heroes that can learn it ([Heroes that learn a declared ability](#heroes-that-learn-a-declared-ability)) |
| `fields` | A table of field names and their values. Write `fields: {}` for an object that sets none |

A setting that is not one of these six is an error, and so is a `category`, a `key`, a `base`, an `id` or a `fields`
of the wrong form.

### Fields of a declaration

`fields` names each field as `properties` does in an object file: by its friendly name, such as
`hitPointsMaximumBase`, or by its rawcode, such as `uhpm`. Moonwell checks the fields as it checks `properties`
([Fields of some abilities](#fields-of-some-abilities-properties)): a name must be a field that applies to the base,
a field is set once, and a value must fit its field and the object's level count. A value is one of these:

- **`true`, `false`, a number or a text.** It sets the field, as in an object file. A number must be finite.
- **A list,** such as `{8, 7, 6}`. On a field with levels it sets the levels 1, 2 and so on, and on a list field it
  sets the list, as a `List` does in an object file. The list may hold lists in its turn: on a list field with
  levels, such as the `buffs` of an ability, `{{"B000"}, {"B000", "B001"}}` sets one list for each level, as a `List`
  of lists does in Pkl.
- **A function of the level.** The build calls it for each level from 1 to the `levels` of the same `fields`, and
  the field takes at each level what the function returns there: `true`, `false`, a number, a text, or a list of
  those. On a list field with levels, what it returns is that level's list, also when it is one text:
  `buffs: (level) -> "B000"` gives every level the list `B000`.
- **`moonwell.id_of(category, key)`,** another declared object. The build writes that object's id in its place. It
  may be the value, an entry of a list or of a list of lists, and what a function of the level returns
  ([Naming another declared object](#naming-another-declared-object)).

A function of the level needs the field `levels` in the same `fields`, under that name, as a whole number of 1 or
more: without it the declaration is an error. `levels` also sets the object's level count, as it does in an object
file. To keep the value that the base has, leave the field out.

### Ids of declared objects

Moonwell chooses the id of a declaration that has no `id`: a letter for the kind, then three characters of `0` to
`9` and `A` to `Z`, the first that no standard object, no custom object of the source map, no object of the object
files and no other declaration has. The letter is `H` for a hero, `u` for a unit, `b` for a building, `I` for an
item, `A` for an ability, `B` for a buff and `R` for an upgrade.

A build writes the ids into `src/generated/declared-ids.json`, the file of declared ids, and the next build gives
each key the id that the file holds for it, while no other object has that id. So a declaration keeps its id as long
as its key is the same. For the example above, in a project with no other custom ability, the file is this:

```json
{
  "abilities": {
    "bolt": "A000"
  }
}
```

A declaration with an `id` of its own is in the file too. **Commit the file** with the code. `build`, `test` and
`dev` write it when it does not match the declarations, and remove it when the code declares nothing. `check`
compares it and writes nothing. It fails when the file does not match the declarations, when it is missing, and
when it is there in a project that declares nothing:

```text
error: src/generated/declared-ids.json › The file does not match the declared objects.
hint: Run moonwell build to update it.
```

A file that is no mapping of kinds to keys and ids, or that holds an id of the wrong form, is an error too. Its hint
is to fix the file or delete it: the next build then chooses new ids for every declaration without an `id` of its
own.

### Naming another declared object

`id_of`, a function of the `moonwell` module, names a declared object by its kind and its key:
`moonwell.id_of(category, key)`, with a `category` of the seven kinds and a `key` that is a text that is not empty.
In the fields of a declaration it stands for that object's id. The build gives every declared object its id, and
then writes the id in the place of each `id_of`, as the rawcode a field takes, such as `B000`. The object that
`id_of` names may be declared after the one that names it. This ability, a copy of Slow Aura (Tornado), carries a
buff that is declared on the next line:

```yue
import "moonwell" as mw

mw.declare category: "abilities", key: "burning.carrier", base: "Aasl", fields: {buffs: mw.id_of("buffs", "burning")}
mw.declare category: "buffs", key: "burning", base: "Basl", fields: {tooltip: "Burning"}
```

`id_of` names the objects that the code declares. An object of the object files is not one of them: a field names
it by its rawcode. A key that no declaration of the kind has fails the build at the line of the declaration that
names it. With the buff's key written `burnin` in the line of the ability:

```text
error: src/main.yue:3 › abilities["burning.carrier"]: the field "buffs" names buffs["burnin"] with moonwell.id_of, and no declaration has that key.
hint: Declare that object with moonwell.declare at the top level of a module the entry reaches, or name a key that is declared.
```

A `category` that is not one of the seven kinds, or a `key` that is not a text or is empty, fails the run that reads
the declarations at the line that calls `id_of`, with the hint `Fix this call of moonwell.declare`, as a wrong
declaration does ([How a build reads the declarations](#how-a-build-reads-the-declarations)). Its message begins
`moonwell.id_of:`, such as `moonwell.id_of: the category "spells" is not one of heroes, units, buildings, items,
abilities, buffs, upgrades.` In the game, `id_of` returns the object's id
([Declared objects in the game](#declared-objects-in-the-game)).

::: note
On Warcraft III Reforged 3.0.0.24268, on one machine and in a single-player game, a copy of Slow Aura (Tornado) of
one level, whose `buffs` named a declared buff with `id_of`, was given to a footman and hidden: the buff's level on
the footman read 1, and 0 after the aura and then the buff were removed. In the game `id_of` returned the id that the
buff's `declare` returned. A game that other machines join was not checked.
:::

### Heroes that learn a declared ability

`heroes` lists standard heroes by their rawcode, such as `Hpal` for the Paladin. A build adds the ability to the
hero abilities of each of them, in `war3map.w3u`. Where the hero's abilities were changed in World Editor, the
ability goes after the list that the source map gives the hero, and else after the hero's standard list. An ability
that the list holds already is not added a second time.

`heroes` on an object of another kind is an error, and so is a hero that is not a standard hero, such as a custom
one. An object file has no `heroes`.

### How a build reads the declarations

A build compiles the code first. Then it runs the code once, in the run that reads the declarations, with `yue -e`
of the YueScript compiler that compiled it. It does so only when one of the modules that the entry reaches requires
`moonwell` and the Lua of one of them names `declare`, as `.declare`, `:declare` or the text `"declare"`. In any
other project there is no such run. In that run:

- **The entry runs.** The entry runs, and every module that it requires while it loads, as when the map's script
  loads. No hook is called. A module that only a function requires, such as a hook, does not run: its declarations
  are not read, and in the game its `declare` raises the error that
  [Declared objects in the game](#declared-objects-in-the-game) shows.
- **The game is not there.** None of its natives exists, and neither do the globals of the source map's
  `war3map.lua`. A native that is called at the top level of a module fails the build.
- **`declare` returns `nil`.** `moonwell.declaring` is `true` during the run, and `false` in the game. Top-level
  code must not depend on an id: use it inside functions, such as hooks, which run in the game. The example above
  prints `bolt` in an `on_main` hook. `id_of` returns a value that only the fields of a declaration take, and not
  the id: top-level code must not use it as a number.
- **Output goes nowhere.** What the code prints during the run is not shown.

An error that ends the run fails the build, and names the file and the line of the error. A native at the top level
of `src/main.yue`, on line 3, gives this:

```text
error: src/main.yue:3 › attempt to call a nil value (global 'CreateUnit')
hint: This project declares objects (it calls moonwell.declare), so the top-level code of the modules the entry reaches runs at build, with no natives: call natives inside functions.
```

The hint is one of three:

- **A global that is `nil` is called,** as a native is in the run: the hint above. Move the call into a function,
  such as a hook.
- **A declaration is wrong,** as with a setting that `declare` does not take, a function of the level without
  `levels`, or a key that the code declares twice: the hint says
  `Fix this call of moonwell.declare: "Objects declared in code" in Moonwell's README says what it takes.` The
  message says what is wrong, such as `The base "AHt" is not a four-character id.`
- **Another error:** the hint says that the top-level code runs at build, `and this error ended that run.`

In a minified build an error in a YueScript module names the file without a line. An error in a Lua module keeps
its line.

After the run, Moonwell checks each declared object as it checks the objects of the object files: its base, its
id, its fields and their values. A problem names the file and the line of the declaration, and the object as
`abilities["bolt"]`. A key that an object file has in the same kind is an error at the declaration, which names the
object file. An id that two objects have names both.

### The place of a declaration

The line that calls `declare` is the place of the declaration, which its errors name. A function that declares for
its caller gives `declare` a second argument, `level`: a whole number of 1 or more, which counts the levels of the
call stack as `error` does. 1, the default, is the line that calls `declare`, and 2 the line that called the
function that calls it. Unlike `error`, `declare` counts a tail call as a level. A call over several lines, such
as `declare {` with its settings on the lines below, is at the line that YueScript gives the call: the one after
`declare {`.

```yue
import "moonwell" as mw

declareBolt = (key, name) ->
  mw.declare {category: "abilities", key: key, base: "AHtb", fields: {:name}}, 2

fire = declareBolt "fire_bolt", "Fire Bolt"
frost = declareBolt "frost_bolt", "Frost Bolt"

mw.on_main ->
  print fire, frost
```

An error in the declaration of `frost_bolt` names the line `frost = declareBolt "frost_bolt", "Frost Bolt"`.

### Declared objects in the game

In the map, `declare` returns the id that the build gave the object of that kind and key. A call with a kind and a
key that the build did not read, such as a call inside a function that runs only in the game, or in a module that
only such a function requires, raises an error at the line that called `declare`. Its message names the kind and
the key:

```text
moonwell.declare: abilities "bolt" was not declared at build: call moonwell.declare at the top level of a module the entry reaches.
```

`id_of` returns the same id as `declare`, the integer that the game's functions take, for a kind and a key that the
build read. For any other kind and key it raises at the line that called `id_of`, with the message above, which then
begins `moonwell.id_of:`. So a hook can name a declared object by its key:

```yue
import "moonwell" as mw

mw.on_main ->
  print "Bolt is", mw.id_of("abilities", "bolt")
```

::: note
On Warcraft III Reforged 3.0.0.24268, on one machine and in a single-player game, an ability declared with
`heroes: {"Hpal"}` was offered in the skill menu of the standard Paladin, and the Paladin learned it. At each of its
three levels its cooldown was the one that a function of the level gave. The game took the ability's tooltips from
the fields `tooltipLearn` and `tooltipNormal`, and not from `name`: a declaration that set `name` alone showed the
tooltips of its base ability. A game that other machines join was not checked.
:::

### What the object commands do not show

`moonwell objects:check` and `moonwell objects:eval` read the object files alone. An object declared in code is not
in what they print or count, and they do not look at the file of declared ids. Your editor does not know the
declared objects either: `generated.objects` holds the objects of the object files. A build and `moonwell check`
read both.

## Objects made in World Editor

The source map can have object data of its own: standard objects that were changed in World Editor, and custom
objects that were made there. Moonwell keeps all of it as it is. A build copies the objects that the map's own
`war3map.w3u` and the files like it hold, byte for byte, and adds yours after them. The one thing a build writes into
them is the hero abilities of a standard hero that a declared ability names in `heroes`
([Heroes that learn a declared ability](#heroes-that-learn-a-declared-ability)).

An id of yours that a custom object of the source map has already is an error:

```text
error: objects/units.pkl › units["captain"].id: 'h000' is already the id of a custom object in the map.
hint: Change the id (in Pkl, or the setting id of a declaration in code), or delete the object in World Editor.
```

Every build starts from the source map. So an object that you take out of your object files is not in the next
build, and no object is added a second time. The source map itself never gets your objects: they are in the
staged map and in the archive, and not in the source map, the one you open in World Editor.

A `war3map.w3u` of the source map, or a file like it, that Moonwell cannot read is an error that names the file,
and its hint is to open the map in World Editor and save it again
([Using your own map](./own-map#when-moonwell-refuses-the-map)).

## What is not supported

- **Changing a standard object.** An object file and a declaration add custom objects. An `id` that a standard
  object has is an error. Change a standard object in World Editor: a build keeps the change. The one exception is
  `heroes` on a declared ability, which adds the ability to a standard hero's abilities.
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
- [Files and caches](./reference/files): [the ids module and the file of declared
  ids](./reference/files#src-generated), and `.moonwell/objects.pkl`, the module that gathers the object files.
- [Troubleshooting](./reference/troubleshooting):
  [an ids module that is stale](./reference/troubleshooting#the-generated-ids-are-stale),
  [declared ids that are stale](./reference/troubleshooting#the-declared-ids-are-stale),
  [a build that fails in code that runs at build](./reference/troubleshooting#a-build-fails-in-code-that-runs-at-build),
  and [a Pkl package of another
  version](./reference/troubleshooting#the-program-and-the-projects-pkl-package-differ-in-version) than the program.
- [Assets](./assets): the next page. It describes the files under `assets/` that a build imports into the map.
