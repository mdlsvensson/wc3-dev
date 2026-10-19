import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://wc3.dev",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    starlight({
      title: "Moonwell",
      customCss: ["./src/styles/global.css"],
      expressiveCode: {
        themes: ["kanagawa-wave", "vitesse-dark"],
        useStarlightDarkModeSwitch: false,
        themeCssSelector: (theme) => `[data-palette='${theme.name}']`,
        styleOverrides: {
          borderRadius: "0.75rem",
          borderColor: "var(--mw-border)",
          codeBackground: "var(--mw-surface)",
          codeFontFamily: "var(--font-mono)",
          frames: {
            editorActiveTabBackground: "var(--mw-surface)",
            editorTabBarBackground: "var(--mw-bg)",
            frameBoxShadowCssValue: "none",
          },
        },
      },
      components: {
        SiteTitle: "./src/components/SiteTitle.astro",
        ThemeProvider: "./src/components/ThemeProvider.astro",
        ThemeSelect: "./src/components/ThemeSelect.astro",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/mdlsvensson/moonwell",
        },
      ],
      sidebar: [
        {
          label: "Get Started",
          items: [
            { label: "Introduction", slug: "" },
            { label: "Getting Started", slug: "guides/getting-started" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Project & World Editor", slug: "guides/project-and-editor" },
            { label: "Objects", slug: "guides/objects" },
            {
              label: "Actors, Components & Reactions",
              slug: "guides/components-and-reactions",
            },
            {
              label: "Abilities, Buffs & Timers",
              slug: "guides/abilities-buffs-and-timers",
            },
            { label: "Multiplayer", slug: "guides/multiplayer" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "CLI & Build", slug: "reference/cli-and-build" },
            { label: "Runtime API", slug: "reference/runtime-api" },
            { label: "Objects & Natives API", slug: "reference/objects-and-natives" },
            { label: "Diagnostics & Errors", slug: "reference/diagnostics" },
          ],
        },
      ],
    }),
  ],
});
