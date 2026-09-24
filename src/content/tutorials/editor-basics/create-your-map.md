---
title: Create and test your map
summary: Create the 96 × 96 Lordaeron Summer map you will build throughout the track, save it, and play it for the first time.
order: 3
minutes: 15
goals:
  - Create a new map with a chosen size and tileset
  - Save the map where the game can find it
  - Launch the map in the game with Test Map
---

Time to start the map you will build for the rest of the track: Defend the
Village. In this lesson you create it with the right size and tileset, save it,
switch off the melee rules every new map starts with, and play it in the game
for the first time. It is only a flat field of grass for now, but it is yours,
and every later lesson builds on it.

## A new map

The size and tileset are the two choices that are hard to change later, so
make them now. Defend the Village is 96 × 96, a small map that is quick to
build and quick to cross. Its tileset is Lordaeron Summer: green grass, dirt
paths and the trees of the human kingdom, a good fit for a village.

:::steps
1. Choose :menu[File > New Map], or press :kbd[Ctrl+N]. The **Create New Map**
   dialog opens.
   <!-- verify: the New Map dialog's title is "Create New Map" -->
2. Under **Map Size**, set **Width** to 96 and **Height** to 96.
3. In the **Tileset** list, select **Lordaeron Summer**.
4. Set **Initial Tile** to **Grass**. This is the tile that covers the whole
   map to begin with.
5. Leave **Initial Height** at its default and **Initial Water Level** at
   **None**, so that the map starts as flat, dry ground.
   <!-- verify: the New Map dialog's field names and values: Map Size (Width, Height), Tileset, Initial Tile, Initial Height, Initial Water Level (None) -->
6. Click **OK**. If the editor asks whether to save the map you had open,
   choose **No**: it was only for the tour.
:::

::shot[The Create New Map dialog with Width and Height set to 96, Lordaeron Summer selected as the tileset and Grass as the initial tile]{src="./create-your-map/new-map-dialog.png"}

The dialog also shows a **Playable Map Area** that is a little smaller than 96 ×
96. A narrow border around the edge of every map is outside the camera's reach:
players can see it at the edges of the screen, but cannot scroll into it or
walk there. Keep that in mind when you place things near the edge.
<!-- verify: the New Map dialog shows the playable map area, and its size for a 96 × 96 map -->

The new map opens in the main window: a square of grass, seen from above.

## Save it

Save the map before you do anything else, so it has a name and a place on
disk.

:::steps
1. Choose :menu[File > Save Map As].
2. Go to your own maps folder, `Documents\Warcraft III\Maps\My Maps`, the one
   you made in the first lesson.
3. Name the map `DefendTheVillage` and click **Save**. The editor adds the
   `.w3x` extension, so the file is `DefendTheVillage.w3x`.
   <!-- verify: the Save Map As dialog adds .w3x by default in Reforged, with no extra save-format choice needed -->
:::

::shot[The Save Map As dialog in Documents\Warcraft III\Maps\My Maps, with DefendTheVillage typed as the file name]{src="./create-your-map/save-dialog.png"}

From now on, save with :kbd[Ctrl+S] whenever you finish a step. The editor
does not save for you, and it can crash like any other program. A habit of
saving often costs nothing and saves hours.

## Switch off the melee setup

Every new map comes with one trigger, `Melee Initialization`. It runs when the
map starts and sets up a standard melee game: it gives every player starting
units and resources, runs the computer players' melee AI, and ends the game
when a player loses all their buildings. Defend the Village has its own rules
and sets up its own resources, so none of that is wanted here.

You switch the trigger off rather than delete it for now. Chapter 6 explains
[what triggers are](/learn/triggers/trigger-basics/) and deletes it then.

:::steps
1. Open the Trigger Editor with :menu[Module > Trigger Editor], or press
   :kbd[F4].
2. In the list on the left, open the **Melee Initialization** category and
   select the `Melee Initialization` trigger inside it. Its events and actions
   appear on the right.
   <!-- verify: a new map's trigger list has a category named "Melee Initialization" containing the trigger of the same name -->
3. Above the actions, untick **Enabled**. The trigger's icon in the list
   changes to show that it is disabled.
   <!-- verify: the checkbox label "Enabled" in the trigger panel, and how a disabled trigger looks in the list -->
4. Close the Trigger Editor and save the map with :kbd[Ctrl+S].
:::

::shot[The Trigger Editor with the Melee Initialization trigger selected and its Enabled box unticked]{src="./create-your-map/disable-melee.png"}

:::caution[Untick Enabled, not Initially On]
Next to **Enabled** is a box called **Initially On**. Leave it alone and
untick **Enabled** only: a disabled trigger is left out of the map entirely,
while **Initially On** controls something else. If the melee
setup stays on, later tests give Player 1 an extra town hall and workers, and
the melee rules can end a test before your own triggers ever run.
:::

## Test it

Test Map starts Warcraft III with the map open in the editor, so you can play
it straight away. You will do this after almost every lesson, to see your
changes the way a player will.

:::steps
1. Save the map with :kbd[Ctrl+S].
2. Choose :menu[File > Test Map], or press :kbd[Ctrl+F9]. The game starts and
   loads your map. This can take a little while, especially the first time.
3. Look around with the arrow keys and the minimap. There is nothing but grass
   and the dark border at the edge of the map: no units and no buildings yet.
4. To return to the editor, press :kbd[F10] to open the game menu, choose
   **End Game**, then **Exit Program**. The editor is still open where you
   left it.
   <!-- verify: the in-game menu path to close a Test Map game in Reforged (F10 > End Game > Exit Program) -->
:::

::shot[Warcraft III running the empty Defend the Village map in a Test Map game: a flat field of grass with the game interface along the bottom and no units]{src="./create-your-map/first-test.png"}

If the game shows an error or does not start, check that Warcraft III itself
starts from the Battle.net app, then try again from the editor.

:::checkpoint
Your map exists as a 96 × 96 Lordaeron Summer map saved as
`DefendTheVillage.w3x`, its melee setup is switched off, and it launches with
Test Map.
:::
