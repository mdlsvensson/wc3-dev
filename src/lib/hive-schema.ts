import { z } from 'astro/zod';

export const HIVE_ORIGIN = 'https://www.hiveworkshop.com';
/** Hive also serves its pages without `www`; such links are normalised to `HIVE_ORIGIN`. */
const HIVE_ORIGINS = new Set([HIVE_ORIGIN, 'https://hiveworkshop.com']);
/** The most entries the snapshot keeps. */
export const MAX_ENTRIES = 30;

/** Whether `url` is an https link to Hive Workshop, with or without `www`. */
export function isHiveUrl(url: string): boolean {
  try {
    return HIVE_ORIGINS.has(new URL(url).origin);
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

/** One Hive resource or tutorial: metadata and an outbound link only. */
export const hiveEntrySchema = z.object({
  title: z.string().min(1).max(120),
  authors: z.array(z.string().trim().min(1)).min(1),
  category: z.string().min(1).max(40),
  published: isoDate,
  url: z.url().refine(isHiveUrl, `Hive links must start with ${HIVE_ORIGIN}/`),
});
export type HiveEntry = z.infer<typeof hiveEntrySchema>;

/** `src/data/hive-activity.json` */
export const hiveSnapshotSchema = z.object({
  updated: isoDate,
  entries: z.array(hiveEntrySchema).max(MAX_ENTRIES),
}).superRefine((snapshot, ctx) => {
  const seen = new Set<string>();
  snapshot.entries.forEach((entry, index) => {
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
  urls: z.array(z.url().refine(isHiveUrl, `Hive links must start with ${HIVE_ORIGIN}/`)),
});
export type HiveOptOut = z.infer<typeof hiveOptOutSchema>;
