---
title: Install and open the World Editor
summary: Find the World Editor that comes with Warcraft III, open it, and learn where your maps are saved.
order: 1
minutes: 10
goals:
  - Launch the World Editor that comes with Warcraft III
  - Know how the game's graphics mode affects the editor
  - Find the folder where your maps are saved
---

The World Editor is the map-making tool that comes with Warcraft III. Blizzard
built the game's own campaigns and melee maps with it, and almost every custom
map you have played started in it too. Over this track you use it to build one small
map from scratch: Defend the Village, where the player holds a village on a
plateau against five waves of gnolls and ogres. By the end you will have shaped
terrain, placed a village, made your own hero, ability and tower, and written
the triggers that turn it all into a game. This first lesson gets the editor
open and shows you where your work is kept.

## What you need

You need Warcraft III: Reforged installed through the Battle.net app. The World
Editor is installed with the game, so there is nothing extra to download or buy.
You do not need to know any programming: everything in this track is done by
clicking, choosing from lists and filling in fields.

The editor runs on Windows and macOS. The track shows Windows paths and
Windows names such as File Explorer. On a Mac the differences are small: the
Battle.net app offers **Show in Finder** instead of **Show in Explorer**, the
editor is an app called `World Editor` in the same `_retail_/x86_64` folder,
and you press :kbd[Cmd] where the track says :kbd[Ctrl].
<!-- verify: on macOS, the editor is World Editor.app in _retail_/x86_64 of the game folder, and editor shortcuts use Cmd in place of Ctrl -->

## Launch the World Editor

The Battle.net app has no button that starts the editor, so you open it from
the game folder. The app can take you straight there.
<!-- verify: the Battle.net app has no direct "launch World Editor" option for Warcraft III: Reforged -->

:::steps
1. Open the Battle.net app and select **Warcraft III** in the list of games.
2. Click the gear icon next to the **Play** button to open the game's options
   menu, then choose **Show in Explorer**. A File Explorer window opens on the
   game folder, which is `C:\Program Files (x86)\Warcraft III` unless you chose
   another location when you installed the game.
3. Open the `_retail_` folder, then the `x86_64` folder inside it.
4. Double-click `World Editor.exe`. The editor takes a little while to load the
   first time. When it is ready, its main window opens with an empty map.
   <!-- verify: what the editor shows on first launch (an empty default map, or no map at all) -->
:::

::shot[The Battle.net app on the Warcraft III page, with the options menu next to the Play button open and Show in Explorer highlighted]{src="./install-and-open/battle-net-options.png"}

::shot[File Explorer in the game's _retail_\x86_64 folder, with World Editor.exe selected]{src="./install-and-open/editor-exe.png"}

You will open the editor often, so give it a shortcut. In File Explorer,
right-click `World Editor.exe` and choose **Pin to Start**, or, while the
editor is running, right-click its taskbar icon and choose **Pin to taskbar**.
On Windows 11 you may need **Show more options** in the right-click menu to
see **Pin to Start**.

## Graphics mode

Warcraft III: Reforged can draw the game with its new Reforged graphics or
with the original Classic graphics. The editor has no switch of its own: it
uses whatever mode the game is set to.
<!-- verify: the World Editor has no graphics-mode setting or launch option of its own and always follows the game's setting -->
You change it in the game, not in the editor.

:::steps
1. Start Warcraft III from the Battle.net app.
2. Open **Options** from the main menu and find the **Graphics Mode** setting,
   which you can set to **Reforged** or **Classic**.
   <!-- verify: the location and label of the graphics mode setting in the game's Options (tab name, "Graphics Mode", values Reforged/Classic) -->
3. Apply the change and restart the game. Close the editor and open it again
   so that it picks up the new mode.
   <!-- verify: whether the game and the World Editor both need a restart after changing the graphics mode -->
:::

::shot[The Warcraft III Options screen with the Graphics Mode setting visible, set to Reforged]{src="./install-and-open/graphics-setting.png"}

The mode only changes how the editor draws the map on your screen. The
terrain, units and triggers are the same in both, and players see your map in
the mode their own game uses.
<!-- verify: whether a map can be limited to Classic or Reforged graphics (Map Options, w3i "supported modes") -->
The screenshots in this track use Reforged graphics. If your computer
struggles with the editor, Classic graphics load faster and use less memory,
and everything in the track works the same way.

## Where maps are saved

Warcraft III keeps your maps in your Documents folder, in
`Documents\Warcraft III\Maps`. The game lists every map in this folder when
you start a custom game, and the editor's save dialog opens here, so this is
where your own maps belong.
<!-- verify: the editor's Save Map As dialog opens in Documents\Warcraft III\Maps by default -->

Inside it you will find a few folders the game manages for you. The one to know
about is `Download`: when you join someone else's game online, their map is
saved there. Keep your own maps out of it, and do not edit the maps in it, so
you never mix up your work with other people's.

Make a folder of your own for the maps you build. You will save Defend the
Village there in the last lesson of this chapter.

:::steps
1. In File Explorer, open `Documents\Warcraft III\Maps`.
2. Right-click an empty space in the folder and choose **New > Folder**.
3. Name the new folder `My Maps`.
:::

::shot[File Explorer showing Documents\Warcraft III\Maps, with the Download folder and a new My Maps folder]{src="./install-and-open/maps-folder.png"}

If Windows backs up your Documents folder to OneDrive, the path starts in your
OneDrive folder instead, such as `OneDrive\Documents\Warcraft III\Maps`. On a
Mac, the game keeps its maps in `~/Library/Application Support/Blizzard/Warcraft III/Maps`.
<!-- verify: the macOS Reforged user maps folder path -->

:::tip[Back up before big changes]
A map is a single file, so a backup is one copy away. Before a big change, such
as reshaping the terrain or deleting triggers, copy `DefendTheVillage.w3x` and
add the date to the copy's name. If the change goes wrong, you can open the
copy and carry on from there.
:::
