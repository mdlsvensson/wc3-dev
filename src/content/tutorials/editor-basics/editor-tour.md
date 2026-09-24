---
title: A tour of the editor
summary: Learn the parts of the main window, move the camera, and find the palettes and editors this track uses.
order: 2
minutes: 15
goals:
  - Name the parts of the main window
  - Move and zoom the camera around a map
  - Open the tool palettes and the other editors
---

The World Editor looks busy the first time you open it, but most of the window
is one big view of the map, and the rest is a handful of tools you will learn
one at a time. This lesson walks through the main window, shows you how to move
around a map, and points out where everything this track uses lives. Open the
editor as you did in the last lesson and follow along on the map it shows.
Nothing you do here matters: you create the real map in the next lesson.

## The main window

The main window is where you shape the map itself. The editor calls it the
Terrain Editor, even though you also place trees, units and regions in it.

::shot[The World Editor main window with an empty map open, with the menu bar, toolbar, terrain view, minimap, palette window and status bar each outlined and labelled]{src="./editor-tour/main-window.png"}

- **The menu bar** runs across the top. Every command in the editor is in one
  of its menus, and the track names them as :menu[File > New Map].
- **The toolbar** sits under the menu bar. Its buttons are shortcuts for the
  commands you use most: saving, undo, the tool palettes, the other editors
  and testing the map.
  <!-- verify: the Reforged toolbar has buttons for the palettes, the other editors (Module) and Test Map -->
- **The terrain view** fills most of the window. It shows the map in 3D, the
  way players will see it, and it is where you paint, raise and place things.
- **The minimap** is the small overhead map on the left. It shows the whole
  map at once, with a box marking the part the terrain view is showing.
- **The palette window** sits below the minimap. It holds the tools for the
  current layer: tiles to paint, trees to plant, units to place. It is a
  separate window, so you can drag it anywhere, even onto a second screen.
  <!-- verify: the default position of the minimap and the palette window in the Reforged editor (left side, palette below the minimap) -->
- **The status bar** runs along the bottom. It shows where the mouse pointer
  is on the map and details about what is under it, which helps when you need
  to put something in an exact spot.
  <!-- verify: what the status bar shows (pointer coordinates, terrain type, cliff level) -->

## Moving around

You will spend a lot of time moving the camera, so learn the controls now.
Try each one on the map in front of you.

:::steps
1. Click once in the terrain view so that it has keyboard focus, then hold
   the arrow keys. The view scrolls across the map. If the click paints the
   ground, press :kbd[Ctrl+Z] to undo it.
   <!-- verify: whether the view also scrolls when the pointer reaches its edge (edge scrolling), as it does in the game -->
2. Roll the mouse wheel over the terrain view. Rolling forward zooms in,
   rolling back zooms out.
3. Click anywhere on the minimap. The view jumps to that spot, which is the
   fastest way to cross a large map.
4. Hold :kbd[Ctrl] and drag with the right mouse button in the terrain view.
   The camera turns and tilts, so you can look at a hill or a cliff from the
   side.
   <!-- verify: Ctrl + right-drag rotates and tilts the editor camera -->
5. When the view is at an odd angle, choose :menu[View > Reset Camera] to go
   back to the normal top-down angle.
   <!-- verify: the menu name and any shortcut for resetting the editor camera -->
:::

::shot[The terrain view tilted to a low side angle after Ctrl + right-dragging, with the minimap's view box showing which part of the map is on screen]{src="./editor-tour/camera-tilt.png"}

If you ever lose track of where you are, zoom out and click the middle of the
minimap.

## Palettes and layers

A map is built in layers, and the editor works on one layer at a time. Each
layer has its own palette of tools, and switching layer opens that palette.
You switch with the :menu[Layer] menu, the toolbar, or a single key.

| Layer | Key | What it holds |
| --- | --- | --- |
| **Terrain** | :kbd[T] | Ground tiles, height, cliffs and water |
| **Doodads** | :kbd[D] | Trees, rocks, fences and other scenery |
| **Units** | :kbd[U] | Units, buildings, items and player start locations |
| **Regions** | :kbd[R] | Named rectangles that triggers use to find places on the map |
| **Cameras** | :kbd[C] | Saved camera positions, used for cinematics and fixed views |

Press each key in turn and watch the palette window change. The layer also
decides what a click in the terrain view does: on the Units layer you can
select and move units, but you cannot pick up a tree until you switch to
Doodads. When a click does nothing, check which layer you are on.

::shot[A composite of five captures of the palette window, one per layer, side by side: Terrain (T), Doodads (D), Units (U), Regions (R) and Cameras (C), each on the empty tour map]{src="./editor-tour/palettes.png"}

Chapter 2 uses the Terrain layer, and chapter 3 uses Doodads, Units and
Regions; later chapters come back to the Units layer. This track does not
use cameras.

## The other editors

The main window is one of several editors. The rest open in their own windows
from the :menu[Module] menu, and each has a function key.

- **Trigger Editor** (:kbd[F4]) holds the map's triggers: rules such as "when
  this timer ends, create these units". Triggers are built by picking from
  lists, with no programming.
- **Sound Editor** (:kbd[F5]) lets you browse and play the game's sounds and
  music, and pick the ones your triggers will play.
- **Object Editor** (:kbd[F6]) lists every unit, item, ability, upgrade and
  more, with all their values. You change existing ones and make new ones
  here.
- **Campaign Editor** (:kbd[F7]) bundles several maps into a campaign, the
  way the game's story is told.
- **AI Editor** (:kbd[F8]) builds the plans that computer players follow,
  such as when to expand and what to build.
- **Object Manager** (:kbd[F11]) lists everything used on the map, such as
  each unit type and how many are placed, and where it is used.
- **Asset Manager** (:kbd[F12]) is where you import your own files, such as
  custom models, icons and sounds, into the map.
<!-- verify: F12 is "Asset Manager" in the Reforged Module menu -->

::shot[The Module menu open in the main window, listing the other editors with their function keys]{src="./editor-tour/module-menu.png"}

This track uses two of them. You open the Trigger Editor briefly in the next
lesson and learn it properly in chapter 6, and chapter 5 is all about the
Object Editor. The others are there when you need them.
