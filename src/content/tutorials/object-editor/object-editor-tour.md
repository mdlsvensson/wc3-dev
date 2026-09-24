---
title: A tour of the Object Editor
summary: Find your way around the Object Editor, its tabs, standard and custom objects, and the fields that define them.
order: 1
minutes: 15
goals:
  - Browse units, abilities and items in the Object Editor
  - Tell standard objects from custom ones
  - Switch between field names and raw data
---

Your map now has its terrain, its village, its players and its loading
screen. Everything on it, though, is a standard Warcraft III object: a
Peasant is a Peasant, with the same hit points, cost and abilities as in any
melee game. The Object Editor is where that changes. It holds the values
behind every unit, item, ability and upgrade in the game, and it lets you make
your own. This chapter uses it to make three things for Defend the Village: a
hero, an ability for that hero, and a tower. This first lesson shows you
around, so you know where things are before you change anything. Open
`DefendTheVillage.w3x` in the editor if it is not open already.

## Open the Object Editor

Choose :menu[Module > Object Editor], or press :kbd[F6]. The Object Editor
opens in a window of its own, next to the main window.

Across the top of the window is a row of tabs, one for each kind of object:

- **Units** holds every unit, building and hero.
- **Items** holds the items heroes carry, such as the Potion of Healing your
  Gnoll Poacher drops.
- **Destructibles** holds trees, crates, barrels and the other scenery that
  can be destroyed.
- **Doodads** holds the scenery that cannot.
- **Abilities** holds every spell and skill, including the passive ones such
  as auras.
- **Buffs/Effects** holds the effects abilities leave on units, such as the
  stun from a Storm Bolt, with their icons and visual effects.
- **Upgrades** holds the upgrades researched in buildings, such as the
  Blacksmith's weapon and armour upgrades.

::shot[The Object Editor window on the Units tab, with the row of tabs across the top, the object tree on the left and the Peasant's field list on the right]{src="./object-editor-tour/object-editor.png"}

Each tab works the same way. On the left is a tree of objects. Select one, and
the right-hand side shows its fields: a long list of every value that defines
it, with the field's name in one column and its value in the other.

## Standard and custom objects

The tree on the left of every tab is split in two. On the Units tab the two
halves are **Standard Units** and **Custom Units**.

- **Standard Units** are the units that come with the game. They are sorted by
  race: **Human**, **Orc**, **Undead**, **Night Elf**, and the neutral units
  such as the creeps. Inside each race, **Melee** holds the units of a normal
  game and **Campaign** holds the units made for the story campaigns. Inside
  each of those, the units are grouped again into **Units**, **Buildings**,
  **Heroes** and **Special**.
- **Custom Units** holds the units you make yourself, sorted the same way.
  It is empty on a new map.
<!-- verify: the race folders under Standard Units in Reforged and their order -->

:::steps
1. On the **Units** tab, open **Standard Units**, then **Human**, then
   **Melee**, then **Units**.
2. Click **Peasant**. Its fields fill the right-hand side of the window.
3. Open **Buildings** under the same **Melee** folder and click **Town Hall**,
   then open **Heroes** and click **Paladin**. Each shows its own fields.
4. Click the **Items** tab and look through its tree. Find the **Potion of
   Healing** and click it.
   <!-- verify: where the Potion of Healing sits in the Items tab tree (Standard Items, then an item class such as Charged or Purchasable) -->
5. Click the **Units** tab again.
:::

::shot[The Units tab with Standard Units, Human, Melee and Heroes opened in the tree and the Paladin selected, and the empty Custom Units folder visible in the tree]{src="./object-editor-tour/object-tree.png"}

You can change a standard object's fields directly. The change applies only to
this map, never to the game itself or to your other maps, but it applies to
every unit of that type on the map. Change the Footman, and every Footman on
the map changes.

So when this track makes something new, it copies a standard object first and
changes the copy. The original stays as the game made it, ready to use as it
is or to copy again, and everything you made yourself is in one place, under
**Custom Units** or **Custom Abilities**, where it is easy to find. The one
standard object the track does change is the Peasant, in the last lesson of
this chapter, because that change is meant for every Peasant on the map.

## Fields

Every object has dozens of fields, and their names follow a pattern: a group,
then the field, such as **Text - Name**, **Stats - Hit Points Maximum (Base)**
or **Stats - Gold Cost**. The group tells you what kind of value it is: **Art**
fields set the model and icon, **Combat** fields set attacks and armour,
**Movement** fields set speed, **Stats** fields set costs, hit points and
mana, **Techtree** fields set what the unit can build and what it needs
first, and **Text** fields hold names and tooltips. The list is sorted by name, so each group's fields sit
together.

To change a field, double-click it. A small dialog opens with the current
value; type a new one and click **OK**. A field you have changed stands out
from the rest in a different colour, so you can always see what differs from
the original.
<!-- verify: the colour of changed fields in the Reforged Object Editor (magenta by default?) -->

Try it on a standard unit, and put it back afterwards.

:::steps
1. Select **Peasant** again, under **Standard Units**, **Human**, **Melee**,
   **Units**.
2. Double-click **Text - Name**. Type `Villager` and click **OK**. The field
   now shows `Villager` in its changed colour, and the Peasant's name in the
   tree changes too.
3. Right-click **Text - Name** and choose **Reset Selected Field**. The name
   goes back to `Peasant`, and the field goes back to its normal colour.
   <!-- verify: the right-click menu of a field in the Reforged Object Editor has "Reset Selected Field" (or similar), which restores the default value -->
:::

::shot[The Peasant's field list with Text - Name changed to Villager and shown in the changed-field colour, next to the unchanged fields]{src="./object-editor-tour/changed-field.png"}

Resetting is how you undo a change you no longer want, however long ago you
made it. On a custom object, resetting a field sets it back to the value of
the object it was copied from.

## Raw data

Under the names the editor shows you, every object and every field has a short
code of four characters, called a rawcode. The Peasant is `hpea`, the Town Hall
is `htow` and the Paladin is `Hpal`; the field **Text - Name** is `unam`. The
game itself only knows these codes. The names are there for people.

Choose :menu[View > Display Values As Raw Data], or press :kbd[Ctrl+D], to see
them. The field list shows each field's code next to its name, and the values
show as they are stored, without the editor's translation: a list of
abilities, for example, becomes a list of ability codes. Press :kbd[Ctrl+D]
again to switch back.
<!-- verify: how raw data mode shows field and object names (e.g. "unam (Name)", "hpea (Peasant)") -->

::shot[The Units tab in raw data view with the Peasant selected: the tree showing object codes such as hpea, and the field list showing field codes such as unam next to their values]{src="./object-editor-tour/raw-data.png"}

Custom objects get codes too. The editor gives each one a new code when you
make it, built from a letter and three digits, such as `H000` for a first
custom hero, `h000` for a custom unit or building, and `A000` for a custom
ability.
<!-- verify: the second custom unit's code when H000 already exists (h000 or h001) -->

You will see rawcodes all over the modding world, because they are
unambiguous. Two objects can share a name, and names change when a map is
translated, but a code belongs to one object only. When someone on
[Hive Workshop](https://www.hiveworkshop.com/) says to give a unit `AHtb`,
they mean Storm Bolt, whatever the map calls it. This track uses names, but
when a lesson mentions a code, :kbd[Ctrl+D] shows you where it lives.

Close the Object Editor, or leave it open for the next lesson. You changed
nothing that you did not reset, so there is nothing to save.
