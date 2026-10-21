import { readdirSync } from "node:fs";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const patchFiles = readdirSync("./src/patch-notes/content/docs")
  .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
  .map((file) => file.replace(/\.md$/i, ""))
  .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }));

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
          label: "Overview",
          items: [{ label: "All Patch Notes", slug: "" }],
        },
        {
          label: "Patches",
          items: patchFiles.map((version) => ({
            label: `Patch ${version}`,
            slug: version,
          })),
        },
      ],
    }),
  ],
});
