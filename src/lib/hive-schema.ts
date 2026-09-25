import { z } from 'astro/zod';

export const HIVE_ORIGIN = 'https://www.hiveworkshop.com';
/** Hive also serves its pages without `www`; such links are normalised to `HIVE_ORIGIN`. */
const HIVE_ORIGINS = new Set([HIVE_ORIGIN, 'https://hiveworkshop.com']);
/** The most entries the snapshot keeps. */
export const MAX_ENTRIES = 30;
/** The longest title and category an entry may have, in UTF-16 units (Zod's measure). */
export const TITLE_MAX = 120;
export const CATEGORY_MAX = 40;

/** Whether `url` is an https link to Hive Workshop, with or without `www`, and without credentials. */
export function isHiveUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return HIVE_ORIGINS.has(parsed.origin) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

/** Lowercase host, `www` added, no query or fragment, and a trailing slash. */
export function normaliseHiveUrl(url: string): string {
  const parsed = new URL(url.trim());
  if (parsed.hostname === 'hiveworkshop.com') parsed.hostname = 'www.hiveworkshop.com';
  parsed.search = '';
  parsed.hash = '';
  if (!parsed.pathname.endsWith('/')) parsed.pathname += '/';
  return parsed.href;
}

const isoDate = z.iso.date();
const hiveUrl = z.url().refine(isHiveUrl, `Hive links must be ${[...HIVE_ORIGINS].map((origin) => `${origin}/…`).join(' or ')}`);

/** One Hive resource or tutorial: metadata and an outbound link only. */
export const hiveEntrySchema = z.object({
  title: z.string().trim().min(1).max(TITLE_MAX),
  authors: z.array(z.string().trim().min(1)).min(1),
  category: z.string().trim().min(1).max(CATEGORY_MAX),
  published: isoDate,
  url: hiveUrl,
});
export type HiveEntry = z.infer<typeof hiveEntrySchema>;

/** `src/data/hive-activity.json` */
export const hiveSnapshotSchema = z.object({
  updated: isoDate,
  entries: z.array(hiveEntrySchema).max(MAX_ENTRIES),
}).superRefine((snapshot, ctx) => {
  const seen = new Set<string>();
  snapshot.entries.forEach((entry, index) => {
    // Zod still runs this refinement when an entry failed; its own issue already reports a bad link.
    if (!isHiveUrl(entry.url)) return;
    const url = normaliseHiveUrl(entry.url);
    if (seen.has(url)) ctx.addIssue({ code: 'custom', path: ['entries', index, 'url'], message: `Duplicate Hive link ${url}` });
    seen.add(url);
    const previous = snapshot.entries[index - 1];
    if (previous && previous.published < entry.published) {
      ctx.addIssue({ code: 'custom', path: ['entries', index, 'published'], message: 'Entries must be sorted newest first' });
    }
  });
});
export type HiveSnapshot = z.infer<typeof hiveSnapshotSchema>;

/** `src/data/hive-optout.json`: authors and links to leave out. */
export const hiveOptOutSchema = z.object({
  authors: z.array(z.string().trim().min(1)),
  urls: z.array(hiveUrl),
});
export type HiveOptOut = z.infer<typeof hiveOptOutSchema>;

/**
 * Validates the parsed contents of a data file against `schema`; throws an error that names `file`
 * and lists every problem. The build's loader and `hive:import` both read the data files through it.
 */
export function validateDataFile<T>(schema: z.ZodType<T>, data: unknown, file: string): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new Error(`${file} is not valid:\n${z.prettifyError(result.error)}`);
  return result.data;
}
