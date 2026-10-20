import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { starlightTutorialDirectivesPlugin } from "./src/tutorials/remark-tutorial-directives.mjs";

export default defineConfig({
  site: "https://wc3.dev",
  base: "/tutorials",
  srcDir: "./src/tutorials",
  outDir: "./dist/home/tutorials",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    starlight({
      title: "Tutorials",
      customCss: ["./src/styles/global.css"],
      plugins: [starlightTutorialDirectivesPlugin()],
      expressiveCode: {
        themes: ["kanagawa-wave"],
        useStarlightDarkModeSwitch: false,
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
        PageTitle: "./src/tutorials/components/PageTitle.astro",
        SiteTitle: "./src/tutorials/components/SiteTitle.astro",
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
          label: "Overview",
          items: [{ label: "Introduction", slug: "" }],
        },
        {
          label: "1. Editor Basics",
          items: [
            {
              label: "Install and open the World Editor",
              slug: "editor-basics/install-and-open",
            },
            { label: "A tour of the editor", slug: "editor-basics/editor-tour" },
            { label: "Create and test your map", slug: "editor-basics/create-your-map" },
          ],
        },
        {
          label: "2. Terraining",
          items: [
            { label: "Painting tiles", slug: "terrain/painting-tiles" },
            { label: "Height, cliffs and ramps", slug: "terrain/height-and-cliffs" },
            { label: "Water and the river", slug: "terrain/water" },
            { label: "Finishing touches", slug: "terrain/finishing-touches" },
          ],
        },
        {
          label: "3. Placing Units & Doodads",
          items: [
            { label: "Doodads and the village", slug: "placement/doodads" },
            {
              label: "Units, buildings and start locations",
              slug: "placement/units-and-buildings",
            },
            { label: "Creep camps and item drops", slug: "placement/creep-camps" },
            { label: "Regions", slug: "placement/regions" },
          ],
        },
        {
          label: "4. Map Setup",
          items: [
            {
              label: "Description, options and loading screen",
              slug: "map-setup/map-options",
            },
            { label: "Players and forces", slug: "map-setup/players-and-forces" },
          ],
        },
        {
          label: "5. Object Editor",
          items: [
            { label: "A tour of the Object Editor", slug: "object-editor/object-editor-tour" },
            { label: "A custom hero", slug: "object-editor/custom-hero" },
            { label: "A custom ability", slug: "object-editor/custom-ability" },
            { label: "A village tower", slug: "object-editor/village-tower" },
          ],
        },
        {
          label: "6. GUI Triggers",
          items: [
            { label: "Events, conditions and actions", slug: "triggers/trigger-basics" },
            { label: "Variables and a wave timer", slug: "triggers/wave-timer" },
            { label: "Spawning waves", slug: "triggers/spawning-waves" },
            { label: "Winning and losing", slug: "triggers/win-and-lose" },
          ],
        },
        {
          label: "Next Steps",
          items: [{ label: "Where to go next", slug: "next" }],
        },
      ],
    }),
  ],
});
