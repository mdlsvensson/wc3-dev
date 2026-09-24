---
title: Variables and a wave timer
summary: Store the wave number and each wave's unit type in variables, and count down to the first wave in a timer window.
order: 2
minutes: 20
goals:
  - Create variables, including an array
  - Set up the map when it starts
  - Start a timer and show it in a timer window
---

The waves need a clock, and the triggers need a memory. Which wave comes
next? What kind of unit is in it? How long until it arrives? In this lesson
you create variables to hold those answers, and a `Setup` trigger that
fills them in when the game starts. It also gives the player the gold and
lumber the melee setup used to give, and starts a countdown to the first
wave in a window the player can see.

## Variables

A variable is a named box that holds one value. A trigger can put a value in
the box and later triggers can read it back, which is how triggers share
information. Each variable has a type, and holds only values of that type: an
Integer holds a whole number, a Unit-Type holds a kind of unit, such as
Gnoll.

An array is a variable with a numbered row of boxes instead of one. You write
the number, called the index, in square brackets: `WaveUnitType[1]` is the
first wave's unit type, `WaveUnitType[2]` the second's. Because the index can
come from another variable, one action can reach a different box each time
it runs, and that is exactly what the waves need.

Defend the Village uses four variables:

| Name | Type | Holds |
| --- | --- | --- |
| `WaveNumber` | Integer, starting at 0 | The number of the last wave sent |
| `WaveUnitType` | Unit-Type array, size 5 | The unit type of each of the five waves |
| `WaveTimer` | Timer | The countdown to the next wave |
| `WaveWindow` | Timer Window | The window that shows that countdown |

:::steps
1. Select the **Defend the Village** category and press :kbd[Ctrl+B] to add
   a variable. It appears in the trigger list, and its settings fill the
   right-hand side.
   <!-- verify: in the Reforged Trigger Editor Ctrl+B (New Variable) adds a variable to the trigger list with its settings on the right; older editors opened a Variables dialog with a New Variable button (fields Variable Name, Variable Type, Array, Size, Initial Value) -->
2. Name it `WaveNumber`, choose **Integer** as its type, and leave its
   initial value at `0`.
3. Press :kbd[Ctrl+B] again. Name it `WaveUnitType` and choose
   **Unit-Type**. Tick **Array** and set **Size** to `5`.
4. Add `WaveTimer`, of type **Timer**. Its initial value is a new timer,
   ready to be started, so leave it.
   <!-- verify: the label a Timer variable's initial value shows (New Timer or similar) -->
5. Add `WaveWindow`, of type **Timer Window**.
:::

::shot[The trigger list with WaveNumber, WaveUnitType, WaveTimer and WaveWindow in the Defend the Village category, and WaveUnitType's settings (Unit-Type, Array, Size 5) on the right]{src="./wave-timer/variable-editor.png"}

Type the names exactly, capital letters and all: the lessons that follow
refer to them.

## The Setup trigger

`Setup` runs when the game starts, like `Welcome`, and prepares everything
the other triggers need. It uses the same event as `Welcome`, because the
timer window it creates at the end is something the player has to see.

The five waves grow from gnolls to ogres. The first actions store each
wave's unit type in its own box of `WaveUnitType`. The array's boxes are
numbered from 0, but the map leaves box 0 empty so that wave 1 uses box 1.

:::steps
1. Select the **Defend the Village** category and press :kbd[Ctrl+T] to
   add a trigger. Name it `Setup`.
2. Press :kbd[Ctrl+E], choose **Time - Elapsed Game Time**, set the time
   to `0`, and click **OK** twice.
3. Press :kbd[Ctrl+R] and choose **Set Variable**. Its line reads `Set
   Variable = Value`.
4. Click **Variable** and choose `WaveUnitType`. An index appears after it:
   click **Index** and type `1`.
5. Click **Value**. In the unit list, choose **Neutral Hostile**, then
   **Gnoll**. Click **OK** until the dialog closes. The line reads
   `Set WaveUnitType[1] = Gnoll`.
   <!-- verify: how the unit-type value dialog lists units (by race, with a Neutral Hostile group containing the creeps) -->
6. Add four more **Set Variable** actions in the same way:
   `WaveUnitType[2]` to **Gnoll Poacher**, `WaveUnitType[3]` to **Gnoll
   Brute**, `WaveUnitType[4]` to **Ogre Warrior**, and `WaveUnitType[5]` to
   **Ogre Mauler**.
7. Press :kbd[Ctrl+R] and choose **Player - Set Property**. Its line reads
   `Player - Set Player 1 (Red) Current gold to 0`. Click the **0** and set
   it to `500`.
   <!-- verify: the Player - Set Property action's default line reads "Player - Set Player 1 (Red) Current gold to 0" -->
8. Add a second **Player - Set Property** action. Click **Current gold** and
   choose **Current lumber**, then set the amount to `200`.
:::

::shot[The Setup trigger in the Trigger Editor with the Elapsed game time is 0.00 seconds event and the actions setting WaveUnitType 1 to 5 to Gnoll, Gnoll Poacher, Gnoll Brute, Ogre Warrior and Ogre Mauler, then Player 1's gold to 500 and lumber to 200]{src="./wave-timer/setup-actions.png"}

To save clicks, you can copy an action: select it, press :kbd[Ctrl+C] and
:kbd[Ctrl+V], and change the copy. `WaveNumber` needs no action, because it
already starts at 0.

## Start the countdown

A timer counts down and, when it reaches zero, it expires: an event other
triggers can wait for. A timer can repeat, starting again each time it
expires, or run once, as a one-shot. `WaveTimer` is a one-shot: the next
lesson restarts it after each wave, with a shorter time, and simply stops
restarting it after the fifth.

A timer on its own is invisible. A timer window is the small box in the
corner of the screen that shows a timer's title and the time left, so the
player knows when to expect the next wave.

:::steps
1. With `Setup` selected, press :kbd[Ctrl+R] and choose **Countdown Timer -
   Start Timer**.
2. In its line, click the timer and choose the variable `WaveTimer`. Leave
   **One-shot**, and set the time to `60`. The line reads `Countdown Timer -
   Start WaveTimer as a One-shot timer that will expire in 60.00 seconds`.
   <!-- verify: Start Timer's defaults: (Last started timer), One-shot, 30.00 seconds -->
3. Add **Countdown Timer - Create Timer Window**. Set its timer to
   `WaveTimer` and its title to `Next wave`.
4. Add **Set Variable**. Set the variable to `WaveWindow`, then click
   **Value** and, from the list of functions, choose **Last Created Timer
   Window**.
5. Save the map with :kbd[Ctrl+S].
:::

The finished trigger looks like this:

- Events
  - `Time - Elapsed game time is 0.00 seconds`
- Conditions
- Actions
  - `Set WaveUnitType[1] = Gnoll`
  - `Set WaveUnitType[2] = Gnoll Poacher`
  - `Set WaveUnitType[3] = Gnoll Brute`
  - `Set WaveUnitType[4] = Ogre Warrior`
  - `Set WaveUnitType[5] = Ogre Mauler`
  - `Player - Set Player 1 (Red) Current gold to 500`
  - `Player - Set Player 1 (Red) Current lumber to 200`
  - `Countdown Timer - Start WaveTimer as a One-shot timer that will expire in 60.00 seconds`
  - `Countdown Timer - Create a timer window for WaveTimer with title Next wave`
  - `Set WaveWindow = (Last created timer window)`

::shot[The last three actions of the Setup trigger: Start WaveTimer as a One-shot timer that will expire in 60.00 seconds, Create a timer window for WaveTimer with title Next wave, and Set WaveWindow = (Last created timer window)]{src="./wave-timer/timer-actions.png"}

The window shows itself as soon as it is created. Storing it in `WaveWindow`
lets a later trigger reach it again: after the last wave, the next lesson
hides it.

## Test

:::steps
1. Save the map, then choose :menu[File > Test Map], or press
   :kbd[Ctrl+F9].
2. When the game starts, the welcome message appears, and the gold and
   lumber counters show 500 and 200. You no longer need the `greedisgood`
   cheat from chapter 5.
3. A timer window titled **Next wave** counts down from 1:00.
   <!-- verify: how the timer window shows the time left (1:00) -->
4. Let it reach zero. Nothing happens yet: nothing is waiting for the timer
   to expire. The window stays at 0:00.
5. Press :kbd[F10], choose **End Game**, then **Exit Program** to return to
   the editor.
:::

::shot[Warcraft III running Defend the Village in a Test Map game over the village, with the gold counter at 500, the lumber counter at 200, and the Next wave timer window counting down]{src="./wave-timer/timer-window.png"}

If the timer window does not appear, check that `Setup` has the **Elapsed
Game Time** event and that the timer window uses `WaveTimer`, the same timer
the first action starts.
