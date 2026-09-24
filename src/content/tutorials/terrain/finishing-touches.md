---
title: Finishing touches
summary: Break up flat ground with tile variation, and check with the pathing view that units can walk from the spawn to the village.
order: 4
minutes: 10
goals:
  - Add variety to large areas of tiles
  - Read the ground pathing view
  - Check the route from the spawn to the village
---

The map now has everything the invaders' route needs: a path from the spawn,
a river with a ford, and a plateau with a ramp. This last lesson of the
chapter does two things. First it makes the ground look less like a
painting-by-numbers, by breaking up the big areas of plain grass. Then it
makes sure the route actually works: that a unit could walk all the way from
the spawn to the village, and that the ford is the only way across.

## Variation

A large field of a single tile looks flat and artificial from the game's
camera. Real ground has patches: darker grass where it is damp, bare earth
where people walk. The editor already helps a little: each tile you paint gets
a randomly chosen look, such as grass with or without small flowers, so a
field of one tile is not a perfect repeat.
<!-- verify: the editor picks a random variation of a ground tile as you paint it, so some grass tiles show extras such as flowers -->

The rest is up to you, and the trick is to paint with a mix of tiles in small,
loose patches.

:::steps
1. Press :kbd[T] to open the Terrain Palette and select **Dark Grass**.
2. Choose a medium circle brush. Dab irregular patches of dark grass across
   the open fields, especially around the hills from the last lesson. Leave
   plenty of the lighter grass between them.
3. Select **Grassy Dirt** and a small brush. Add a few scattered patches, and
   a thin fringe along the edges of the dirt path where feet have worn the
   grass away.
4. Along the river banks, blend the grass into the water with a few dabs of
   **Dirt** or **Grassy Dirt**, so the banks look muddy rather than neatly
   cut.
5. Keep the village clearing on the plateau as plain grass, so the village
   stands out as tidy, cared-for ground.
6. Save the map with :kbd[Ctrl+S].
:::

::shot[The open grass west of the river after adding variation, showing irregular patches of Dark Grass and Grassy Dirt and a worn fringe along the dirt path]{src="./finishing-touches/variation.png"}

Zoom out now and then as you work. Patches that look busy up close often look
just right from the game's camera height, and the doodads you add in the next
chapter will cover some of the ground as well.

## The pathing view

The terrain view shows what the map looks like. The pathing view shows where
units can go. Choose :menu[View > Pathing - Ground], or press :kbd[P], to turn
it on. Choose it again to turn it off.
<!-- verify: the menu name View > Pathing - Ground and the shortcut P in Reforged -->

The view colours ground by what can happen there. One colour, pink or
magenta, marks ground that ground units cannot walk on; ground with no colour
is open. You should see that colour in strips along every cliff wall and over
all the deep water in the river. Ground that units can walk on but cannot
build on, such as the ramp and the shallow ford, may show in a second colour,
usually blue: that is not a blockage. The hills show nothing: height never
blocks movement, only cliffs, deep water and objects do.
<!-- verify: the colour Pathing - Ground uses for unwalkable ground (pink/magenta), and whether walkable but unbuildable ground (shallow water, ramps) shows blue -->

::shot[The terrain view with Pathing - Ground turned on, showing the unwalkable cliff edges of the village plateau and the deep river coloured, and the ramp and the ford free of the unwalkable colour]{src="./finishing-touches/pathing-view.png"}

When you place trees and buildings in the next chapter, they show in the
pathing view too. It is worth turning it on whenever you change something
near the route.

## Check the route

Now walk the route the way an invader will, with the pathing view on. You are
looking for any place where the coloured, unwalkable ground cuts across the
path, and for any way across the river other than the ford.

:::steps
1. Turn on the pathing view with :kbd[P].
2. Start at the south-west corner, where the path begins, and follow the path
   north-east to the river. It should be clear all the way.
3. At the river, check the ford. There should be an unbroken strip free of the
   unwalkable colour from one bank to the other. If a line of the unwalkable
   colour runs across it, a strip of deep
   water is left: paint over it with **Shallow Water**.
4. Follow the path on to the plateau. Check the ramp: its whole slope should
   be clear, with no band of the unwalkable colour at the top or bottom. If
   it is blocked, straighten that stretch of cliff with **Level** and make the
   ramp again.
5. Go up the ramp and along the cobbled path to the centre of the village.
6. Now check the river from end to end. The coloured deep water should reach
   both edges of the map with no gap in the unwalkable colour anywhere except the ford. Fill any
   gap with **Deep Water**.
7. Check the plateau's cliff all the way round. The only gap in the unwalkable
   colour along it should be the ramp.
8. Turn the pathing view off and save the map.
:::

::shot[A close view of the ford with Pathing - Ground on: the deep river coloured on both sides and an unbroken strip of shallow water, free of the unwalkable colour, where the dirt path crosses]{src="./finishing-touches/route-check.png"}

## Test the terrain

There are no units on the map yet, so you cannot walk the route in the game.
You can still see the terrain the way a player will, and that often shows
things the editor hides, such as a cliff piece that looks odd from the
game's camera.

:::steps
1. Save the map, then choose :menu[File > Test Map], or press :kbd[Ctrl+F9].
2. When the game has loaded, click the bottom-left of the minimap to jump to
   the spawn corner.
3. Scroll along the path with the arrow keys. Look at the ford: the water
   should look shallow, with the path visible through it. Look at the river
   banks and check that the river reaches the dark border at both ends.
4. Scroll up to the village. Check that the cliff walls look clean from this
   angle and that the ramp reads clearly as the way up.
5. Press :kbd[F10], choose **End Game**, then **Exit Program** to return to
   the editor. Fix anything that looked wrong, and save.
:::

::shot[Warcraft III running Defend the Village in a Test Map game, with the camera over the ford: the deep river, the shallow crossing and the dirt path leading towards the village plateau]{src="./finishing-touches/terrain-test.png"}

In chapter 6 the invaders walk this route for real, and you will see waves
of gnolls and ogres wade through the ford and climb the ramp.

:::checkpoint
Your map has a village clearing on a plateau with one ramp, a river with a
single ford, and a walkable path from the spawn in the south-west to the
village.
:::
