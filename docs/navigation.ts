import type { NavSection } from "../shared/types.ts";

export const navigation: readonly NavSection[] = [
  {
    id: "moonwell",
    label: "moonwell",
    sources: ["moonwell/index.md", "moonwell/getting-started.md"],
  },
  {
    id: "wrappers",
    label: "moonwell-wrappers",
    sources: ["wrappers/index.md", "wrappers/getting-started.md"],
  },
  {
    id: "systems",
    label: "moonwell-systems",
    sources: ["systems/index.md", "systems/getting-started.md"],
  },
];
