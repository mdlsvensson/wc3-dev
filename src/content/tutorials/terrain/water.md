---
title: Water and the river
summary: Carve a river across the map with deep water, and leave a shallow ford as the only crossing.
order: 3
minutes: 10
goals:
  - Add shallow and deep water
  - Shape a river that blocks the way
  - Leave a shallow ford as the only crossing
---

The village has high ground and a single ramp. Now give the invaders a second
obstacle before they even reach it: a river across the map, with one shallow
ford where the path crosses. Every wave will have to wade through that ford,
which gives the player one place to watch and one place to fight. In this
lesson you learn the two kinds of water, draw the river from edge to edge, and
turn one stretch of it into the ford.

## Shallow and deep water

Water is not a tile. It is painted with the cliff tools, because the editor
makes water by lowering the ground below the water line. Under **Apply
Cliff** in the Terrain Palette there are two water tools:

- **Shallow Water** makes water that ground units can wade through. It
  slows nobody down, but nothing can be built in it.
- **Deep Water** makes water that ground units cannot enter at all. Only
  flying units, ships and a few amphibious units can cross it.

You draw water the way you drew cliffs, so the tips from the last lesson apply
here too: use a square brush for straight banks, keep the shape simple, and
use :kbd[Ctrl+Z] freely.

::shot[The Apply Cliff group of the Terrain Palette with the pointer over the Deep Water tool, its tooltip showing, and the Shallow Water tool beside it]{src="./water/water-tools.png"}

## The river

The river runs from the north-west edge of the map to the south-east edge,
between the spawn and the village. It must reach both edges: if there is a
gap at either end, the invaders will simply walk around it. Picture the
three-by-three grid from the painting lesson again: the river runs from the
top-left square, through the middle square, to the bottom-right square,
crossing your dirt path in the middle of the map.

:::steps
1. Press :kbd[T] to open the Terrain Palette and select **Deep Water**.
2. Choose a medium square brush. The river should be about five or six tiles
   wide, enough to look like a proper river on the minimap.
3. Start at the north-west edge of the map. Click on the edge itself, in the
   dark border outside the playable area, so the river runs off the map.
   <!-- verify: the editor lets you paint cliffs and water in the border outside the playable area -->
4. Holding the button, drag diagonally towards the south-east. Pass through
   the middle of the map, where the path is, and keep well clear of the
   village plateau and its cliffs.
5. Carry on to the south-east edge and end the stroke in the dark border
   there too.
6. Look along the whole river on the minimap. Fill in any narrow spots or gaps
   with a few more strokes, so there is deep water all the way across.
7. Save the map with :kbd[Ctrl+S].
:::

::shot[The terrain view zoomed all the way out over the whole map, seen from above, with a deep river running from the north-west edge to the south-east edge through the middle of the map, cutting the dirt path between the spawn and the village]{src="./water/river.png"}

The river cuts straight through your dirt path for now. That is the spot for
the ford.

## The ford

The ford is a stretch of shallow water where the path meets the river. It is
the only place anything on foot can cross, so make it clearly visible and wide
enough that a wave does not jam up in it.

:::steps
1. Select **Shallow Water** and a medium square brush.
2. Zoom in on the spot where the dirt path runs into the river.
3. Click on the river where the path enters it and drag across to where the
   path leaves it on the far bank. The deep water there turns shallow.
4. Make the ford a little wider than the path, about five or six tiles, and
   make sure the shallow water reaches both banks. A single strip of deep
   water left in the middle would block the crossing completely.
5. Tilt the camera to check the ford from the side. You should see the path
   tiles through the shallow water, running from bank to bank.
6. Save the map.
:::

::shot[A close, tilted view of the ford: a stretch of shallow water across the deep river, with the dirt path visible through it and continuing on both banks]{src="./water/ford.png"}

:::tip[Why only one crossing]
One ford turns the whole map into a funnel. Every wave comes the same way, so
you can build Village Towers where they cover the ford and the ramp, and meet
the invaders there with your captain before they reach the Town Hall. With
two crossings, the player would have to split their defence and guess which
way each wave will come.
:::

In the last lesson of the chapter you check the whole route with the pathing
view, which shows exactly where units can and cannot walk.

## Water colour

The water colour comes from the tileset and suits Lordaeron Summer well, so
you can leave it. If you want a different shade, such as a murky green for a
marshy river, the Map Options dialog has a setting for it: open
:menu[Scenario > Map Options], tick **Water Tinting Color**, and pick a colour.
Chapter 4 looks at the rest of [the map options](/learn/map-setup/map-options/).
<!-- verify: Scenario > Map Options has a water tint setting, and its exact label (Water Tinting Color or Custom Water Tinting Color) and whether it is a checkbox with a colour picker -->

This track keeps the default colour.
