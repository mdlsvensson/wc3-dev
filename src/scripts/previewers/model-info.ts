/** The viewer's own rule: Reforged-format models whose materials name shaders render with HD shaders. */
export const isHdModel = (version: number, shaders: string[]): boolean => version > 800 && shaders.some((shader) => shader !== '');

/** The first "Stand" sequence, else the first sequence; -1 when there are none. */
export function defaultSequence(names: string[]): number {
  const stand = names.findIndex((name) => /^stand\b/i.test(name.trim()));
  return stand >= 0 ? stand : names.length ? 0 : -1;
}

const TEAM_COLOR_NAMES = [
  'Red', 'Blue', 'Teal', 'Purple', 'Yellow', 'Orange', 'Green', 'Pink', 'Gray', 'Light Blue', 'Dark Green', 'Brown',
  'Maroon', 'Navy', 'Turquoise', 'Violet', 'Wheat', 'Peach', 'Mint', 'Lavender', 'Coal', 'Snow', 'Emerald', 'Peanut',
];

/** Team colours the viewer has loaded: 16 for SD models, 28 for HD. */
export function teamColorOptions(hd: boolean): { value: string; text: string }[] {
  return Array.from({ length: hd ? 28 : 16 }, (_, index) => ({ value: String(index), text: TEAM_COLOR_NAMES[index] ?? `Neutral ${index - 23}` }));
}

export const SPEEDS = ['0.25', '0.5', '1', '2'] as const;
