/** The "Getting started" track. */
export const TRACK = {
  title: 'Getting started with Warcraft III: Reforged modding',
  short: 'Getting started',
} as const;

/** Chapters in reading order. Each is a folder in `src/content/tutorials/`. */
export const chapters = [
  { slug: 'editor-basics', title: 'Editor basics', summary: 'Open the World Editor, find your way around, and create the map you will build throughout the track.' },
  { slug: 'terrain', title: 'Terraining', summary: 'Paint tiles, raise the village onto a plateau, and carve a river with a single ford.' },
  { slug: 'placement', title: 'Placing units and doodads', summary: 'Build the village, place creep camps, and mark the regions your triggers will use.' },
  { slug: 'map-setup', title: 'Map setup', summary: 'Name and describe your map, give it a loading screen, and set up its players and forces.' },
  { slug: 'object-editor', title: 'Object Editor', summary: 'Create a custom hero, a custom ability, and a tower to defend the village.' },
  { slug: 'triggers', title: 'GUI triggers', summary: 'Turn the map into a game: waves on a timer, then victory or defeat.' },
] as const;
