---
title: Creep camps and item drops
summary: Guard the map with neutral hostile creep camps, and make them drop an item when they die.
order: 3
minutes: 15
goals:
  - Place neutral hostile creeps
  - Make a creep drop an item
  - Keep camps suited to a new hero
---

The village is built, and in chapter 5 it gets a hero: the Village Captain.
A hero grows stronger by gaining experience, and the classic way to gain it is
to fight creeps: groups of monsters that guard parts of the map. In this
lesson you place two small creep camps for the captain to clear between waves,
and make one of the creeps drop a healing potion when it dies. The camps go
where the invaders will not meet them, so that they are still there when the
player comes for them.

## Neutral Hostile

Creeps are not owned by any of the players in the game. They belong to a
special player called **Neutral Hostile**, which is at war with everyone. A
creep attacks any unit that comes close, whoever owns it: the player's
Peasants, the captain, and the invaders from Player 12 alike. When nothing is
near, creeps stand guard at their camp, and if they chase something too far
they walk back to it.

You place creeps from the Unit Palette like any other unit. The only
difference is the owner.

:::steps
1. Press :kbd[U] to switch to the Units layer.
2. Open the player list at the top of the palette and choose **Neutral
   Hostile**. It is below the numbered players.
3. Look through the race list. Next to the playable races there are groups of
   creeps, and the palette lists their units.
   <!-- verify: Neutral Hostile is listed below the numbered players in the player list; how creeps are listed in the Unit Palette with Neutral Hostile selected (the race list's entries for creeps and where Gnolls and Murlocs appear) -->
:::

::shot[The Unit Palette with Neutral Hostile selected in the player list, showing a list of creeps with the Gnoll highlighted]{src="./creep-camps/neutral-hostile.png"}

Units placed for Neutral Hostile are drawn in its own colour in the editor,
so you can tell creeps from the village at a glance.
<!-- verify: the colour the editor draws Neutral Hostile units in -->

## Two camps

The map gets two camps. A gnoll camp waits in the clearing you left in the
western forest, and a murloc camp sits on the river bank a good way north of
the ford.

Where you put them matters more than what is in them. Creeps attack the
invaders just as they attack the player, so a camp beside the path would fight
every wave that passes, and the waves would arrive at the village weakened, or
the camp would be wiped out before the player ever reached it. Keep both camps
well away from the wave route: the dirt path from the spawn, the ford, and the
path up to the ramp. Eight or ten tiles from the path is a safe distance.

:::steps
1. With **Neutral Hostile** selected, find **Gnoll** in the list and place two
   Gnolls in the clearing in the western forest, close together.
2. Find **Gnoll Poacher** and place one next to them. Creeps that stand close
   together fight as a group: attack one and the others join in.
   <!-- verify: the creep names Gnoll, Gnoll Poacher and Murloc Tiderunner as they appear in the Unit Palette -->
3. From the ford, follow the river north-west, towards the edge of the map,
   on the village's side. Well away from the ford and the path, place
   two **Murloc Tiderunners** on the bank, at the edge of the water.
4. Turn on the pathing view with :kbd[P] and check that each camp stands on
   walkable ground, not inside the trees or the deep water. Turn it off.
5. Save the map with :kbd[Ctrl+S].
:::

::shot[The terrain view zoomed out over the west and centre of the map, with the gnoll camp of two Gnolls and a Gnoll Poacher in the forest clearing and two Murloc Tiderunners on the river bank north-west of the ford, both well away from the dirt path]{src="./creep-camps/creep-camps.png"}

Give each creep a slightly different facing in its **Unit Properties**, so a
camp looks like a group resting rather than a row of soldiers on parade.

## Item drops

When a creep dies, it can drop an item for the hero to pick up. You choose
what a placed unit drops in its properties.

The Gnoll Poacher gets one drop: a Potion of Healing, every time.

:::steps
1. Double-click the Gnoll Poacher to open its **Unit Properties**, and open
   the **Item Drops** tab.
   <!-- verify: the tab's name in the Reforged Unit Properties dialog (Item Drops, Drops or similar) -->
2. Choose **Use Custom Table**. This gives the unit a drop list of its own.
3. Click **New Set** to add an item set. A set is one roll: the unit drops at
   most one item from each set.
4. With the new set selected, click **New Item**. In the dialog that opens,
   choose **Potion of Healing** as the item and set its chance to **100**
   percent.
   <!-- verify: the Item Drops controls in Reforged (Use Custom Table, New Set, New Item) and the dialog for choosing an item and its percentage chance -->
5. Click **OK** in each dialog, then save the map.
:::

::shot[The Item Drops tab of the Gnoll Poacher's Unit Properties, with Use Custom Table selected and one item set containing Potion of Healing at 100%]{src="./creep-camps/item-drops.png"}

The editor can also keep item tables for the whole map, which many units can
share. That is worth it on a map with dozens of camps. This map has one drop,
so a table on the unit itself is simpler. Once the captain has joined the
village in chapter 5, you will see the potion fall when the gnoll camp is
cleared.

## Camp levels

Every creep has a level, and a camp's difficulty is the total of its creeps'
levels. In the game, the minimap marks each creep camp with a dot whose
colour shows that difficulty: green for an easy camp, orange for a medium one,
and red for a hard one. Players read those dots to decide where to take their
hero first.
<!-- verify: the in-game minimap marks creep camps with green, orange and red dots by difficulty, and whether this shows in a custom map with the melee setup off -->

The Village Captain starts at level 1, and the player has to fight waves at
the same time, so both camps are easy on purpose. Gnolls, Gnoll Poachers and
Murloc Tiderunners are among the weakest creeps in the game, level 1 or 2
each.
<!-- verify: the levels of Gnoll, Gnoll Poacher and Murloc Tiderunner -->
A level 1 hero can clear either camp alone and come out stronger, which is
exactly what the camps are for.

If you want more challenge later, add a creep to a camp or swap one for a
tougher kind, such as a Gnoll Brute. Change one camp at a time, and test it
with the captain before you change the next.
