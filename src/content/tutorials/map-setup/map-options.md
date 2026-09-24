---
title: Description, options and loading screen
summary: Give the map its name, description and loading screen, and learn what the main map options do.
order: 1
minutes: 15
goals:
  - Set the map's name, description and suggested players
  - Write a loading screen
  - Know what the main map options do
---

Your map has terrain, a village, two creep camps and the regions the triggers
will need. To the game, though, it is still a nameless file: the game's map
list shows the editor's placeholder name, and the loading screen has nothing
to say. Players meet your map in that list and on that screen before they see
a single tile, so this lesson gives Defend the Village its name, a
description, and a loading screen that tells the player what to do. It also
looks at the map options, most of which you can leave alone.

All the settings in this chapter live in the :menu[Scenario] menu of the
main window. Open `DefendTheVillage.w3x` in the editor if it is not open
already.

## Name and description

The map's name is what the game shows in its map list and at the top of the
loading screen. It does not have to match the file name, so it can have
spaces and capital letters. The description appears next to the list when a
player selects the map, and it is the first thing they read, so keep it short
and say what the game is about.

A new map starts with the name "Just another Warcraft III map" and the
description "Nondescript".
<!-- verify: the default map name ("Just another Warcraft III map") and description ("Nondescript") of a new map in the Reforged editor -->

:::steps
1. Choose :menu[Scenario > Map Description]. The **Map Description** dialog
   opens.
2. In **Name**, replace the placeholder with `Defend the Village`.
3. In **Suggested Players**, type `1`. This is only a hint shown in the map
   list: the map is played by one person against the computer.
4. In **Description**, replace the placeholder with: `Hold the village
   against five waves of gnolls and ogres. Build towers, level your captain,
   and keep the town hall standing.`
5. In **Author**, type your own name.
   <!-- verify: the Map Description dialog's field labels in Reforged (Name, Suggested Players, Description, Author) -->
6. Click **OK**, then save the map with :kbd[Ctrl+S].
:::

::shot[The Map Description dialog with Defend the Village as the name, 1 as the suggested players, the full description typed in, and the author filled in]{src="./map-options/map-description.png"}

## Loading screen

The loading screen is on screen while the game loads the map, which can take
several seconds. That makes it a good place for the one thing a new player
needs to know before the map starts. Defend the Village uses it to explain
the goal: the waves, the towers and the captain's Shield Throw, which you make
in chapter 5.

:::steps
1. Choose :menu[Scenario > Map Loading Screen].
2. Leave the background on the default loading screen. The dialog can also
   use one of the game's campaign loading screens or an image you import, but
   the default suits this map.
   <!-- verify: the Map Loading Screen dialog's background choices in Reforged (default, a campaign screen, an imported file) and their labels -->
3. In **Title**, type `Defend the Village`.
4. In **Subtitle**, type `Hold the ford`.
5. In **Text**, type: `Waves of invaders cross the river every 45 seconds.
   Build Village Towers, and use the Captain's Shield Throw to stop them
   before they reach the town hall.`
   <!-- verify: the Map Loading Screen text field labels in Reforged (Title, Subtitle, Text) -->
6. Click **OK** and save the map.
:::

::shot[The Map Loading Screen dialog with the default background selected, Defend the Village as the title, Hold the ford as the subtitle, and the loading screen text typed in]{src="./map-options/loading-screen.png"}

The text mentions Village Towers and the Captain before they exist. That is
fine: nobody reads it until the map is finished, and by the end of chapter 6
every word of it is true.

## Map options

:menu[Scenario > Map Options] holds settings for the map as a whole. Open it
and look through the dialog, but you do not need to change anything: the
defaults suit Defend the Village. Two of the boxes near the top are worth
knowing:

- **Hide Minimap In Preview Screens** hides the minimap image that the game
  shows as the map's preview in the map list and the game lobby. Map
  makers tick it when the map has secrets they do not want to give away.
- **Masked Areas Are Partially Visible** changes the black mask that covers
  the parts of the map a player has not explored yet. Normally the mask hides
  the ground completely. With this ticked, the terrain shows faintly through
  it, so the player can see the lie of the land before exploring it.
<!-- verify: the Map Options flag labels in Reforged ("Hide Minimap In Preview Screens", "Masked Areas Are Partially Visible") and what each does -->

::shot[The Map Options dialog as a new map leaves it, with every option at its default]{src="./map-options/map-options.png"}

Further down are settings for the map's look and sound: weather that covers
the whole map, terrain fog, the lighting and sound environments, and the
**Water Tinting Color** that the water lesson in chapter 2 mentioned. They are
all optional, and this track keeps every one at its default.
<!-- verify: the Map Options dialog in Reforged includes global weather, terrain fog, custom light and sound environments, and the water tint -->

When you close the dialog, click **Cancel** if you only looked, or **OK** if
you changed something on purpose.

## The preview image

When a player selects a map in the game's list, a small preview image appears
next to the description. Unless you give the map an image of its own, the
preview is the map's minimap: the same overhead view as the minimap in the
editor. For Defend the Village the minimap already shows the river, the
plateau and the path, which is a fair picture of the map, so leave it.
<!-- verify: the map preview in the game's map list defaults to the minimap when no custom preview image is set -->

Now see the loading screen for yourself.

:::steps
1. Save the map, then choose :menu[File > Test Map], or press :kbd[Ctrl+F9].
2. Watch the loading screen as the game loads. It shows the title, the
   subtitle and your text over the default background.
   <!-- verify: how the Reforged loading screen lays out the title, subtitle and text for a custom map -->
3. When the game has loaded, the camera starts over the village as before.
   Press :kbd[F10], choose **End Game**, then **Exit Program** to return to
   the editor.
4. If you spot a typing mistake, fix it in the dialog and save again.
:::

::shot[Warcraft III loading Defend the Village in a Test Map game: the default loading screen with the title Defend the Village, the subtitle Hold the ford, and the loading screen text]{src="./map-options/loading-test.png"}

Test Map goes straight into the game, so it never shows the map list with
your name, description and preview. You see those in the game at the end of
the next lesson, together with the player slots you set up there.
