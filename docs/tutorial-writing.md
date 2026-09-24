# Writing tutorials

The "Getting started" track lives in `src/content/tutorials/`. This guide covers
the file format, the directives, the house style, and the running project every
lesson builds on. Run `deno task tutorial:check` after editing: it validates the
lessons and lists missing screenshots and facts to verify.

## Files

- A lesson is `src/content/tutorials/<chapter>/<lesson>.md`. Its folder is its
  chapter (listed in `src/data/tutorials.ts`) and its file name is its slug.
- Screenshots live in `<chapter>/<lesson>/`, named in kebab-case
  (`create-your-map/new-map-dialog.png`). Capture PNGs at 16:9, ideally
  1600 × 900 or larger, cropped to what the note describes. Astro converts
  them to WebP.
- `next.md` is the closing page. Top-level pages have only `title` and
  `summary`.

## Frontmatter

    title: Painting tiles            # ≤ 80 characters; also the tab label
    summary: One sentence.           # ≤ 200 characters
    order: 1                         # position in the chapter, unique
    minutes: 10                      # time to read and follow along
    goals:                           # 1–5 items, "In this lesson you will…"
      - Paint ground tiles

## Directives

| Write | For |
| --- | --- |
| `:kbd[Ctrl+F9]` | Keys and key combinations |
| `:menu[Scenario > Map Options]` | Menu paths |
| `:::steps` around a numbered list | Procedures the reader follows |
| `:::tip`, `:::note`, `:::caution` (optional `[Title]`) | Asides; caution is for losing work or breaking the map |
| `:::checkpoint` | The last lesson of a chapter: what the map does now |
| `::shot[capture note]{src="./lesson/name.png" caption="…"}` | A screenshot |
| `<!-- verify: … -->` | An editor fact to confirm; removed from the page |

The capture note in `::shot[…]` is also the image's alt text: describe what
the screenshot shows and in which state ("The New Map dialog with Width and
Height set to 96 and the Lordaeron Summer tileset selected"). A missing file
renders as a placeholder showing the note. `caption` is optional and shown
under the image.

- Those five container directives are the only ones. Any other name
  (`:::warning`, `:::danger`) is an error in both the build and
  `tutorial:check`.
- `:::steps` takes no label (one is dropped); put a heading above it instead.
  The `caption` attribute is plain text: Markdown in it is shown as written.
- Separate keys with `+`. `:kbd[Ctrl++]` shows Ctrl and +.
- A `::shot` src must stay inside the lesson's folder (`./<lesson>/…`, no
  `..`).
- Use inline links (`[text](/path/)`), not reference-style links
  (`[text][ref]`): only inline links to the framework docs are marked to
  reload the page, which those pages need.

## Style

- Second person, present tense, short sentences. Explain why before how.
- British spelling in prose (colour, centre). Editor labels are written
  exactly as the editor shows them, in **bold** (**Tinting Color**).
- Menus with `:menu[…]`, keys with `:kbd[…]`, rawcodes and file names in
  `code`.
- Every lesson: a short intro paragraph with no heading, then two to five
  `##` sections. Procedures go in `:::steps`. Each procedure section has at
  least one screenshot. 500–1,200 words.
- No scripting: no JASS, Lua or TypeScript, and no "Custom Script" actions.
  Point to [the w3ts framework](/framework/) only in the closing page.
- Links are plain Markdown. Link other lessons as `/learn/<chapter>/<lesson>/`,
  and only to pages that exist. Link to Hive Workshop at
  `https://www.hiveworkshop.com/` unless you know an exact page exists.
- When unsure of an editor fact (a menu name, a shortcut, a default value),
  write it as you believe it is and add `<!-- verify: … -->` on the next line.
  Never invent certainty.
- The target is the current Reforged World Editor. Mention Classic graphics
  only where it changes what the reader sees.

## The running project: Defend the Village

Every lesson builds on this map. Keep names and numbers exactly as listed.

**Map:** "Defend the Village", saved as `DefendTheVillage.w3x`; 96 × 96;
Lordaeron Summer. Suggested players: 1. Author: the reader.
Description: "Hold the village against five waves of gnolls and ogres. Build
towers, level your captain, and keep the town hall standing."
Loading screen: title "Defend the Village", subtitle "Hold the ford", text
"Waves of invaders cross the river every 45 seconds. Build Village Towers,
and use the Captain's Shield Throw to stop them before they reach the town
hall."

**Layout:** the village sits on a plateau one cliff level up in the
north-east, reached by a single ramp facing south-west. A dirt path runs
from the spawn in the south-west corner to the ramp. A deep river runs from
the north-west edge to the south-east edge between them; the path crosses it
at the only ford (shallow water). A forest lies west of the river, trees
frame the map edges.

**Players and forces:** Player 1 (Red), User, "Defender", force "Villagers".
Player 12 (Brown), Computer, "Invaders", force "Invaders", start location
near the spawn. Fixed player settings. No other slots.

**Village (Player 1):** Town Hall in the centre of the plateau, 4 Farms, a
Lumber Mill, 5 Peasants, the start location. No gold mine; gold comes from
the Setup trigger (500 gold, 200 lumber).

**Creep camps (Neutral Hostile), off the wave route:** gnoll camp in the
western forest (2 Gnolls, 1 Gnoll Poacher that drops a Potion of Healing);
murloc camp on the river bank north of the ford (2 Murloc Tiderunners).

**Regions:** `Spawn` at the south-west end of the path; `Village` around the
Town Hall.

**Object Editor:**
- Village Captain: custom hero copied from the Paladin; proper names Aldric,
  Maren, Tobin; Strength 22, Agility 14, Intelligence 16; abilities Shield
  Throw, Divine Shield, Devotion Aura, Resurrection. Placed for Player 1 next
  to the Town Hall.
- Shield Throw: copied from Storm Bolt; 3 levels; damage 60/120/180; stun
  1/1.5/2 seconds; cooldown 8 seconds; 60 mana.
- Village Tower: copied from the Guard Tower; 100 gold, 30 lumber; build time
  30 seconds; no requirements and no upgrades; built by Peasants.

**Triggers** (category "Defend the Village"; `Melee Initialization` is disabled in
chapter 1 and deleted in chapter 6):
- Variables: `WaveNumber` (Integer, 0), `WaveUnitType` (Unit-Type array,
  size 5), `WaveTimer` (Timer), `WaveWindow` (Timer Window).
- Welcome: Map initialization → display "Defend the village! The first wave
  arrives soon."
- Setup: Map initialization → WaveUnitType[1–5] = Gnoll, Gnoll Poacher,
  Gnoll Brute, Ogre Warrior, Ogre Mauler; Player 1 gold 500 and lumber 200;
  start WaveTimer (one-shot, 60 seconds); timer window "Next wave", stored in
  WaveWindow.
- Spawn Wave: WaveTimer expires → WaveNumber + 1; create WaveNumber + 3 of
  WaveUnitType[WaveNumber] for Player 12 at the centre of Spawn; message
  "Wave N is coming!"; order Player 12's units to attack-move to the centre of
  Village; if WaveNumber < 5, start WaveTimer (one-shot, 45 seconds).
- Defeat: the Town Hall dies → defeat Player 1, "The village has fallen."
- Victory: a unit owned by Player 12 dies, WaveNumber = 5, and no living
  units owned by Player 12 remain → victory for Player 1.
