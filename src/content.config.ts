import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

const docs = defineCollection({ loader: docsLoader(), schema: docsSchema() });
const i18n = defineCollection({ loader: i18nLoader(), schema: i18nSchema() });
const resources = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/resources' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    url: z.url(),
    category: z.enum(['Community', 'Tooling', 'Scripting']),
    label: z.string(),
    order: z.number().int().nonnegative(),
  }),
});
export const collections = { docs, i18n, resources };
