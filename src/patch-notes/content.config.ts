import { defineCollection } from "astro:content";
import { readdirSync } from "node:fs";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

const patchFiles = readdirSync("./src/patch-notes/content/docs")
  .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
  .map((file) => file.replace(/\.md$/i, ""))
  .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }));

const latestVersion = patchFiles[0] ?? "";

const baseLoader = docsLoader({
  generateId: ({ entry }) => {
    const version = entry.replace(/\.mdx?$/i, "").replace(/\\/g, "/");
    return version === latestVersion ? "index" : version;
  },
});

export const collections = {
  docs: defineCollection({
    loader: {
      name: "patch-notes-loader",
      load: async (context) => {
        const wrappedEntryTypes = new Map(context.entryTypes);
        const mdType = wrappedEntryTypes.get(".md");
        if (mdType) {
          wrappedEntryTypes.set(".md", {
            ...mdType,
            getEntryInfo: async (params) => {
              const info = await mdType.getEntryInfo(params);
              const data = { ...info.data };
              let body = info.body;

              const matchFile = params.fileUrl.pathname.match(/\/([^/]+)\.md$/i);
              const version = matchFile ? decodeURIComponent(matchFile[1]) : "";

              if (!data.title) {
                const lines = body.split(/\r?\n/);
                const firstNonEmptyIdx = lines.findIndex((line) => line.trim().length > 0);
                if (firstNonEmptyIdx !== -1) {
                  const firstLine = lines[firstNonEmptyIdx].trim();
                  if (/^#?\s*warcraft\b/i.test(firstLine) || firstLine.startsWith("# ")) {
                    lines.splice(firstNonEmptyIdx, 1);
                    body = lines.join("\n").replace(/^\s+/, "");
                  }
                }
                data.title = version ? `Patch ${version}` : "Patch Notes";
              }

              return {
                ...info,
                data,
                body,
              };
            },
          });
        }

        return baseLoader.load({
          ...context,
          entryTypes: wrappedEntryTypes,
        });
      },
    },
    schema: docsSchema(),
  }),
};
