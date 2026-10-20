import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import astroExpressiveCode from "astro-expressive-code";

export default defineConfig({
  site: "https://wc3.dev",
  srcDir: "./src/home",
  outDir: "./dist/home",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [astroExpressiveCode()],
});
