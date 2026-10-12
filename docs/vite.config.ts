import { fresh } from "@fresh/plugin-vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defineConfig } from "vite";
import { prepareDocumentation } from "../tools/content/prepare.ts";
import { documentationPreparation } from "../tools/content/watch.ts";
import { navigation as sampleNavigation } from "../tests/fixtures/site/navigation.ts";
import { navigation } from "./navigation.ts";

// Keep both navigations in Vite's config dependency graph so an edit restarts preparation.
void navigation;
void sampleNavigation;

const sampleContent = new URL(
  "../tests/fixtures/site/content/",
  import.meta.url,
);
const root = fileURLToPath(new URL(".", import.meta.url));
const configPath = fileURLToPath(
  new URL("../wrangler.docs.jsonc", import.meta.url),
);

// The mode comes from the command line of a task and is read only here, while the
// configuration is built; no request can change it.
export default defineConfig(({ command, mode }) => ({
  root,
  resolve: {
    // Resolve Fresh's entry before writeBundle creates its on-disk wrapper.
    alias: [{ find: "./_fresh/server.js", replacement: "fresh:server_entry" }],
  },
  plugins: [
    mode === "sample"
      ? documentationPreparation(
        () =>
          prepareDocumentation({
            content: sampleContent,
            navigation: sampleNavigation,
          }),
        undefined,
        fileURLToPath(sampleContent),
      )
      : documentationPreparation(),
    {
      name: "documentation-search-asset",
      enforce: "pre",
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          if (request.url?.split("?")[0] === "/generated/search.json") {
            // Fresh otherwise handles this root path as a page before Vite's asset middleware.
            const asset = fileURLToPath(
              new URL("./generated/search.json", import.meta.url),
            )
              .replaceAll("\\", "/");
            request.url = `/@fs/${asset}${
              request.url.slice("/generated/search.json".length)
            }`;
          }
          next();
        });
      },
      resolveId(source, importer) {
        if (source !== "../generated/search.json?url&no-inline" || !importer) {
          return;
        }
        // Fresh's Deno resolver drops file URL queries. Preserve this asset query
        // before it runs, so Vite emits a fetchable file rather than a JSON module.
        const base = importer.startsWith("file:")
          ? importer
          : pathToFileURL(importer);
        return `${
          fileURLToPath(new URL("../generated/search.json", base))
        }?url&no-inline`;
      },
    },
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
