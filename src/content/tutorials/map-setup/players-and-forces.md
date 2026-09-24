---
title: Players and forces
summary: Set up the human defender and the computer invader, put them in forces, and fix the player settings.
order: 2
minutes: 15
goals:
  - Set each player slot's controller, race and name
  - Group players into forces
  - Lock player settings for a custom map
---

So far the map has two owners: Player 1 (Red), who owns the village, and
Neutral Hostile, who owns the creeps. The waves need an owner too. In
chapter 6 the triggers create every wave for Player 12 (Brown), a player
that exists only to be the enemy. In this lesson you set up both players:
the person defending the village and the computer that owns the invaders.
You put them in forces of their own, on opposite sides, and lock these
settings so that nobody can change them before the game starts.

## The invaders' start location

Start with a start location for Player 12. The editor counts a player slot
as part of the map only when it has a start location, so Player 12 needs one
before it can take part. Doing this first means Player 12 is ready in the
dialogs that follow.
<!-- verify: the editor only includes a player slot in the map (and lists it as usable in Player Properties and Force Properties) when it has a start location -->

The marker goes near the Spawn region, where the waves appear. It only marks
the spot: it is invisible in the game, and the invaders' units come from the
triggers, not from the marker. Keep it off the path and out of the region, so
that you never grab it by mistake when you select the Spawn region later.

:::steps
1. Press :kbd[U] to switch to the Units layer.
2. Open the player list at the top of the palette and choose **Player 12
   (Brown)**.
3. Click the bottom-left of the minimap to jump to the spawn corner.
4. Find **Start Location** in the palette, where you found it for Player 1.
5. Click on open ground a few tiles north of the Spawn region, off the dirt
   path and outside the region. Keep it inside the playable area and clear of
   the tree line. The marker appears in brown.
6. Set the player list back to **Player 1 (Red)**, so the next unit you place
   does not belong to the invaders by mistake, and save the map with
   :kbd[Ctrl+S].
:::

::shot[The terrain view over the south-west corner of the map, with the brown Player 12 start location on open ground just north of the Spawn region, off the dirt path and clear of the tree line]{src="./players-and-forces/invader-start.png"}

## Player slots

Each player in the map has a slot with a few settings. The **Controller**
says who plays the slot: **User** is a person, **Computer** is played by the
game. The **Race** picks the player's race, or lets them choose it with
**Selectable**. The **Name** labels the slot.

Player 1, the defender, is a User slot. Player 12 is a Computer slot, and
here is why. A computer player does not need anyone to join the game: the
game fills the slot by itself, so one person can play the map alone. On a
melee map, a computer player then runs an AI script that builds a base and
attacks, but that script is started by the melee setup, which you switched
off in chapter 1. So Player 12 has no AI at all. It builds nothing and plans
nothing, and its units stand where they are, fighting only what comes near,
until something gives them an order. In chapter 6 the triggers give those
orders: they create each wave and send it to the village. Your triggers,
not the game, decide everything the enemy does.

:::steps
1. Choose :menu[Scenario > Player Properties].
2. In the row for **Player 1 (Red)**, set **Name** to `Defender`,
   **Controller** to **User** and **Race** to **Human**.
3. In the row for **Player 12 (Brown)**, set **Name** to `Invaders`,
   **Controller** to **Computer** and **Race** to **Human**.
   <!-- verify: the Player Properties layout in Reforged (one row per player with Name, Controller, Race and Fixed Start Location) and whether it has more than one tab -->
4. Tick **Fixed Start Location** for both players, so each always starts at
   their own marker.
5. The dialog lists only players with a start location, so Player 1 and
   Player 12 are the only rows.
6. Click **OK** and save the map.
:::

::shot[The Player Properties dialog with Player 1 (Red) set to User, Human, named Defender, and Player 12 (Brown) set to Computer, Human, named Invaders]{src="./players-and-forces/player-properties.png"}

The invaders' race does not matter: race decides a player's melee starting
units and the look of their interface, and Player 12's units come from the
triggers whatever their race. In the game, the person playing a User slot is
shown by their own name rather than `Defender`, so the names mostly help you
tell the slots apart.
<!-- verify: which name the game shows for a User slot (the person's own name) and for a Computer slot (the name from Player Properties, or "Computer") -->

## Forces

A force is a team. Players in the same force can be allies, share their
vision and win together; players in different forces start the game as
enemies. By default every player is in one force and players choose their own
teams in the game lobby. Defend the Village needs fixed sides instead: the
villagers in one force, the invaders in the other.
<!-- verify: players in different custom forces start as enemies; a new map has one default force containing every player -->

:::steps
1. Choose :menu[Scenario > Force Properties].
2. Tick **Use Custom Forces**. This makes the forces you set up here the
   teams in the game.
3. Tick **Fixed Player Settings**. This locks every slot: players cannot
   change their race, team or colour in the lobby, and the computer slot
   stays a computer.
   <!-- verify: the labels "Use Custom Forces" and "Fixed Player Settings" in the Reforged Force Properties dialog, and what Fixed Player Settings locks in the lobby -->
4. Select the first force, **Force 1**, and rename it `Villagers`.
5. Click **New Force** to add a second force, and name it `Invaders`.
6. Drag **Player 12 (Brown)** from Villagers into Invaders. Player 1 (Red)
   stays in Villagers.
   <!-- verify: how forces are renamed and created (Rename and New Force buttons), and how a player is moved between forces (dragging in the list) -->
7. Click **OK** and save the map.
:::

::shot[The Force Properties dialog with Use Custom Forces and Fixed Player Settings ticked, the Villagers force containing Player 1 (Red) and the Invaders force containing Player 12 (Brown)]{src="./players-and-forces/force-properties.png"}

Each force has a set of boxes that apply between the players inside it:

- **Allied** makes them allies, so they do not attack each other.
- **Allied Victory** makes them win together: when one of them wins, they
  all do.
- **Share Vision** lets each of them see what the others' units see.
- **Share Unit Control** lets them give orders to each other's units.
<!-- verify: the force flag labels in Reforged (Allied, Allied Victory, Share Vision, Share Unit Control) -->

With one player in each force, these boxes change nothing here, so leave
them as they are.

## Test the setup

Test Map goes straight into the game without a lobby, so it shows the
loading screen but not the slots. To see the map the way a player first
meets it, open it from the game's own custom game screen as well.

:::steps
1. Save the map, then choose :menu[File > Test Map], or press :kbd[Ctrl+F9].
   The loading screen from the last lesson appears and the game starts over
   the village as before. Player 12 has no units yet and there are no melee
   rules, so nothing happens and nothing ends the game.
2. Press :kbd[F10], choose **End Game**, then **Exit Program** to return to
   the editor.
3. Start Warcraft III from the Battle.net app, choose **Single Player**, then
   **Custom Game**.
   <!-- verify: the Reforged main menu path to play a local custom map alone (Single Player > Custom Game, or Single Player > Skirmish), and whether the map list shows the My Maps folder -->
4. In the map list, open the `My Maps` folder and select Defend the Village.
   The map's name, description, suggested players and minimap preview appear
   beside the list.
5. Look at the slots: you in the Villagers team as Human, and the Invaders
   computer in its own team. You cannot change the teams or races, because
   the settings are fixed.
   <!-- verify: what the Reforged custom game screen shows for a map with custom forces and fixed player settings (team names, locked slots, how the computer slot is labelled) -->
6. You do not need to start the game. Go back to the main menu and quit.
:::

::shot[The Warcraft III custom game screen with Defend the Village selected: the map's name, description and minimap preview, and the player slots showing the Villagers and Invaders teams with fixed settings]{src="./players-and-forces/custom-game-slots.png"}

:::checkpoint
Your map has its own name, description and loading screen. Player 1 (Red) is
the human defender in the Villagers force, and Player 12 (Brown) is a
computer invader with its own start location near the spawn, in the Invaders
force. Custom forces and fixed player settings keep both slots exactly as you
set them.
:::
