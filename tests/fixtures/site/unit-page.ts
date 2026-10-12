// Writes content/wrappers/reference/unit.md, the sample module page. After changing this file, run in wc3-dev/:
//   deno run --allow-write=tests/fixtures/site/content tests/fixtures/site/unit-page.ts
const subjects = [
  "Life",
  "Mana",
  "Owner",
  "Position",
  "Facing",
  "Ability",
  "Item",
  "Animation",
  "Scale",
  "Color",
];
const groups: [title: string, verb: string][] = [
  ["Reading state", "get"],
  ["Writing state", "set"],
  ["Resetting", "reset"],
  ["Queries", "has"],
  ["Showing", "show"],
  ["Hiding", "hide"],
];

export function example(name: string): string {
  return [
    "::: code-group",
    "```yue",
    `result = unit\\${name}!`,
    "```",
    "```lua",
    `local result = unit:${name}()`,
    "```",
    ":::",
    "",
  ].join("\n");
}

export function unitPage(): string {
  const parts = [
    "# wrappers.unit\n",
    "Sample marker wrappers unit. This page is sample text for tests, not documentation.\n",
    "::: note Measured on 3.0.0.24268\nA sample note with `code` in it.\n:::\n",
    "::: warning\nA sample warning.\n:::\n",
    "## Orders\n",
    "### issueOrder\n",
    "Sample text for `Unit.issueOrder`.\n",
    example("issueOrder"),
    "### issueTargetOrder\n",
    "Sample text for `Unit.issueTargetOrder`.\n",
    example("issueTargetOrder"),
  ];
  for (const [title, verb] of groups) {
    parts.push(`## ${title}\n`);
    for (const subject of subjects) {
      const name = `${verb}${subject}`;
      parts.push(`### ${name}\n`, `Sample text for \`Unit.${name}\`.\n`);
      parts.push(example(name));
    }
  }
  return parts.join("\n");
}

if (import.meta.main) {
  await Deno.writeTextFile(
    new URL("./content/wrappers/reference/unit.md", import.meta.url),
    unitPage(),
  );
}
