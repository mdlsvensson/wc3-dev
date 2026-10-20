import { defineCollection, z } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        summary: z.string().optional(),
        order: z.number().optional(),
        minutes: z.number().optional(),
        goals: z.array(z.string()).optional(),
      }),
    }),
  }),
};
