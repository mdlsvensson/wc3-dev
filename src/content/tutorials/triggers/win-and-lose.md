---
title: Winning and losing
summary: End the game in defeat when the town hall falls, and in victory when the last wave is beaten.
order: 4
minutes: 15
goals:
  - React to a unit dying
  - Combine conditions on a variable and a unit group
  - End the game in victory or defeat
---

Five waves march on the village, but the game never ends: the player can
lose the Town Hall and carry on, or beat every wave and wait forever. In
this last lesson you write the two triggers that end it. `Defeat` ends the
game when the Town Hall falls, and `Victory` ends it when the fifth wave is
beaten. Then you play the whole map from start to finish.

## Defeat

The village is lost when the Town Hall dies: one particular unit, the one
you placed in chapter 3. You choose it by clicking it on the map, and the
editor fills in its name, such as `Town Hall 0001 <gen>`. If yours has a
different number, that is fine: the editor uses the right one.

:::steps
1. Select the **Defend the Village** category, press :kbd[Ctrl+T] and name the
   new trigger `Defeat`.
2. Press :kbd[Ctrl+E] and choose **Unit - Specific Unit Event**.
3. Click the unit in its line. In the dialog, click **Select Unit**. The
   editor switches to the main window: click the Town Hall. Back in the
   dialog, the unit is `Town Hall 0001 <gen>`, or your own number.
   <!-- verify: the unit parameter dialog has a button (label?) that switches to the main window to click a placed unit, and returns with its name -->
4. If the event in the line is not **Dies**, click it and choose **Dies**.
   The line reads `Unit - Town Hall 0001 <gen> Dies`. Click **OK**.
   <!-- verify: the default event of Unit - Specific Unit Event and its line format -->
5. Press :kbd[Ctrl+R] and choose **Game - Defeat**. Leave the player as
   **Player 1 (Red)**, click the message and type `The village has fallen.`
   Click **OK** until the dialog closes.
   <!-- verify: Game - Defeat's default line, "Game - Defeat Player 1 (Red) with the message: Defeat!" -->
:::

- Events
  - `Unit - Town Hall 0001 <gen> Dies`
- Conditions
- Actions
  - `Game - Defeat Player 1 (Red) with the message: The village has fallen.`

::shot[The Defeat trigger in the Trigger Editor, with the event Unit - Town Hall 0001 Dies and the action Game - Defeat Player 1 (Red) with the message: The village has fallen.]{src="./win-and-lose/defeat-trigger.png"}

This is why chapter 3 asked you to keep the Town Hall. If you ever delete it
and place a new one, open this event and select the new one.

## Victory

The player wins when the fifth wave has been sent and every invader is
dead. The last invader could be any unit, killed by a tower, the Captain or
a creep, so the trigger runs whenever a Player 12 unit dies, and its
conditions check whether that was the last one.

It needs two conditions, and both must be true:

- `WaveNumber` is 5. Without this, beating wave 1 before wave 2 arrives
  would already count as a win.
- Player 12 has no living units left. A dead unit stays on the map as a
  corpse for a while and still belongs to Player 12, so the condition counts
  only the units that are alive. The unit that has just died is not alive,
  so it is not counted either.
<!-- verify: units owned by a player include dead units until their corpses are removed, and a unit is no longer alive when its Dies event runs -->

:::steps
1. Add a trigger named `Victory` to the category.
2. Press :kbd[Ctrl+E] and choose **Unit - Player-Owned Unit Event**. Set the
   player to **Player 12 (Brown)** and the event to **Dies**. The line reads
   `Unit - A unit owned by Player 12 (Brown) Dies`.
3. Press :kbd[Ctrl+D] to add a condition and choose **Integer Comparison**.
   Set the first value to `WaveNumber`, leave **Equal to**, and set the
   second value to `5`.
4. Add a second **Integer Comparison**. Click its first value and choose the
   function **Count Units In Unit Group**.
   <!-- verify: the function is listed as "Unit Group - Count Units In Unit Group" and displays as "(Number of units in …)" -->
5. Click its unit group and choose **Units Owned By Player Matching
   Condition**. Set the player to **Player 12 (Brown)**.
6. Click the condition and choose **Boolean Comparison**. Click its first
   value, choose **Unit Is Alive**, and set the unit to **(Matching unit)**.
   Leave **Equal to** and **True**.
   <!-- verify: Boolean Comparison, Unit - Unit Is Alive and Event Response - Matching Unit, and how the nested condition displays -->
7. Leave the comparison as **Equal to**, set the second value to `0`, and
   click **OK**.
8. Press :kbd[Ctrl+R] and choose **Game - Victory**. Leave the player as
   **Player 1 (Red)** and the rest as it is.
   <!-- verify: Game - Victory's default line reads "Game - Victory Player 1 (Red) (Show dialogs, Show scores)" -->
9. Save the map with :kbd[Ctrl+S].
:::

- Events
  - `Unit - A unit owned by Player 12 (Brown) Dies`
- Conditions
  - `WaveNumber Equal to 5`
  - `(Number of units in (Units owned by Player 12 (Brown) matching (((Matching unit) is alive) Equal to True))) Equal to 0`
- Actions
  - `Game - Victory Player 1 (Red) (Show dialogs, Show scores)`

::shot[The Victory trigger in the Trigger Editor, with the event A unit owned by Player 12 (Brown) Dies, the two conditions WaveNumber Equal to 5 and the count of living Player 12 units Equal to 0, and the action Game - Victory Player 1 (Red)]{src="./win-and-lose/victory-trigger.png"}

**Matching unit** works like **Picked unit** in the last lesson: while the
game builds the group, it checks each of Player 12's units in turn, and
**Matching unit** is the one being checked.

## Play it through

Now play Defend the Village the way a player will: from the loading screen
to the end.

:::steps
1. Save the map, then choose :menu[File > Test Map], or press :kbd[Ctrl+F9].
2. Use the minute before the first wave. Have the Peasants build Village
   Towers at the top of the ramp, and take the Captain to clear the creep
   camps for experience and the Potion of Healing.
3. Hold the ford through all five waves. When the last invader dies, the
   victory dialog appears.
4. Test Map again, and this time let the waves through. When the Town Hall
   falls, the defeat dialog appears with "The village has fallen."
5. Leave the game from its dialog, or press :kbd[F10], and choose **Exit
   Program** to return to the editor.
   <!-- verify: the buttons of the victory and defeat dialogs in a Reforged Test Map game, and how to leave the game from them -->
:::

::shot[Warcraft III running Defend the Village in a Test Map game after the fifth wave, with Village Towers at the top of the ramp, the Captain beside them and the victory dialog on screen]{src="./win-and-lose/victory-in-game.png"}

If the game was too easy or too hard, tune it. Every number lives in one
place:

- **When the waves come**: the 60 seconds in `Setup` and the 45 seconds in
  `Spawn Wave`.
- **How big they are**: the `+ 3` in `Spawn Wave`'s **Unit - Create** action.
- **What they are**: the five `WaveUnitType` actions in `Setup`.
- **How much the player can build**: the gold and lumber in `Setup`, and the
  Village Tower's cost and damage in the Object Editor.

:::tip[Test faster]
While you balance the late waves, shorten the countdowns: set the 60 in
`Setup` to 10 and the 45 in `Spawn Wave` to 15, and the whole game takes a
couple of minutes. Remember to put them back before you share the map.
:::

## What you built

You started this track with an empty editor and finished it with a game. In
six chapters you:

1. Opened the World Editor and created `DefendTheVillage.w3x`, a 96 × 96
   Lordaeron Summer map.
2. Shaped its terrain: a village plateau with a single ramp, a river with one
   shallow ford, and a path from the spawn.
3. Placed the village, the creep camps and the doodads that dress them, and
   marked the Spawn and Village regions.
4. Named the map, gave it a loading screen, and set up the defender and the
   invaders in forces of their own.
5. Made the Village Captain, his Shield Throw, and the Village Tower in the
   Object Editor.
6. Wrote the triggers that greet the player, count down, send five waves,
   and decide who wins.

When you are ready for more, [where to go next](/learn/next/) shows where to keep learning,
find resources and share your map.

:::checkpoint
Defend the Village is a playable game. The player starts with 500 gold and
200 lumber and a countdown to the first wave. Five waves of gnolls and ogres,
one every 45 seconds after the first, spawn for Player 12 and attack-move on
the village through the ford. The game ends in defeat when the Town Hall
falls, and in victory when the fifth wave is destroyed.
:::
