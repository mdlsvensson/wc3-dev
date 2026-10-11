import { fresh } from "@fresh/plugin-vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { documentationPreparation } from "../tools/content/watch.ts";

const root = fileURLToPath(new URL(".", import.meta.url));
const configPath = fileURLToPath(new URL("../wrangler.jsonc", import.meta.url));

export default defineConfig(({ command }) => ({
  root,
  resolve: {
    // Resolve Fresh's entry before writeBundle creates its on-disk wrapper.
    alias: [{ find: "./_fresh/server.js", replacement: "fresh:server_entry" }],
  },
  plugins: [
    command === "build" && documentationPreparation(),
    fresh({ staticDir: "../shared/static" }),
    // Fresh owns the Deno dev server; production is built for Workers and previewed with Wrangler.
    command === "build" && cloudflare({
      configPath,
      viteEnvironment: { name: "ssr" },
      remoteBindings: false,
      inspectorPort: false,
    }),
  ],
}));
