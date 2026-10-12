import type { NavSection } from "../shared/types.ts";

export const navigation: readonly NavSection[] = [
  {
    id: "moonwell",
    label: "moonwell",
    groups: [{
      pages: [
        { source: "moonwell/index.md", label: "Overview" },
        { source: "moonwell/getting-started.md", label: "Getting started" },
      ],
    }],
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
