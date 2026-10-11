import type { LandingCard } from "../types.ts";

export const landingName = "Moonwell";
export const landingTagline =
  "Multilingual modding framework for Warcraft III: Reforged";
export const landingCards: readonly LandingCard[] = [
  {
    title: "moonwell",
    description: "Moonwell framework docs.",
    path: "/moonwell/",
  },
  {
    title: "moonwell-wrappers",
    description: "Lua wrappers for Warcraft III natives.",
    path: "/wrappers/",
  },
  {
    title: "moonwell-systems",
    description:
      "Full gameplay systems suite including damage engine, physics, save/load, and more.",
    path: "/systems/",
  },
];
