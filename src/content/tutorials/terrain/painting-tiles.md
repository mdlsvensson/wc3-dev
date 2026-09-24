---
title: Painting tiles
summary: Use the Terrain Palette to paint grass, dirt and stone, and lay out the village clearing and its path.
order: 1
minutes: 10
goals:
  - Paint ground tiles with different brush sizes and shapes
  - Change which tiles your map's tileset offers
  - Lay out the village clearing and the path to it
---

Your map is a flat field of grass. Over this chapter you turn it into the
ground Defend the Village is played on: a village on a raised plateau, a river
with a single ford, and a path the invaders follow from their spawn to the
village. You start with the ground's surface. Painting tiles changes only how
the ground looks, not its shape, so it is the safest place to begin: you can
repaint anything as often as you like. Open the editor, choose
:menu[File > Open Map], and open `DefendTheVillage.w3x` from your `My Maps`
folder.

## The Terrain Palette

Every change to the ground in this chapter is made with the Terrain Palette.
Press :kbd[T], or choose :menu[Layer > Terrain], to switch to the Terrain
layer. The palette window shows its tools in four groups:

- **Apply Texture** holds a button for each ground tile the map can use: the
  tiles you paint with.
- **Apply Cliff** holds the tools for cliffs and water, which you use in the
  next two lessons.
- **Apply Height** holds the tools that raise and lower the ground in smooth
  hills.
- **Brush** sets the size and shape of the area each click changes.
<!-- verify: the Terrain Palette's group names in Reforged (Apply Texture, Apply Cliff, Apply Height, Brush, or separate Brush Size and Brush Shape groups) -->

::shot[The Terrain Palette for the Lordaeron Summer tileset, with the Apply Texture, Apply Cliff, Apply Height and Brush groups visible and the Grass tile selected]{src="./painting-tiles/terrain-palette.png"}

Hold the pointer over any button to see its name. In the terrain view, the
pointer now shows the outline of the brush, so you can see what a click will
change before you make it.

## Painting

Try the brush in a corner of the map first. Everything you paint here gets
painted over in the last section, so experiment freely.

:::steps
1. Under **Apply Texture**, click the **Dirt** tile.
2. Under **Brush**, choose a small size and the **Circle** shape.
   <!-- verify: the Brush group offers size buttons from small to large and two shapes named Circle and Square -->
3. Click once in the terrain view. A small patch of dirt appears, blended
   softly into the grass around it.
4. Hold the left mouse button and drag. The brush paints wherever the pointer
   goes, like a pen.
5. Choose a larger size and the **Square** shape, and drag again. A square
   brush gives straight edges; a round one gives soft, natural shapes.
6. Press :kbd[Ctrl+Z], or choose :menu[Edit > Undo], to take back the last
   stroke. Press it again to go further back.
:::

::shot[The terrain view with a winding dirt stroke painted with a small circle brush next to a wide straight stroke painted with a large square brush, and the brush outline visible under the pointer]{src="./painting-tiles/painting.png"}

Tiles are painted on a grid, and the editor blends each tile into its
neighbours, so a single click never gives a hard square edge. Small brushes
are for detail, such as the edge of a path. Large brushes are for covering
ground quickly. Keep your eye on the minimap as you paint: it shows the tiles
too, which helps with the overall shape.

## Choosing tiles

Each tileset comes with a limited set of tiles, chosen to look good together.
You can swap tiles in from other tilesets with the Modify Tileset dialog. The
village will look more like a village with a cobbled square in its middle, and
Lordaeron Summer has no cobblestones, so borrow the **Cobble Path** tile from
the Village tileset.

:::steps
1. Choose :menu[Scenario > Modify Tileset]. The dialog lists the tiles your
   map uses now, and next to it the tiles of every tileset in the game.
   <!-- verify: the menu path Scenario > Modify Tileset in Reforged -->
2. In the list of all tiles, find the **Village** tileset and select its
   **Cobble Path** tile.
3. Click **Add Tile** to add it to your map's tiles, then click **OK**.
   <!-- verify: the Modify Tileset dialog's layout and button labels for adding a tile and confirming, and whether a "use custom tileset" option must be ticked first -->
4. Check the Terrain Palette: **Cobble Path** now has its own button under
   **Apply Texture**.
:::

::shot[The Modify Tileset dialog with the map's current Lordaeron Summer tiles on one side and the Village tileset's Cobble Path tile selected, ready to add]{src="./painting-tiles/modify-tileset.png"}

A map can only use a limited number of tiles, 16 in total, so add only the
tiles you will use. If you reach the limit, remove a tile you do not need
before you add another. Removing a tile that is already painted on the map
replaces it with another tile, so check the map afterwards.
<!-- verify: what happens to painted ground when its tile is removed from the tileset -->

## Lay out the village

Now paint the real layout. The whole map is grass, which suits most of it.
You add three things: rough ground along the edges, the village clearing in
the north-east, and the dirt path the invaders will follow. To find your way,
picture the minimap cut into a three-by-three grid of squares. The village
goes in the top-right square and the spawn in the bottom-left one.

:::steps
1. Select **Rough Dirt** and a large square brush. Paint a band a few tiles
   wide all the way around the map, just inside the dark border at its
   edges. Trees will stand here in the next chapter, framing the map.
2. The village clearing fills most of the top-right square of the grid: a
   block of grass about 24 tiles across, from the rough dirt band on the
   north and east edges in towards the middle of the map. Leave it as plain
   grass, with no rough dirt inside it, so the clearing reads as open, tidy
   ground. This is where the Town Hall, Farms and towers will stand.
3. Select **Dirt** and a medium circle brush. Starting in the bottom-left
   corner, a little way in from the edge, paint a path about three or four
   tiles wide towards the village. Let it bend a little, but keep it heading
   north-east through the middle of the map. The middle is where the river
   will cross it in the water lesson.
4. Bring the path up to the clearing's south edge from the south, ending a
   few tiles east of its south-west corner. The ramp up into the village will
   be built there in the next lesson, and a ramp needs a straight stretch of
   edge, not a corner.
5. Select **Cobble Path** and a small brush. Continue the path from there to
   the clearing's centre as cobbles, and paint a small
   cobbled square there, around the spot where the Town Hall will stand.
6. Save the map with :kbd[Ctrl+S].
:::

::shot[The terrain view zoomed all the way out over the whole map, seen from above, after painting: a rough dirt band around the edges, a grass clearing in the north-east with a cobbled path to its centre, and a dirt path running from the south-west corner up to the clearing's south edge, just east of its south-west corner]{src="./painting-tiles/village-layout.png"}

Do not worry about getting the shapes perfect. The next lessons raise the
clearing onto a cliff and cut a river through the path, and you can touch up
the tiles at any time.

:::tip[Paint the edges of the path last]
A path with perfectly smooth edges looks painted on. When the shape is right,
go along its edges with a small brush and a few dabs of **Rough Dirt** or
**Grassy Dirt**, so it fades into the grass the way a worn track does.
:::
