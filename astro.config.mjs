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
        themes: ["vitesse-dark"],
        styleOverrides: {
          borderRadius: "0.75rem",
          borderColor: "#222222",
          codeBackground: "#181818",
          frames: {
            editorActiveTabBackground: "#181818",
            editorTabBarBackground: "#121212",
            frameBoxShadowCssValue: "none",
          },
        },
      },
      components: {
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
      ],
    }),
  ],
});
