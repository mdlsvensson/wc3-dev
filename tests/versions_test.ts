import { assertEquals } from "@std/assert";
import { readSources } from "../tools/content/prepare.ts";
import { versionMistakes, type Versions } from "../tools/content/versions.ts";

const held: Versions = {
  moonwell: "0.12.3",
  wrappers: "v0.10.1",
  systems: "v0.6.1",
  written: ["moonwell"],
};
const overview = "# Moonwell\n\nThese pages describe Moonwell 0.12.3.\n";
const pages = (extra: Record<string, string>) =>
  new Map(Object.entries({ "moonwell/index.md": overview, ...extra }));

Deno.test("a page that names the versions held has no mistake", () => {
  const page = [
    "# Installation",
    "",
    "irm https://github.com/mdlsvensson/moonwell/releases/download/moonwell@0.12.3/install.ps1 | iex",
    "",
    "[[libraries]]",
    'name = "wrappers"',
    'github = "mdlsvensson/moonwell-wrappers"',
    'tag = "v0.10.1"',
    "",
    "[[libraries]]",
    'github = "mdlsvensson/moonwell-systems"',
    "path = 'C:\\Repo\\moonwell-systems'",
    "",
    "Use it with moonwell-systems v0.6.1. Pkl 0.32.1 and YueScript 0.34.3 are other programs.",
    "See https://github.com/mdlsvensson/moonwell-wrappers/tree/v0.10.1/src.",
    "It is written for Moonwell\n0.12.3 and works with moonwell-wrappers\nv0.10.1.",
  ].join("\n");
  assertEquals(
    versionMistakes(pages({ "moonwell/installation.md": page }), held),
    [],
  );
});

Deno.test("each form of another version is reported at its line", () => {
  const page = [
    "# Objects",
    "",
    'uri = "package://pkg.pkl-lang.org/github.com/mdlsvensson/moonwell/moonwell@0.12.2"',
    "Written for Moonwell 0.11.0.",
    'github = "mdlsvensson/moonwell-wrappers"',
    'tag = "v0.9.2"',
    "https://github.com/mdlsvensson/moonwell-systems/releases/tag/v0.6.0",
    "With moonwell-systems v0.5.2.",
  ].join("\n");
  assertEquals(versionMistakes(pages({ "moonwell/objects.md": page }), held), [
    "moonwell/objects.md:3: Moonwell is 0.12.3, not 0.12.2",
    "moonwell/objects.md:4: Moonwell is 0.12.3, not 0.11.0",
    "moonwell/objects.md:5: moonwell-wrappers is v0.10.1, not v0.9.2",
    "moonwell/objects.md:7: moonwell-systems is v0.6.1, not v0.6.0",
    "moonwell/objects.md:8: moonwell-systems is v0.6.1, not v0.5.2",
  ]);
});

Deno.test("a name at the end of a line and its version at the start of the next is seen", () => {
  const page = [
    "# Libraries",
    "",
    "This page was written for Moonwell",
    "0.11.0 and",
    "uses moonwell-wrappers",
    "v0.9.2.",
  ].join("\n");
  assertEquals(
    versionMistakes(pages({ "moonwell/libraries.md": page }), held),
    [
      "moonwell/libraries.md:3: Moonwell is 0.12.3, not 0.11.0",
      "moonwell/libraries.md:5: moonwell-wrappers is v0.10.1, not v0.9.2",
    ],
  );
});

Deno.test("the Overview of a written section names its version, and a placeholder section is not asked", () => {
  const sources = new Map([
    ["moonwell/index.md", "# Moonwell\n\nA framework.\n"],
    ["wrappers/index.md", "# wrappers\n\nThis page is a placeholder.\n"],
  ]);
  assertEquals(versionMistakes(sources, held), [
    "moonwell/index.md: the Overview does not name 0.12.3",
  ]);
  assertEquals(versionMistakes(sources, { ...held, written: [] }), []);
});

Deno.test("the authored pages name no other version than docs/versions.json holds", async () => {
  const versions: Versions = JSON.parse(
    await Deno.readTextFile(new URL("../docs/versions.json", import.meta.url)),
  );
  const sources = await readSources(
    new URL("../docs/content/", import.meta.url),
  );
  assertEquals(versionMistakes(sources, versions), []);
});
