---
title: Events, conditions and actions
summary: Open the Trigger Editor, see how triggers work, and show a welcome message when the map starts.
order: 1
minutes: 15
goals:
  - Find your way around the Trigger Editor
  - Explain events, conditions and actions
  - Write and test a first trigger
---

Your map has a village, a hero, towers and an enemy player, but nothing
happens when it starts. Rules are made with triggers, built by picking from
lists, with no programming. In this chapter you write the triggers that turn
Defend the Village into a game: a countdown, five waves of invaders, and a
way to win and to lose. This lesson shows you around the Trigger Editor,
explains how a trigger is put together, clears out the melee setup, and ends
with a first trigger that greets the player.

## The Trigger Editor

Open the Trigger Editor with :menu[Module > Trigger Editor], or press
:kbd[F4]. You met it briefly in chapter 1, when you switched off the melee
setup.

::shot[The Trigger Editor for Defend the Village, with the trigger list on the left showing the Initialization category open and the disabled Melee Initialization trigger selected, and its events and actions on the right]{src="./trigger-basics/trigger-editor.png"}

- **The trigger list** on the left is a tree. At the top is the map itself.
  Below it are categories, which are folders that keep triggers in order, and
  inside them the triggers. A new map has one category, **Initialization**,
  holding `Melee Initialization`. Its icon still shows that you disabled it.
  <!-- verify: the top entry of the Reforged trigger list is the map itself (its name), above the categories -->
- **The trigger itself** fills the right-hand side when you select a trigger.
  At the top are a box for your own comments and the **Enabled** and
  **Initially On** boxes from chapter 1. Below them, the trigger's contents
  are shown as a small tree of their own, with three parts: **Events**,
  **Conditions** and **Actions**.
  <!-- verify: the layout of the right-hand pane in the Reforged Trigger Editor (comment box, Enabled, Initially On, then the Events, Conditions and Actions tree) -->

Triggers are saved with the map, like everything else in the editor. Press
:kbd[Ctrl+S] from the Trigger Editor as usual.

## Events, conditions and actions

Every trigger answers three questions: when, whether, and what. Take a rule
from the end of this chapter, "when a unit dies, if it is the town hall, the
player loses":

- **Events** say when the trigger runs: "when a unit dies". An event is
  something that happens in the game, such as a unit dying, a timer running
  out or the map starting. A trigger can have several events, and any one of
  them starts it.
- **Conditions** say whether it goes on: "if it is the town hall". Each time
  an event starts the trigger, the game checks the conditions. If every one of
  them is true, the actions run; if any is false, the trigger stops there. A
  trigger with no conditions always goes on.
- **Actions** say what it does: "the player loses". Actions run one after
  another, from top to bottom.

The editor shows each of these as a line that reads almost like a sentence,
such as `Unit - A unit owned by Player 12 (Brown) Dies`. The word before the
dash is its category in the editor's lists: **Unit**, **Game**, **Time** and
so on. You pick a line from a list, then click each part you want to
change, such as the player. This track writes every line exactly as the
editor shows it, so you can compare your trigger with the lesson.

## The melee setup

Now that you know how a trigger is built, look at the one every new map
starts with. Select `Melee Initialization` in the list.

Its only event is **Map initialization**, which happens once, while the map
is loading and before the game begins. Its actions set up a standard melee
game:

- `Melee Game - Use melee time of day (for all players)` starts the game in
  the morning.
- `Melee Game - Limit Heroes to 1 per Hero-type (for all players)` stops a
  player from training the same hero twice.
- `Melee Game - Give trained Heroes a Scroll of Town Portal (for all
  players)` gives each player's first hero a Scroll of Town Portal.
- `Melee Game - Set starting resources (for all players)` gives every player
  their starting gold and lumber.
- `Melee Game - Remove creeps and critters from used start locations (for all
  players)` clears creeps away from the players' bases.
- `Melee Game - Create starting units (for all players)` places each race's
  town hall and workers at every start location.
- `Melee Game - Run melee AI scripts (for computer players)` starts the AI
  that plays for computer players.
- `Melee Game - Enforce victory/defeat conditions (for all players)` ends the
  game for a player who loses all their buildings.
<!-- verify: the actions of a new map's Melee Initialization trigger in Reforged, their order and their exact display text -->

Every one of these is something Defend the Village does its own way, or not
at all. You kept the trigger disabled so far; now you can delete it.

:::steps
1. Right-click `Melee Initialization` in the list and choose **Delete**. If
   the editor asks you to confirm, click **Yes**.
   <!-- verify: the trigger list's right-click menu has Delete, and whether deleting a trigger asks for confirmation -->
2. The **Initialization** category is now empty. Right-click it and choose
   **Delete** as well.
3. Save the map with :kbd[Ctrl+S].
:::

::shot[The Trigger Editor with the Melee Initialization trigger selected and its eight Melee Game actions listed on the right, and the right-click menu open on the trigger with Delete highlighted]{src="./trigger-basics/melee-initialization.png"}

:::note[No melee rules]
Without `Melee Initialization`, nothing in the map gives players resources or
ends the game. That is why Player 12 has no AI and why chapter 5 needed a cheat
for gold. The triggers in this chapter take over each job: the next lesson
gives the player their gold, and the last one decides who wins.
:::

## A first trigger

Your first trigger shows a message when the game starts. You might expect it
to use **Map initialization**, as the melee setup did, but that runs while
the loading screen is still up, and a message shown then is gone before the
player can read it. Instead, the trigger uses an event from the **Time**
category: **Elapsed Game Time**, set to 0 seconds, which happens the moment
the game begins.
<!-- verify: text displayed by a trigger with the Map initialization event does not appear in the game, while an Elapsed game time is 0.00 seconds event shows it -->

Every trigger you write goes in a category of its own, so start with that.

:::steps
1. Right-click the map at the top of the trigger list and choose **New
   Category**, or press :kbd[Ctrl+G]. Type `Defend the Village` as its name
   and press :kbd[Enter].
2. With the new category selected, right-click it and choose **New
   Trigger**, or press :kbd[Ctrl+T]. A trigger appears inside the category,
   with its name ready to edit. Type `Welcome` and press :kbd[Enter].
   <!-- verify: the Trigger Editor shortcuts in Reforged: Ctrl+G New Category, Ctrl+T New Trigger, Ctrl+E New Event, Ctrl+R New Action, Ctrl+D New Condition, and the right-click menu labels -->
3. With `Welcome` selected, press :kbd[Ctrl+E] to add an event. A dialog
   opens with a list of events. Choose **Time - Elapsed Game Time**.
4. The line in the dialog reads `Time - Elapsed game time is 5.00 seconds`.
   Click the number, set it to `0`, and click **OK** twice.
   <!-- verify: the default value of the Elapsed Game Time event (5.00 seconds) and that clicking a value in the dialog's line opens a dialog to change it -->
5. Press :kbd[Ctrl+R] to add an action. Choose **Game - Text Message
   (Auto-Timed)**. Its line reads `Game - Display to (All players) the text:
   Text`.
   <!-- verify: the action is listed as "Game - Text Message (Auto-Timed)" and its default line reads "Game - Display to (All players) the text: Text" -->
6. Leave **(All players)** as it is. Click **Text**, type `Defend the
   village! The first wave arrives soon.` and click **OK** twice.
:::

::shot[The Trigger Editor with the new Defend the Village category in the trigger list and the Welcome trigger inside it, selected, with no events or actions yet]{src="./trigger-basics/new-trigger.png"}

The finished trigger looks like this in the editor:

- Events
  - `Time - Elapsed game time is 0.00 seconds`
- Conditions
- Actions
  - `Game - Display to (All players) the text: Defend the village! The first wave arrives soon.`

::shot[The Welcome trigger selected in the Trigger Editor, with the Elapsed game time is 0.00 seconds event and the Display to (All players) action showing the welcome text]{src="./trigger-basics/welcome-trigger.png"}

If a line is wrong, double-click it to open its dialog again. Now test it:

:::steps
1. Save the map with :kbd[Ctrl+S], then choose :menu[File > Test Map], or
   press :kbd[Ctrl+F9].
   <!-- verify: File > Test Map and Ctrl+F9 work from the Trigger Editor window -->
2. As soon as the game starts, the message appears on the left of the screen,
   above the interface, and fades after a few seconds.
   <!-- verify: where Game - Text Message (Auto-Timed) messages appear on screen in Reforged -->
3. Press :kbd[F10], choose **End Game**, then **Exit Program** to return to
   the editor.
:::

::shot[Warcraft III running Defend the Village in a Test Map game over the village, with the message "Defend the village! The first wave arrives soon." on screen]{src="./trigger-basics/welcome-message.png"}

The message promises a wave. The next lesson starts the countdown to it.
