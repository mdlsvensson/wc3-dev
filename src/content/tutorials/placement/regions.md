---
title: Regions
summary: Mark the Spawn and Village areas with regions, ready for the triggers in chapter 6.
order: 4
minutes: 10
goals:
  - Create, move and resize regions
  - Name regions so triggers can find them
  - Place the Spawn and Village regions
---

Everything the player sees is now on the map. This last lesson of the chapter
adds two things the player never sees: regions. A region is a named rectangle
on the map. It does nothing by itself, but triggers use regions to find
places: "create the wave at the spawn", "send it to the village". In chapter 6
the waves appear in a region called `Spawn` and march on a region called
`Village`, so you mark both now.

## The Region Palette

Press :kbd[R], or choose :menu[Layer > Regions], to switch to the Regions
layer. The palette window lists the map's regions, which is empty for now.
Regions are drawn straight into the terrain view, as coloured rectangles over
the ground.
<!-- verify: the Region Palette in Reforged shows a list of the map's regions -->

Practise on open ground first.

:::steps
1. In the terrain view, press the left mouse button on open ground and drag
   diagonally. A rectangle follows the pointer. Release the button, and the
   region appears with a name such as `Region 000`.
   <!-- verify: regions are drawn by dragging in the terrain view with the Regions layer active, and new regions are named Region 000, Region 001 and so on -->
2. Click inside the region to select it, then drag it to move it.
3. Drag one of its edges or corners to resize it.
   <!-- verify: a selected region is resized by dragging its edges or corners -->
4. With the region selected, press :kbd[Delete] to remove it.
:::

::shot[The Region Palette next to the terrain view, with a newly drawn practice region selected on open grass and its name, Region 000, shown on it]{src="./regions/region-palette.png"}

Regions snap to a grid as you draw them, so their edges will not always land
exactly under the pointer. That is fine: triggers use a region's area or its
centre, and a little either way makes no difference.
<!-- verify: region edges snap to a grid when drawn, moved or resized -->

## Spawn

The Spawn region is where each wave appears, at the south-west end of the dirt
path. The waves are created at its centre, so what matters is that the centre
sits on the path, on open ground.

:::steps
1. Click the bottom-left of the minimap to jump to the spawn corner.
2. Find where the dirt path begins, a little way in from the edge. Make sure
   you are inside the playable area, not in the dark border.
3. Drag a region over the start of the path, about four tiles on each side,
   with the path running through its middle. Keep it clear of the trees along
   the edge.
4. Double-click the region to open its **Region Properties**. Type `Spawn` in
   **Name** and click **OK**.
   <!-- verify: double-clicking a region opens a Region Properties dialog with a Name field -->
5. Save the map with :kbd[Ctrl+S].
:::

::shot[The terrain view over the south-west corner of the map, with the Spawn region drawn over the start of the dirt path, clear of the tree line along the edges]{src="./regions/spawn-region.png"}

The waves in chapter 6 grow to eight units, so the ground around the centre
of the region should be open. If you see a tree or a crate there, move it.

## Village

The Village region is where the waves are sent. They are ordered to
attack-move to its centre: walk there, and fight anything they meet on the
way. With the region centred on the Town Hall, every wave marches straight up
the ramp and into the heart of the village.

:::steps
1. Jump to the village plateau with the minimap.
2. Drag a region over the Town Hall, a little larger than the building, with
   the Town Hall in its middle.
3. Double-click the region, type `Village` in **Name**, and click **OK**.
4. Save the map.
:::

::shot[The terrain view over the village plateau, with the Village region drawn around the Town Hall and the Town Hall in its middle]{src="./regions/village-region.png"}

You do not need to cover the whole village. The region only has to mark the
spot the waves head for.

## Naming and colour

Region Properties has more settings than a name. **Color** sets the colour
the editor draws the region in, which helps when many regions overlap: try
red for Spawn and green for Village. Players never see it. There are also
settings for a weather effect, such as rain, and an ambient sound that plays
inside the region. This map does not use them, but they are a quick way to
add mood to a map later.
<!-- verify: the Region Properties fields in Reforged: Name, Color, Weather Effect and Ambient Sound -->

::shot[The Region Properties dialog for the Spawn region, with Spawn typed as the name and a red colour chosen, and the weather and ambient sound settings left off]{src="./regions/region-properties.png"}

Names matter more. When a trigger asks for a region, the Trigger Editor lists
each one by its name followed by `<gen>`, the same way it lists the Town Hall.
Chapter 6 uses `Spawn <gen>` and `Village <gen>`. Type the names exactly, with
a capital letter and no spaces, and give every region its own name. You can
rename a region at any time, and triggers that already use it follow the new
name.
<!-- verify: renaming a region updates the triggers that refer to it -->

:::checkpoint
Trees frame your map, and fences, crates and lamp posts dress the village.
The village has a Town Hall, four Farms, a Lumber Mill and five Peasants for
Player 1, with Player 1's start location beside them. A gnoll camp in the
western forest and a murloc camp on the river bank sit away from the wave
route, and the Gnoll Poacher drops a Potion of Healing. The Spawn and Village
regions are ready for the triggers.
:::
