---
title: Units, buildings and start locations
summary: Place the town hall, farms and peasants for Player 1, and set the start location the game uses when the map begins.
order: 2
minutes: 15
goals:
  - Place units and buildings for a player
  - Edit a placed unit's properties
  - Set a player's start location
---

The village has its fences, crates and lamp posts, but nobody lives there yet.
In this lesson you build it for Player 1: a Town Hall on the cobbled square,
Farms and a Lumber Mill around it, and Peasants to work. Because you switched
off the melee setup in chapter 1, the game adds nothing of its own when the map
starts: what you place here is exactly what the player gets. You also give
Player 1 a start location, so the game knows where to point the camera, and
you test the map with something to look at for the first time.

## The Unit Palette

Press :kbd[U], or choose :menu[Layer > Units], to switch to the Units layer.
The palette window now lists units.

The most important control is the player list at the top of the palette.
Every unit you place belongs to the player selected there, and it takes that
player's colour. It starts on **Player 1 (Red)**, which is the player the
village belongs to. Below it, a second list picks a race, such as **Human**,
**Orc**, **Undead** or **Night Elf**, and the palette shows that race's units,
buildings and heroes in separate groups. A third list picks **Melee** or
**Campaign** units; leave it on **Melee**.
<!-- verify: the Unit Palette's controls in Reforged: a player list starting on Player 1 (Red), a race list, a Melee/Campaign list, and the groups it shows (Units, Buildings, Heroes, Special) -->

::shot[The Unit Palette with Player 1 (Red) and Human selected, showing the Human units, buildings and heroes, with the Town Hall highlighted]{src="./units-and-buildings/unit-palette.png"}

You place and select units the same way as doodads: pick one in the palette
and click in the terrain view to place it, press :kbd[Esc] to stop placing,
click a placed unit to select it and drag to move it, and press :kbd[Delete]
to remove it.

## Build the village

The village is a small human town. The Town Hall stands on the cobbled square
in the middle of the plateau. It is the heart of the map: in chapter 6, the
game is lost when it falls. Around it go four Farms and a Lumber Mill, and five
Peasants to build towers.

There is no gold mine. The player gets their gold from a trigger in chapter 6,
so the village does not need one.

:::steps
1. Check that the player list shows **Player 1 (Red)** and the race list shows
   **Human**.
2. Place the Town Hall first, before any other unit. The editor numbers units
   in the order you place them, so the Town Hall gets a low number, which
   the next section explains. Under
   the buildings, click **Town Hall** (hold the pointer over an icon to see
   its name). The pointer shows the building and the square of ground it
   needs.
3. Click on the cobbled square in the centre of the plateau. The Town Hall
   appears in red.
   <!-- verify: the editor refuses to place a building where it does not fit (over a cliff edge, in water, on a tree or doodad that blocks it), and how it shows this -->
4. Click **Farm** and place four Farms near the edges of the plateau, away from
   the cobbled path. Leave space between them and the Town Hall.
5. Click **Lumber Mill** and place it near the edge of the plateau too.
6. Under the units, click **Peasant** and place five Peasants close to the Town
   Hall.
7. Leave the cobbled path from the ramp to the square clear, and leave an open
   patch beside the Town Hall: the Village Captain stands there in chapter 5.
   Save the map with :kbd[Ctrl+S].
:::

::shot[The village plateau seen from above with the red Town Hall on the cobbled square, four Farms and a Lumber Mill around the edges, and five Peasants next to the Town Hall, with the cobbled path to the ramp clear]{src="./units-and-buildings/village-units.png"}

If a building will not go where you want it, a doodad from the last lesson is
probably in the way. Switch to the Doodads layer with :kbd[D], move the doodad,
and switch back with :kbd[U].

## Unit properties

Every placed unit has its own settings. Double-click the Town Hall to open its
**Unit Properties** dialog.
<!-- verify: double-clicking a placed unit opens a dialog titled Unit Properties -->

- **Player** is the owner. You can give a placed unit to another player here
  without deleting and placing it again.
- **Hit Points** and **Mana Points** are percentages of the unit's maximum. A
  unit can start the game wounded, which is handy in a story map.
- **Level** only matters for heroes. Other units get their level from their
  type.
- **Facing** is the direction the unit looks when the game starts, in
  degrees.
<!-- verify: the Unit Properties field labels in Reforged (Player, Hit Points %, Mana Points %, Level for heroes, and the facing field's label, Facing or Rotation) -->

::shot[The Unit Properties dialog for the Town Hall, owned by Player 1 (Red) with Hit Points at 100%]{src="./units-and-buildings/unit-properties.png"}

Leave everything as it is and click **Cancel**. The village starts at full
health.

The editor also gives every placed unit a name of its own, made from its type,
a four-digit number and the word `<gen>`, such as `Town Hall 0001 <gen>`.
`<gen>` means the editor generated the name. Triggers use this name when they
need one particular unit rather than any unit of a type, and in chapter 6 the
game is lost when `Town Hall 0001 <gen>` dies.
<!-- verify: the format of a placed unit's name in the Trigger Editor (Town Hall 0001 <gen>), whether numbering starts at 0000 or 0001, and whether doodads and destructibles placed earlier share the unit counter -->

You do not need to look the number up now. In chapter 6 you pick the Town
Hall by clicking it on the map, and the Trigger Editor shows its full name
then. If yours ends in a different number from `0001`, use your number
wherever the track says `Town Hall 0001 <gen>`.

:::caution[Keep the Town Hall]
A new Town Hall gets a new number. Once chapter 6 has a trigger that refers
to this one, deleting it and placing another leaves that trigger pointing at a
unit that no longer exists. Move the Town Hall if you need to, but do not
replace it.
:::

## Start location

A start location marks where a player begins. When the map starts, the game
centres each player's camera on their start location. In a melee game it also
decides where the melee setup puts the starting town hall and workers, but
Defend the Village has switched that off, so for this map it only sets where
the player looks first. Each player has one.
<!-- verify: each player can have only one start location, and placing another for the same player moves or replaces it -->

:::steps
1. With **Player 1 (Red)** selected in the player list, find **Start
   Location** in the palette. It appears with every race's buildings.
   <!-- verify: where Start Location appears in the Reforged Unit Palette -->
2. Click on open ground just south of the Town Hall, on the cobbled path, and
   the marker appears in red.
3. Save the map with :kbd[Ctrl+S], then choose :menu[File > Test Map], or press
   :kbd[Ctrl+F9].
4. When the game has loaded, the camera should be over the village. Click the
   Peasants and the buildings: they are yours. The gold and lumber counters
   show zero, because no melee setup gave you any.
5. Press :kbd[F10], choose **End Game**, then **Exit Program** to return to the
   editor.
:::

::shot[The terrain view on the village plateau with the red Player 1 start location marker on the cobbled path just south of the Town Hall]{src="./units-and-buildings/start-location.png"}

::shot[Warcraft III running Defend the Village in a Test Map game, with the camera starting over the village: the Town Hall, Farms, Lumber Mill and Peasants in red, and the gold and lumber counters at zero]{src="./units-and-buildings/village-test.png"}

The marker itself is invisible in the game. It only exists in the editor, as a
note for where the player starts. Chapter 4 gives the invaders a start location
of their own near the spawn.
