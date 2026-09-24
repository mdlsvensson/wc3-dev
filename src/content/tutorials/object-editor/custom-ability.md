---
title: A custom ability
summary: Turn Storm Bolt into Shield Throw, with its own damage, cooldown and tooltips, and give it to the Village Captain.
order: 3
minutes: 20
goals:
  - Create a custom ability from an existing one
  - Set values for each ability level
  - Write tooltips and give the ability to a hero
---

The Village Captain stands beside the Town Hall, but he fights with the
Paladin's spells. In this lesson you give him a signature move: Shield Throw,
which hurls his shield at one enemy, damaging it and stunning it for a moment.
That is exactly what the Mountain King's Storm Bolt does with a hammer, so you
copy Storm Bolt and change its numbers, its name and its tooltips. Then you
swap it in for the Paladin's Holy Light and try it out on the gnolls in the
western forest.

## Copy Storm Bolt

Abilities are copied the same way as units, on their own tab.

:::steps
1. Open the Object Editor with :kbd[F6] and click the **Abilities** tab.
2. In the tree, open **Standard Abilities**, **Human**, **Heroes**, and select
   **Storm Bolt**.
   <!-- verify: the Abilities tab tree in Reforged (Standard Abilities, then race, then Units and Heroes) and that Storm Bolt is under Human > Heroes -->
3. Press :kbd[Ctrl+C], then :kbd[Ctrl+V]. The copy appears under **Custom
   Abilities**, **Human**, **Heroes**, still called Storm Bolt. Select it.
4. Double-click **Text - Name**, type `Shield Throw` and click **OK**.
:::

::shot[The Abilities tab with the new custom ability selected under Custom Abilities, Human, Heroes, and its Text - Name field changed to Shield Throw]{src="./custom-ability/new-ability.png"}

In raw data (:kbd[Ctrl+D]) the copy has a code of its own, such as `A000`,
while Storm Bolt stays `AHtb`. The copy also keeps Storm Bolt's icon and its
hammer missile: art is for later, and what matters now is how it plays.

## Levels and values

A hero ability has levels. The hero learns level 1 with a skill point and
raises it with later points, and each level has its own values. Storm Bolt
already has 3 levels, and Shield Throw keeps them.

Fields that change with the level appear once per level, starting with the
level: **Level 1 - Data - Damage**, **Level 2 - Data - Damage**, and so on.
Fields without a level, such as **Text - Name**, apply to every level.

Shield Throw is a lighter Storm Bolt: less damage and a shorter stun, but
cheaper, and ready again sooner:

| Field | Level 1 | Level 2 | Level 3 |
| --- | --- | --- | --- |
| **Data - Damage** | 60 | 120 | 180 |
| **Stats - Duration - Normal** | 1 | 1.5 | 2 |
| **Stats - Duration - Hero** | 1 | 1.5 | 2 |
| **Stats - Cooldown** | 8 | 8 | 8 |
| **Stats - Mana Cost** | 60 | 60 | 60 |

The two durations are the stun's length in seconds: **Stats - Duration -
Normal** for ordinary units and **Stats - Duration - Hero** for heroes. Storm
Bolt stuns heroes for less time; Shield Throw stuns both the same. **Stats -
Cooldown** is the number of seconds before the ability can be used again.

:::steps
1. With Shield Throw selected, check that **Stats - Levels** is `3`.
2. Set **Level 1 - Data - Damage** to `60`, **Level 2 - Data - Damage** to
   `120` and **Level 3 - Data - Damage** to `180`.
3. Set **Stats - Duration - Normal** to `1`, `1.5` and `2` for levels 1, 2
   and 3.
4. Set **Stats - Duration - Hero** to the same three values.
5. Set **Stats - Cooldown** to `8` for all three levels.
6. Set **Stats - Mana Cost** to `60` for all three levels.
7. Save the map with :kbd[Ctrl+S].
:::

::shot[Shield Throw's fields with the level 1, 2 and 3 values for Data - Damage, Stats - Duration - Normal, Stats - Duration - Hero, Stats - Cooldown and Stats - Mana Cost set as in the table, in the changed-field colour]{src="./custom-ability/ability-levels.png"}

## Tooltips

The tooltips are what the player reads on the ability's buttons, so they
must match the new numbers. There are two kinds, each with a short title and
a longer extended text:

- **Text - Tooltip - Learn** and **Text - Tooltip - Learn - Extended** show on
  the button the player clicks to learn the ability or raise its level. There
  is one of each for the whole ability.
- **Text - Tooltip - Normal** and **Text - Tooltip - Normal - Extended** show on
  the button that casts it. There is one of each per level.

Storm Bolt's tooltips contain codes in angle brackets, such as
`<AHtb,DataA1>`, which the game replaces with a value from an ability. They
point at Storm Bolt, `AHtb`, not at your copy, so they would show Storm Bolt's
numbers. Replace each tooltip with plain text and write the numbers out. The
colour codes `|cffffcc00` and `|r`, which colour the hotkey letter gold, can
go too.
<!-- verify: Storm Bolt's default tooltips use value references in the form <AHtb,DataA1>, and the colour codes |cffffcc00 and |r -->

:::steps
1. Set **Text - Tooltip - Learn** to `Learn Shield Throw - [Level %d]`. The
   game replaces `%d` with the level the player is about to learn.
2. Set **Text - Tooltip - Learn - Extended** to `Throws the captain's shield
   at an enemy unit, dealing damage and stunning it. Level 1: 60 damage, 1
   second stun. Level 2: 120 damage, 1.5 second stun. Level 3: 180 damage, 2
   second stun.`
3. Set the three **Text - Tooltip - Normal** fields to `Shield Throw - [Level
   1]`, `Shield Throw - [Level 2]` and `Shield Throw - [Level 3]`.
4. Set **Level 1 - Text - Tooltip - Normal - Extended** to `Throws the
   captain's shield at an enemy unit, dealing 60 damage and stunning it for 1
   second.`
5. Set levels 2 and 3 the same way, with 120 damage and 1.5 seconds, then 180
   damage and 2 seconds.
6. Save the map.
:::

::shot[Shield Throw's Text fields with the Learn, Learn - Extended, Normal and Normal - Extended tooltips rewritten for Shield Throw, the extended tooltip for level 1 open in its edit dialog]{src="./custom-ability/ability-tooltips.png"}

## Give it to the hero

An ability does nothing until a unit has it. A hero's learnable abilities are
listed in its **Abilities - Hero** field. The Captain's list is still the
Paladin's: Holy Light, Divine Shield, Devotion Aura and Resurrection. Shield
Throw takes Holy Light's place.

:::steps
1. Click the **Units** tab and select the Village Captain under **Custom
   Units**.
2. Double-click **Abilities - Hero**. A dialog lists the four abilities.
3. Select **Holy Light** and remove it.
4. Add an ability, and choose **Shield Throw** from the custom abilities in the
   list that opens.
   <!-- verify: the Abilities - Hero edit dialog in Reforged: its list of abilities and the buttons to add and remove one, and where custom abilities appear in the add list -->
5. Check that the list now holds Shield Throw, Divine Shield, Devotion Aura and
   Resurrection, and click **OK**.
6. Save the map.
:::

::shot[The Abilities - Hero dialog for the Village Captain, listing Shield Throw, Divine Shield, Devotion Aura and Resurrection]{src="./custom-ability/hero-abilities.png"}

Now try it on the creeps. The gnoll camp is waiting in the western forest,
and the Gnoll Poacher still owes you the Potion of Healing from chapter 3.

:::steps
1. Choose :menu[File > Test Map], or press :kbd[Ctrl+F9].
2. Select the Captain. A hero starts with one skill point: click the **Hero
   Abilities** button, the one with a plus sign, and hold the pointer over
   each ability. Shield Throw's learn tooltip shows your text.
3. Click **Shield Throw** to learn it.
4. Walk the Captain down the ramp, along the path and over the ford, then
   west into the forest clearing where the gnolls wait.
5. Click the Shield Throw button and then a Gnoll. The shield flies (as a
   hammer, for now), the Gnoll takes 60 damage and stands stunned for a
   second.
6. Finish the camp. When the Gnoll Poacher dies, it drops a Potion of Healing.
   Right-click the potion to pick it up.
7. Press :kbd[F10], choose **End Game**, then **Exit Program** to return to the
   editor.
:::

::shot[Warcraft III running Defend the Village in a Test Map game, with a Gnoll stunned by Shield Throw in the forest clearing and the pointer over the Shield Throw button, showing its level 1 tooltip]{src="./custom-ability/shield-throw-test.png"}

The village has no altar to revive the Captain, so if he falls in a test,
end the game and test again.
