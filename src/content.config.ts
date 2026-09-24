import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { resourceSchema } from './lib/resource-schema';
import { lessonSchema, tutorialPageSchema } from './lib/tutorial-schema';

// Read through globalThis so this file type-checks without Node or Deno typings.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

const docs = defineCollection({ loader: docsLoader(), schema: docsSchema() });
const i18n = defineCollection({ loader: i18nLoader(), schema: i18nSchema() });
const resources = defineCollection({
  loader: glob({
    // Test fixtures render only in `deno task build:test`, never in production builds.
    pattern: env.RESOURCE_FIXTURES ? '**/*.json' : ['**/*.json', '!_fixtures/**'],
    base: './src/content/resources',
    // The slug is the file name, whatever folder the file sits in.
    generateId: ({ entry }) => entry.split('/').at(-1)!.replace(/\.json$/, ''),
  }),
  schema: resourceSchema,
});
// Lessons: one Markdown file per lesson, in a folder per chapter. Ids are `<chapter>/<slug>`.
const tutorials = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/tutorials' }),
  schema: lessonSchema,
});
// Top-level track pages, such as the closing "Where to go next" page.
const tutorialPages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/tutorials' }),
  schema: tutorialPageSchema,
});
export const collections = { docs, i18n, resources, tutorials, tutorialPages };
