import type { NavSection } from "../shared/types.ts";

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
          "moonwell/project-layout.md",
          "moonwell/gameplay-code.md",
          "moonwell/objects.md",
          "moonwell/assets.md",
          "moonwell/map-settings.md",
          "moonwell/libraries.md",
          "moonwell/editor-setup.md",
          "moonwell/own-map.md",
        ],
      },
      {
        title: "Reference",
        pages: [
          "moonwell/reference/commands.md",
          "moonwell/reference/settings.md",
          "moonwell/reference/object-fields.md",
          "moonwell/reference/files.md",
          "moonwell/reference/troubleshooting.md",
        ],
      },
    ],
  },
  {
    id: "wrappers",
    label: "moonwell-wrappers",
    groups: [{
      pages: [
        { source: "wrappers/index.md", label: "Overview" },
        { source: "wrappers/getting-started.md", label: "Getting started" },
      ],
    }],
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
