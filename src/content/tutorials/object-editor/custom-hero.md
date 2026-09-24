---
title: A custom hero
summary: Create the Village Captain, a custom hero based on the Paladin, and place it in the village.
order: 2
minutes: 20
goals:
  - Create a custom unit from an existing one
  - Change a hero's name, proper names and stats
  - Place the new hero on the map
---

Every defence needs a leader. In this lesson you make the Village Captain, the
hero who holds the village alongside its towers. Building a hero from nothing
means filling in hundreds of fields, so you start from a hero that is already
close: the Paladin, a sturdy human fighter. You copy it, give the copy its own
name, names and attributes, and place it next to the Town Hall. The Captain
keeps the Paladin's look and, for now, his abilities; the next lesson gives him
one of his own.

## Copy the Paladin

A copy starts out identical to the original: same model, same stats, same
abilities. Everything you then change applies only to the copy.

:::steps
1. Open the Object Editor with :kbd[F6] and click the **Units** tab.
2. In the tree, open **Standard Units**, **Human**, **Melee**, **Heroes**, and
   select **Paladin**.
3. Press :kbd[Ctrl+C] to copy it, then :kbd[Ctrl+V] to paste. You can also
   right-click the Paladin and use **Copy** and **Paste** from the menu.
   <!-- verify: the right-click menu's copy and paste labels in the Object Editor tree (probably Copy Unit and Paste Unit) -->
4. Open **Custom Units**. The copy is there, under **Human**, **Melee**,
   **Heroes**, still called Paladin. Select it.
   <!-- verify: a pasted copy appears under Custom Units in the same race and category folders as the original, with the same name -->
5. Double-click **Text - Name**, type `Village Captain` and click **OK**. The
   name in the tree changes to match.
:::

::shot[The Units tab with the new custom hero selected under Custom Units, Human, Melee, Heroes, and its Text - Name field changed to Village Captain]{src="./custom-hero/new-custom-unit.png"}

There is a second way to do the same thing: :menu[Edit > New Custom Unit]
opens a dialog where you type the name and pick the unit to base it on.
Either way you get a new object with its own code. Press :kbd[Ctrl+D] to see
it: the Captain's code starts with a capital `H`, such as `H000`, which marks
it as a hero. Press :kbd[Ctrl+D] again to go back to names.

## Name and proper names

A hero has two kinds of name. **Text - Name** is the kind of unit, which you
just set: every Village Captain is a Village Captain. **Text - Proper Names**
is a list of personal names, and each Captain the game creates takes one of
them at random, the way every Paladin in a melee game has a name of his own.
The player sees the proper name in the unit panel at the bottom of the
screen, above an experience bar that shows the level and the unit name.

:::steps
1. With the Village Captain selected, double-click **Text - Proper Names**. The
   Paladin's list of names appears.
2. Delete them all and type `Aldric,Maren,Tobin`, with a comma between the
   names and no spaces. Click **OK**.
   <!-- verify: the Text - Proper Names dialog in Reforged takes a comma-separated list -->
3. Find **Text - Proper Names Used** and set it to `3`, the number of names
   in the list.
   <!-- verify: the field name "Text - Proper Names Used" (raw upru) and that it should match the number of proper names -->
4. Double-click **Text - Tooltip - Basic** and replace the text with
   `Summon Village Captain`. The Paladin's reads "Summon Paladin".
5. Double-click **Text - Tooltip - Extended** and replace the text with `The
   captain of the village guard. Strong in melee, and trained to protect the
   villagers around him.`
:::

::shot[The Village Captain's Text fields: Name set to Village Captain, Proper Names set to Aldric,Maren,Tobin and the two tooltips replaced, all in the changed-field colour]{src="./custom-hero/hero-names.png"}

The tooltips are what a player reads on a building's button when it offers the
unit, such as the altar where heroes are summoned. The Captain is placed on
the map rather than summoned, so this map never shows them, but a finished
unit should not describe itself as a Paladin. The Paladin's tooltips contain
codes such as `|cffffcc00` and `|r`, which colour the hotkey letter gold;
plain text works just as well.
<!-- verify: the Paladin's Text - Tooltip - Basic contains |cffffcc00 … |r colour codes around the hotkey letter -->

## Stats

A hero's strength comes from three attributes, which grow each time the hero
gains a level. **Strength** adds hit points, **Agility** adds armour and attack
speed, and **Intelligence** adds mana. A hero also gets extra attack damage
from its primary attribute, which for the Paladin, and so the Captain, is
Strength.

The Paladin starts with Strength 22, Agility 13 and Intelligence 17. The
Captain keeps his strength but is a little quicker and a little less magical:
Strength 22, Agility 14, Intelligence 16.

:::steps
1. With the Village Captain selected, find **Stats - Starting Strength**. It
   already shows `22`, the Paladin's value, so leave it.
2. Set **Stats - Starting Agility** to `14`.
3. Set **Stats - Starting Intelligence** to `16`.
4. Leave **Stats - Hit Points Maximum (Base)** and the **Stats - Strength per
   Level**, **Agility per Level** and **Intelligence per Level** fields as they
   are.
5. Save the map with :kbd[Ctrl+S].
:::

::shot[The Village Captain's Stats fields with Starting Strength 22, Starting Agility 14 and Starting Intelligence 16, and Hit Points Maximum (Base) unchanged]{src="./custom-hero/hero-stats.png"}

The hit points you see in the game are higher than **Stats - Hit Points
Maximum (Base)**, because each point of Strength adds to it. That is why the
field stays: Strength already gives the Captain the Paladin's toughness.

The Object Editor has no field for the level a hero starts at. That belongs
to the placed unit: the **Level** in its **Unit Properties**, which you saw in
chapter 3. The Captain starts at level 1 and earns the rest.
<!-- verify: no Object Editor field sets a hero's starting level (Stats - Level does not) -->

The Captain keeps the Paladin's model, the field **Art - Model File**. New
models are out of scope for this track, but when you want one, the
[resource catalog](/resources/) is a good place to start.

## Place the hero

The Captain is a unit like any other, so you place him from the Unit Palette.
Custom units appear in the palette with the standard ones of their race.
<!-- verify: how the Reforged Unit Palette lists custom units (with the standard units of their race, or in a separate custom list) -->

:::steps
1. In the main window, press :kbd[U] to switch to the Units layer.
2. Check that the player list shows **Player 1 (Red)** and the race list
   shows **Human**.
3. In the heroes, click **Village Captain**. It looks like the Paladin, so hold
   the pointer over it to check the name.
4. Click on the open patch you left beside the Town Hall in chapter 3.
5. Save the map, then choose :menu[File > Test Map], or press :kbd[Ctrl+F9].
6. When the game has loaded, click the Captain. The unit panel shows his
   proper name, Aldric, Maren or Tobin, above an experience bar that reads
   **Level 1 Village Captain**.
   <!-- verify: how the Reforged in-game info panel shows a hero's proper name, level and unit name -->
7. Look at his attributes in the panel at the bottom of the screen:
   Strength 22, Agility 14, Intelligence 16.
8. Press :kbd[F10], choose **End Game**, then **Exit Program** to return to the
   editor.
:::

::shot[Warcraft III running Defend the Village in a Test Map game, with the Village Captain selected beside the Town Hall: his proper name, Level 1 Village Captain, and Strength 22, Agility 14 and Intelligence 16 in the info panel]{src="./custom-hero/hero-in-game.png"}

Test Map again a couple of times and the Captain's name may change: each game,
the Captain draws one of his three proper names.
