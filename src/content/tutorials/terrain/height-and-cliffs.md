---
title: Height, cliffs and ramps
summary: Shape gentle hills, raise the village onto a cliff plateau, and connect it to the path with a ramp.
order: 2
minutes: 15
goals:
  - Raise, lower and smooth the ground
  - Build cliffs at different levels
  - Join cliff levels with a ramp
---

Your map has its tiles, but it is still perfectly flat. Warcraft III gives
ground two kinds of shape. Height makes smooth hills and hollows that units
walk straight over: it is there for looks. Cliffs make sharp steps that units
cannot climb: they change how the map is played. In this lesson you add a
few gentle hills, then raise the village clearing you painted onto a cliff
plateau, and give it a single ramp so there is one way in.

## Raise and lower

The height tools are under **Apply Height** in the Terrain Palette. Each one
works on the ground under the brush for as long as you hold the mouse button,
so short clicks make small changes.

- **Raise** lifts the ground; **Lower** sinks it.
- **Plateau** flattens the ground to the height of the spot where you first
  click, which is useful for levelling a patch on a slope.
- **Ripple** makes waves in the ground, and **Noise** makes it randomly
  bumpy.
- **Smooth** evens out sharp bumps and dents into soft slopes.
<!-- verify: the Apply Height tool names in Reforged: Raise, Lower, Plateau, Ripple, Noise, Smooth -->

Hills make the open ground look natural, but keep them away from the places
where the plateau, the river and the path will go. Hills there make cliffs and
water harder to shape, and a path looks best on fairly level ground.

:::steps
1. Press :kbd[T] to open the Terrain Palette, if it is not already open.
2. Under **Apply Height**, select **Raise** and choose a large circle brush.
3. In the open grass, away from the path and the village clearing, click a
   few times to raise a low hill. Short clicks are enough: a hill only a
   little taller than a unit looks right from the game's camera.
4. Add two or three more hills around the map, in the corners the path does
   not cross.
5. Select **Smooth** and drag it over each hill to round it off.
6. If a hill came out too tall, use **Lower** on it, or press :kbd[Ctrl+Z].
:::

::shot[The Apply Height group of the Terrain Palette with Raise selected, next to the terrain view tilted to the side to show a gentle, smoothed hill in the open grass]{src="./height-and-cliffs/height-tools.png"}

The editor's top-down view makes hills hard to judge. Tilt the camera with
:kbd[Ctrl] and a right-drag, as you did in the tour, to see them from the side.

## Cliffs

Cliffs divide the ground into levels, like the floors of a building. Where
two levels meet, the editor draws a cliff wall. Ground units cannot walk up
or down a cliff; they must use a ramp. Units on low ground also cannot see up
onto higher ground, while units on top can see down. That makes high ground a
strong place to defend, which is why the village sits on a plateau.
<!-- verify: units on a lower cliff level cannot see onto a higher cliff level without another source of vision -->

The cliff tools are under **Apply Cliff**:

- **Raise** makes the ground under the brush one level higher than the spot
  where you first click, and **Lower** makes it one level lower.
- **Level** sets the ground under the brush to the level of the spot where
  you first click, which is how you flatten out mistakes.
- **Ramp** turns a stretch of cliff into a slope. You use it at the end of
  this lesson.
- **Shallow Water** and **Deep Water** are covered in the next lesson.
<!-- verify: the Apply Cliff tool names (Raise, Lower, Level, Ramp, Shallow Water, Deep Water) and that Raise/Lower work one level up/down from the level where you first click -->

Next to the tools are the tileset's cliff types. Lordaeron Summer has two:
**Grass Cliff**, a wall with grass along its top edge, and **Dirt Cliff**, a
bare earth wall. The one you select is used for the cliffs you draw.
<!-- verify: how the cliff type is chosen in the Apply Cliff group, and that Lordaeron Summer's cliff types are Grass Cliff and Dirt Cliff -->

::shot[The Apply Cliff group of the Terrain Palette with its tools and the Grass Cliff and Dirt Cliff types visible]{src="./height-and-cliffs/cliff-tools.png"}

## The village plateau

Cliffs look best with simple outlines: long straight edges and plain corners.
Every little notch or single-tile bump becomes an awkward piece of wall, and
some shapes the editor cannot draw at all. So raise the clearing as one
simple block, one level up.

:::steps
1. Under **Apply Cliff**, select the **Grass Cliff** type and the **Raise**
   tool.
2. Choose a large square brush. A square brush gives straight edges.
3. Click inside the village clearing and, holding the button, drag across the
   whole clearing. Because every stroke is measured from where you first
   clicked, the whole area rises by the same single level, however many times
   the brush passes over it.
4. Tilt the camera and look at the edges. Where a corner has a notch or a
   lone raised tile, use **Level**: click on the plateau and drag over the
   stray bit to add it to the plateau, or click on the low ground and drag to
   remove it.
5. Check that the south edge runs straight for several tiles near the
   south-west corner, where the dirt path arrives. The ramp goes there.
6. Save the map with :kbd[Ctrl+S].
:::

::shot[The terrain view tilted to show the village clearing raised one cliff level in the north-east, with a straight grass cliff edge along its south side and the dirt path arriving at its south-west corner]{src="./height-and-cliffs/plateau.png"}

Raising a cliff can repaint the tiles along its edges to match the cliff type.
If the cobbled path or the grass near the edge has changed, touch it up with
the tile brush as in the last lesson.
<!-- verify: whether raising a cliff repaints the ground tiles along the cliff edge -->

## Ramps

A ramp is the one way units can move between cliff levels. The village gets
exactly one, so every invader has to come up the same slope. Place it at the
plateau's south-west corner, on the straight south edge, so it leads down
towards the path and the spawn.

The editor only builds ramps on straight stretches of cliff that run north to
south or east to west, one level high. It cannot make a ramp on a corner or a
diagonal edge, which is why the plateau's edge needed to be straight there.
<!-- verify: ramps can only be made on straight north–south or east–west cliff edges with a one-level height difference -->

:::steps
1. Under **Apply Cliff**, select the **Ramp** tool.
2. Choose a small brush.
3. Hold the pointer over the straight part of the south edge where the dirt
   path meets it, so that the brush sits on the cliff wall, and click. The
   wall there turns into a slope.
   <!-- verify: how the Ramp tool is applied (single click on the cliff edge, brush size) and how wide the resulting ramp is -->
4. Tilt the camera and check the ramp. If you want it wider, click again right
   next to it along the same edge. Two or three tiles wide is plenty.
5. If nothing happens when you click, the edge under the brush is not
   straight or not exactly one level high. Straighten it with **Level** and try
   again.
6. Paint the dirt path up the ramp and join it to the cobbled path at the top.
   Save the map.
:::

::shot[The terrain view tilted to show the ramp on the south edge of the village plateau near its south-west corner, with the dirt path running up it to the cobbled path on top]{src="./height-and-cliffs/ramp.png"}

:::note
Nothing stops you making more ramps later, but each one is another way into
the village. This map is designed around one.
:::
