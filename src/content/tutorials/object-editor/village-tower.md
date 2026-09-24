---
title: A village tower
summary: Create a cheap Village Tower that peasants can build to defend against the waves.
order: 4
minutes: 15
goals:
  - Create a custom building
  - Set its attack, cost and build time
  - Let a worker build it
---

The Captain cannot hold the ford alone. The village's other defence is its
towers, built by the Peasants while the waves are on their way. In a melee
game, human towers take two steps: a Peasant builds a Scout Tower, which
must then be upgraded into a Guard Tower once the player has a Lumber Mill.
Defend the Village has no time for that. In this lesson you make the Village
Tower, a cheaper Guard Tower that Peasants build in one go, with no
requirements and no upgrades.

## Copy the Guard Tower

Buildings live on the Units tab, with the units and heroes, and you copy them
the same way.

:::steps
1. Open the Object Editor with :kbd[F6] and click the **Units** tab.
2. In the tree, open **Standard Units**, **Human**, **Melee**, **Buildings**,
   and select **Guard Tower**.
3. Press :kbd[Ctrl+C], then :kbd[Ctrl+V]. The copy appears under **Custom
   Units**, **Human**, **Melee**, **Buildings**. Select it.
4. Double-click **Text - Name**, type `Village Tower` and click **OK**.
:::

::shot[The Units tab with the new custom building selected under Custom Units, Human, Melee, Buildings, and its Text - Name field changed to Village Tower]{src="./village-tower/new-tower.png"}

## Attack, cost and build time

The Village Tower costs 100 gold and 30 lumber and goes up in 30 seconds, so
the player can afford one before the first wave arrives and several by the
end. A tower that cheap should hit a little softer than a real Guard Tower,
so it loses a couple of points of damage.

A unit's attack damage is made of three fields. **Combat - Attack 1 - Damage
Base** is a fixed amount, and the game adds a roll of dice to it:
**Combat - Attack 1 - Damage Number of Dice** says how many dice and
**Combat - Attack 1 - Damage Sides per Die** how many sides each die has. Only
the base changes here.
<!-- verify: the attack damage field names in Reforged (Combat - Attack 1 - Damage Base, Damage Number of Dice, Damage Sides per Die) -->

The Guard Tower is normally an upgrade of the Scout Tower, and it carries
fields that say so. **Techtree - Requirements** lists what the player must
have before they can make it, which for the Guard Tower is a Lumber Mill.
**Techtree - Upgrades To** lists what it can be upgraded into. The Village
Tower needs neither.
<!-- verify: the Guard Tower's Techtree - Requirements lists the Lumber Mill, and its Techtree - Upgrades To (probably empty) -->

:::steps
1. With the Village Tower selected, set **Stats - Gold Cost** to `100` and
   **Stats - Lumber Cost** to `30`.
2. Set **Stats - Build Time** to `30`. The value is in seconds.
   <!-- verify: the field names Stats - Gold Cost, Stats - Lumber Cost and Stats - Build Time -->
3. Double-click **Combat - Attack 1 - Damage Base** and lower the value by 2.
4. Double-click **Techtree - Requirements**. Remove every entry in the list,
   so that it is empty, and click **OK**.
5. Double-click **Techtree - Upgrades To**. If it lists anything, remove it,
   and click **OK**.
6. Set **Text - Tooltip - Basic** to `Build Village Tower`, and **Text -
   Tooltip - Extended** to `A sturdy tower that attacks invaders on its own.
   Cheap and quick to build.` The Guard Tower's own tooltips talk about
   upgrading a Scout Tower, which a Village Tower never is.
   <!-- verify: the Guard Tower's default Text - Tooltip - Basic reads "Upgrade to Guard Tower" (with colour codes) -->
7. Save the map with :kbd[Ctrl+S].
:::

::shot[The Village Tower's fields with Gold Cost 100, Lumber Cost 30, Build Time 30, a lowered Attack 1 Damage Base, and empty Techtree - Requirements and Techtree - Upgrades To, in the changed-field colour]{src="./village-tower/tower-fields.png"}

## Let peasants build it

A unit's **Techtree - Structures Built** field lists the buildings it can
build. Here you change the standard Peasant rather than a copy, because every
Peasant on the map should be able to build the tower: the five in the village
and any the Town Hall trains later.

There is a catch. The Peasant's build menu is a grid of twelve buttons, and
the eleven human buildings and the cancel button already fill it. A twelfth
building would land on top of another button and hide it. So the Village
Tower replaces the Scout Tower, which this map does not need, and takes its
place in the grid. A building's place in the grid is set by its **Art -
Button Position** fields.
<!-- verify: the Human Peasant's build menu in Reforged is one page of 12 buttons filled by 11 buildings and Cancel, and two buttons at the same position hide one another -->
<!-- verify: the field names Art - Button Position - Normal (X) and Art - Button Position - Normal (Y) for units -->

:::steps
1. Under **Standard Units**, **Human**, **Melee**, **Buildings**, select
   **Scout Tower** and note the values of its two **Art - Button Position**
   fields, **X** and **Y**.
2. Select the Village Tower under **Custom Units** and set its two **Art -
   Button Position** fields to the same values.
3. Under **Standard Units**, **Human**, **Melee**, **Units**, select
   **Peasant**.
4. Double-click **Techtree - Structures Built**. A dialog lists the
   buildings a Peasant can build.
5. Select **Scout Tower** and remove it.
6. Add **Village Tower**, from the custom units in the list that opens, and
   click **OK**.
   <!-- verify: the Techtree - Structures Built edit dialog in Reforged works like the Abilities - Hero one (a list with buttons to add and remove, custom units available in the add list) -->
7. Save the map.
:::

::shot[The Techtree - Structures Built dialog for the Peasant, with Village Tower in the list in place of Scout Tower]{src="./village-tower/peasant-builds.png"}

The Peasant is now the only standard object on the map that you have changed.
If you ever want the Scout Tower back, reset the Peasant's **Techtree -
Structures Built** field.

## Test

The Peasants can build the tower, but the player has no gold to pay for it
yet: with the melee setup switched off, the game starts at zero, and the
Setup trigger that gives the player gold arrives in chapter 6. For now, use a
cheat. Warcraft III has cheat codes for single-player games, and a Test Map
game counts as one. `greedisgood` followed by a number gives you that much
gold and lumber.
<!-- verify: cheat codes such as greedisgood work in a Reforged Test Map game, and greedisgood 500 gives 500 gold and 500 lumber -->

:::steps
1. Save the map, then choose :menu[File > Test Map], or press :kbd[Ctrl+F9].
2. Press :kbd[Enter] to open the chat box, type `greedisgood 500` and press
   :kbd[Enter] again. The game confirms the cheat, and the gold and lumber
   counters jump to 500.
3. Select a Peasant and click **Build**. The Village Tower is in the menu, in
   the Scout Tower's old place. Hold the pointer over it: it costs 100 gold
   and 30 lumber.
   <!-- verify: the Reforged Peasant command card's build button label (Build or Build Structure) -->
4. Click the Village Tower and place it at the top of the ramp, beside the
   cobbled path but not on it. The Peasant starts to build, and the tower is
   finished 30 seconds later.
5. Press :kbd[F10], choose **End Game**, then **Exit Program** to return to the
   editor.
:::

::shot[Warcraft III running Defend the Village in a Test Map game, with a Peasant's build menu open and the Village Tower button's tooltip showing 100 gold and 30 lumber, and a finished Village Tower at the top of the ramp]{src="./village-tower/tower-in-game.png"}

The cheat is only for testing, and it changes nothing in the map. When the
map is finished, the player's gold comes from the Setup trigger in
[chapter 6](/learn/triggers/wave-timer/), and every tower they build is paid
for.

:::checkpoint
The Village Captain, a custom hero with the proper names Aldric, Maren and
Tobin, stands beside the Town Hall. He can learn Shield Throw, a three-level
stun copied from Storm Bolt, along with Divine Shield, Devotion Aura and
Resurrection. Peasants can build the Village Tower for 100 gold and 30
lumber, with no requirements and no upgrades.
:::
