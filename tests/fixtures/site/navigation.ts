import type { NavSection } from "../../../shared/types.ts";

/** A stand-in site for tests and `deno task dev:sample`. It is never part of a production build. */
export const navigation: readonly NavSection[] = [
  {
    id: "moonwell",
    label: "moonwell",
    groups: [
      {
        title: "Guide",
        pages: [
          { source: "moonwell/index.md", label: "Overview" },
          "moonwell/installation.md",
          "moonwell/first-map.md",
        ],
      },
      {
        title: "Reference",
        pages: [
          "moonwell/reference/commands.md",
          "moonwell/reference/manifest.md",
        ],
      },
    ],
  },
  {
    id: "wrappers",
    label: "moonwell-wrappers",
    groups: [
      {
        title: "Guide",
        pages: [
          { source: "wrappers/index.md", label: "Overview" },
          "wrappers/handles.md",
        ],
      },
      {
        title: "Core",
        pages: ["wrappers/reference/unit.md", "wrappers/reference/timer.md"],
      },
      { title: "Frames", pages: ["wrappers/reference/frame.md"] },
    ],
  },
  {
    id: "systems",
    label: "moonwell-systems",
    groups: [{
      pages: [
        { source: "systems/index.md", label: "Overview" },
        { source: "systems/getting-started.md", label: "Getting started" },
      ],
    }],
  },
];
