import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { getPatchVersions } from "./src/patch-notes/versions.mjs";

const patchFiles = getPatchVersions();

export default defineConfig({
  site: "https://wc3.dev",
  base: "/patch-notes",
  srcDir: "./src/patch-notes",
  outDir: "./dist/home/patch-notes",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    starlight({
      title: "Patch Notes",
      customCss: ["./src/styles/global.css"],
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
        SiteTitle: "./src/patch-notes/components/SiteTitle.astro",
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
          label: "Patches",
          items: patchFiles.map((version, idx) => ({
            label: `Patch ${version}`,
            slug: idx === 0 ? "" : version,
          })),
        },
      ],
    }),
  ],
});
