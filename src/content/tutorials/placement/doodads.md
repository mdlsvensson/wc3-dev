---
title: Doodads and the village
summary: Place trees, fences, crates and other doodads to turn the plateau into a village and frame the map.
order: 1
minutes: 15
goals:
  - Place, rotate and scale doodads
  - Tell doodads and destructibles apart
  - Dress the village and frame the map with trees
---

The terrain is finished: a village plateau with one ramp, a river with a single
ford, and a path from the spawn. It is still bare ground, though. This chapter
fills the map with the things that stand on it: scenery, the village and its
people, creeps to fight, and the named areas the triggers will use. You start
with doodads, the editor's word for scenery such as trees, rocks, fences and
barrels. They make the plateau look lived in and give the map its edges. Open
`DefendTheVillage.w3x` and follow along.

## The Doodad Palette

Press :kbd[D], or choose :menu[Layer > Doodads], to switch to the Doodads
layer. The palette window now lists scenery instead of tiles.

At the top of the palette are two lists that filter what it shows. The first
picks a tileset, and starts on your map's tileset, Lordaeron Summer, so you see
scenery that suits your ground. The second picks a category, such as
**Trees/Destructibles**, **Environment**, **Props** or **Structures**. Below
them is the list of doodads in that category.
<!-- verify: the Doodad Palette has two filter lists (tileset, then category) and the tileset list starts on the map's tileset -->

::shot[The Doodad Palette with the Lordaeron Summer tileset and the Trees/Destructibles category selected, showing the list of trees and destructibles for the tileset]{src="./doodads/doodad-palette.png"}

Take a minute to look through the categories. You can place scenery from any
tileset on any map, but mixing tilesets is easy to overdo: a desert cactus
looks odd in Lordaeron. This lesson uses only Lordaeron Summer doodads.

## Place, rotate and scale

Placing a doodad works like painting a tile: pick it in the palette, then click
in the terrain view. Try it on open ground away from the village first, and
delete what you place when you are done.

:::steps
1. In the category list, choose **Trees/Destructibles**, then click
   **Barrel** in the list. The pointer shows the barrel, ready to place.
2. Click in the terrain view. A barrel appears. Click again to place another:
   the palette keeps the doodad selected until you choose something else.
3. Press :kbd[Esc] to stop placing. The pointer goes back to selecting.
   <!-- verify: Esc (or a right-click) stops placing and returns the pointer to selection mode in the Doodads layer -->
4. Click a barrel to select it, then drag it to move it. Drag a box around
   empty ground to select several doodads at once.
5. Double-click a barrel. The **Doodad Properties** dialog opens.
6. Change **Rotation** to turn the barrel, and change **Scale** to make it
   bigger or smaller. Click **OK** to see the result.
   <!-- verify: double-clicking a destructible such as a barrel opens a dialog titled Doodad Properties (or Destructible Properties), and its fields in Reforged: Variation, Rotation (in degrees), Scale (X, Y, Z), and Life for destructibles -->
7. Select the barrels you placed and press :kbd[Delete] to remove them.
:::

::shot[The Doodad Properties dialog for a placed barrel, with the Variation, Rotation and Scale fields visible and Rotation changed to 45]{src="./doodads/doodad-properties.png"}

Many doodads come in several variations: different shapes of the same tree or
rock. The editor picks one at random each time you place them, which is why a
row of trees never looks like a copy of one tree. You can choose a specific
variation in the properties dialog with **Variation**.
<!-- verify: trees and other doodads with several variations get a random one when placed, and the Variation field picks a specific one -->

Keep scaling gentle. A crate at 1.2 times its size looks natural; one at three
times its size looks like a mistake, and a very large doodad can hide units
behind it.

## Doodads and destructibles

The palette mixes two kinds of object, and the difference matters in the
game.

- **Destructibles** have hit points. Units can attack them and destroy them,
  and some drop items when they break. Trees are destructibles: Peasants cut
  them for lumber, and a line of trees is a wall until someone chops through
  it. Crates and barrels are destructibles too.
- **Doodads** are pure scenery. They cannot be attacked or selected in the
  game, and nothing a player does can remove them.

Both kinds can block movement. A tree or a fence has a footprint that units
cannot walk through, while a patch of flowers is only for looks. The
pathing view you used in the last chapter, :kbd[P], shows which is which:
anything that blocks units shows in the unwalkable colour.

:::note
The Object Editor keeps destructibles and doodads on separate tabs, which is
where you would change a tree's hit points or a fence's footprint. Chapter 5
tours it; this map does not need to change either.
:::

## Dress the village

A few well-placed objects make the plateau read as a village. Keep them in
small groups near the plateau's edges and beside the cobbled path, and leave
plenty of open ground: the next lesson puts the Town Hall on the cobbled
square with four Farms and a Lumber Mill around it, and the invaders need to
be able to walk from the ramp to the Town Hall.

:::steps
1. Zoom in on the village plateau.
2. From **Props** or **Structures**, place a **Fence** along parts of the
   plateau's edge, leaving the top of the ramp clear. Rotate each piece in
   its properties so the fence follows the edge.
3. From **Trees/Destructibles**, place a few **Crates** and **Barrel**
   doodads in small groups near where the buildings will stand. From
   **Props**, place one or two **Lamp Post** doodads along the cobbled path.
   <!-- verify: the Lordaeron Summer names and categories: Barrel and Crates (destructibles, Trees/Destructibles), Fence (Props or Structures), Lamp Post (Props, or only in the Village tileset) -->
4. Keep the cobbled path, the cobbled square and the ramp free of anything
   that blocks units. Turn on the pathing view with :kbd[P] and check that
   the way from the ramp to the square is free of the unwalkable colour.
   Turn it off again.
5. Save the map with :kbd[Ctrl+S].
:::

::shot[The village plateau with fences along parts of its edge, small groups of crates and barrels, and lamp posts beside the cobbled path, with the ramp and the cobbled square left clear]{src="./doodads/village-doodads.png"}

Now frame the map with trees. The band of rough dirt around the edges is where
they go, and the forest west of the river becomes the home of a gnoll camp in
the lesson after next.

:::steps
1. Choose **Trees/Destructibles** in the category list and click **Summer Tree
   Wall**, the tree of Lordaeron Summer.
2. Plant trees along the rough dirt band on all four edges. Click once per
   tree, or hold the mouse button and drag to plant a row as you go. Place
   them close together, so the edge looks like a wall of forest.
   <!-- verify: holding the mouse button and dragging places trees continuously; and whether the editor refuses to place a tree that overlaps another -->
3. Where the river runs off the map, leave the water clear.
4. West of the river, in the middle square of the left-hand column of your
   three-by-three grid, plant a forest that joins the tree line on the west
   edge. Keep it well north of the dirt path, and leave a small clearing in
   the middle of it, a few tiles across: the gnoll camp goes there.
5. Turn on the pathing view with :kbd[P] and check once more that no tree
   stands on the path from the spawn to the ford. Turn it off and save.
:::

::shot[The terrain view zoomed all the way out over the whole map, seen from above, with trees along all four edges, a forest west of the river with a small clearing in it, and the dirt path from the south-west corner still clear]{src="./doodads/tree-line.png"}
