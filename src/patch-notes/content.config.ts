import { defineCollection } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { getPatchVersions, transformPatchNotesMarkdown } from "./versions.mjs";

const latestVersion = getPatchVersions()[0] ?? "";

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
        context.store.clear();
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

              body = transformPatchNotesMarkdown(body);

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
