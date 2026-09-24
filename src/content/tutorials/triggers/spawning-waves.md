---
title: Spawning waves
summary: Spawn each wave at the Spawn region when the timer expires, and send it to attack the village.
order: 3
minutes: 20
goals:
  - React to a timer expiring
  - Create units for a player at a region
  - Order a group of units to attack-move
---

The countdown runs, but when it ends, nothing comes. In this lesson you
write `Spawn Wave`, the trigger that makes the map a game. Each time
`WaveTimer` expires, it counts the wave, creates it for the invaders at the
Spawn region, announces it, and sends it across the ford to the village.
Then it starts the timer again, until five waves have come.

## When the timer expires

Spawn Wave has one event: `WaveTimer` expiring, first after Setup's 60
seconds and then after each 45-second countdown this trigger starts.

:::steps
1. Select the **Defend the Village** category, press :kbd[Ctrl+T] and name
   the new trigger `Spawn Wave`.
2. Press :kbd[Ctrl+E] and choose **Time - Timer Expires**. Its line reads
   `Time - (Last started timer) expires`.
   <!-- verify: the Time - Timer Expires event's default timer parameter (Last started timer) -->
3. Click the timer and choose the variable `WaveTimer`. The line reads
   `Time - WaveTimer expires`. Click **OK**.
:::

::shot[The Spawn Wave trigger in the Defend the Village category, with its event Time - WaveTimer expires and no actions yet]{src="./spawning-waves/spawn-event.png"}

## Create the wave

The first action adds one to `WaveNumber`, so that it holds the number of
the wave being sent. The wave has `WaveNumber + 3` units, so the first wave has
four and the fifth has eight, and its unit type is the box of `WaveUnitType`
with the wave's number.

:::steps
1. Press :kbd[Ctrl+R] and choose **Set Variable**. Set the variable to
   `WaveNumber`.
2. Click **Value** and choose the function **Arithmetic**. Set its first
   value to the variable `WaveNumber`, leave the operator at **+**, and set
   the second value to `1`. The line reads `Set WaveNumber = (WaveNumber +
   1)`.
   <!-- verify: Arithmetic is listed as a function for integer values and its default operator is + -->
3. Add the action **Unit - Create Units Facing Angle**. Its line reads
   `Unit - Create 1 Footman for Player 1 (Red) at (Center of (Playable map
   area)) facing Default building facing degrees`.
   <!-- verify: the default line of Unit - Create Units Facing Angle, including its default facing (Default building facing) -->
4. Click **1** and choose **Arithmetic** again: `WaveNumber` **+** `3`.
5. Click **Footman** and choose the variable `WaveUnitType`. Click its
   index and choose the variable `WaveNumber`.
6. Click **Player 1 (Red)** and choose **Player 12 (Brown)**.
7. Click **(Playable map area)** and choose `Spawn <gen>` from the list of
   regions. The editor keeps **Center of** around it.
   <!-- verify: the region parameter inside Center of offers the map's regions by name (Spawn <gen>) as presets -->
8. Leave the facing as it is and click **OK**.
:::

::shot[The Spawn Wave trigger with the actions Set WaveNumber = (WaveNumber + 1) and Unit - Create (WaveNumber + 3) units of the WaveUnitType entry for WaveNumber, for Player 12 (Brown) at the centre of the Spawn region facing Default building facing degrees]{src="./spawning-waves/create-units-action.png"}

Next, announce the wave. The message joins three pieces: `Wave `, the
number, and ` is coming!`. **Convert Integer To String** turns the number
into text, and **Concatenate Strings** joins two pieces of text.

:::steps
1. Add the action **Game - Text Message (Auto-Timed)** and click **Text**.
2. Choose the function **Concatenate Strings**.
3. Click its first part and choose **Concatenate Strings** again. In this
   inner join, set the first part to `Wave ` with a space after it. For the
   second part, choose **Convert Integer To String** and set its value to the
   variable `WaveNumber`.
4. Set the outer join's second part to ` is coming!`, with a space before
   it. Click **OK** until the dialog closes.
:::

In the editor the text shows as `((Wave  + (String(WaveNumber))) +  is
coming!)`, with your spaces doubling up; in the game it reads "Wave 1 is
coming!".
<!-- verify: how Concatenate Strings and Convert Integer To String display in a line: (A + B) and (String(WaveNumber)) -->

## Send it to the village

Player 12 has no AI, so the new units stand at the spawn until something
gives them an order. The order is attack-move: walk to a place and attack
every enemy met on the way. Attack-moving to the centre of the Village
region takes the wave along the path, through the ford and up the ramp.

**Unit Group - Pick Every Unit In Unit Group And Do Action** runs one
action for each unit in a group, and inside it **Picked unit** means the
unit whose turn it is. The group here is every unit Player 12 owns, so
survivors of earlier waves get the order too.

:::steps
1. Add the action **Unit Group - Pick Every Unit In Unit Group And Do
   Action**.
2. Click the unit group and choose the function **Units Owned By Player**,
   then set its player to **Player 12 (Brown)**.
   <!-- verify: the function is listed as "Units Owned By Player" and displays as "(Units owned by Player 12 (Brown))" -->
3. Click the action part and choose **Unit - Issue Order Targeting A
   Point**.
4. Leave the unit as **(Picked unit)**. Click the order and choose
   **Attack-Move To**.
   <!-- verify: Issue Order Targeting A Point's unit parameter defaults to (Picked unit) inside Pick Every Unit, and its order list includes Attack-Move To -->
5. Click the point and make it the centre of `Village <gen>`: choose the
   function **Center Of Region** if the point is not already one, then
   choose `Village <gen>` as its region. Click **OK** until the dialog
   closes.
   <!-- verify: the function name "Center Of Region" and the default point of Issue Order Targeting A Point -->
:::

::shot[The Pick every unit in (Units owned by Player 12 (Brown)) action in the Spawn Wave trigger, ordering (Picked unit) to Attack-Move To the centre of the Village region]{src="./spawning-waves/attack-move-action.png"}

## The next wave

Last, the trigger restarts the timer, but only if another wave is to come;
after the fifth, it hides the timer window instead. A choice like this is
made with **If / Then / Else, Multiple Functions**: an action with
conditions of its own, whose **Then** actions run if they are true and
whose **Else** actions run if not.

:::steps
1. Add the action **If / Then / Else, Multiple Functions**. It appears with
   three parts below it: **If - Conditions**, **Then - Actions** and **Else -
   Actions**.
   <!-- verify: the If / Then / Else, Multiple Functions action's name and the labels of its three parts in Reforged -->
2. Right-click **If - Conditions** and choose **New Condition**. Choose
   **Integer Comparison**, set the first value to `WaveNumber`, the operator
   to **Less than**, and the second value to `5`.
3. Right-click **Then - Actions**, choose **New Action**, and add
   **Countdown Timer - Start Timer**: `WaveTimer`, **One-shot**, `45`
   seconds.
4. Right-click **Else - Actions** and add **Countdown Timer - Show/Hide Timer
   Window**, set to hide `WaveWindow`.
   <!-- verify: the action's name "Countdown Timer - Show/Hide Timer Window" and its line "Countdown Timer - Hide WaveWindow" -->
5. Save the map with :kbd[Ctrl+S].
:::

The finished trigger:

- Events
  - `Time - WaveTimer expires`
- Conditions
- Actions
  - `Set WaveNumber = (WaveNumber + 1)`
  - `Unit - Create (WaveNumber + 3) WaveUnitType[WaveNumber] for Player 12 (Brown) at (Center of Spawn <gen>) facing Default building facing degrees`
  - `Game - Display to (All players) the text: ((Wave  + (String(WaveNumber))) +  is coming!)`
  - `Unit Group - Pick every unit in (Units owned by Player 12 (Brown)) and do (Unit - Order (Picked unit) to Attack-Move To (Center of Village <gen>))`
  - `If (All Conditions are True) then do (Then Actions) else do (Else Actions)`
    - If - Conditions
      - `WaveNumber Less than 5`
    - Then - Actions
      - `Countdown Timer - Start WaveTimer as a One-shot timer that will expire in 45.00 seconds`
    - Else - Actions
      - `Countdown Timer - Hide WaveWindow`

:::note[Leaks]
Some GUI functions make something new each time they run: `Center of Spawn
<gen>` makes a point and `Units owned by Player 12 (Brown)` makes a unit
group, and nothing cleans them up. Modders call that a leak. Five waves leak
a handful, which is harmless, but a map that leaks every second for an hour
slows down. [Hive Workshop](https://www.hiveworkshop.com/) has guides on
cleaning up leaks for when it matters.
:::

Now watch the waves come.

:::steps
1. Save the map, then choose :menu[File > Test Map], or press :kbd[Ctrl+F9].
2. When the timer window reaches zero, "Wave 1 is coming!" appears and four
   Gnolls appear at the spawn in brown. They walk along the path, wade
   through the ford and head up the ramp.
3. Build a Village Tower or two at the top of the ramp, and meet the wave
   with the Captain.
4. Every 45 seconds another wave comes, one unit bigger each time. After
   wave 5, the timer window disappears.
5. Press :kbd[F10], choose **End Game**, then **Exit Program** to return to
   the editor.
:::

::shot[Warcraft III running Defend the Village in a Test Map game, with the first wave of four brown Gnolls wading through the ford towards the village, the message "Wave 1 is coming!" on screen and the Next wave timer window counting down again]{src="./spawning-waves/wave-in-game.png"}

The waves keep coming, but no one can win or lose yet. The last lesson adds
both.
