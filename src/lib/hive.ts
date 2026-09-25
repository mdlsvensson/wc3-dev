import { CATEGORY_MAX, type HiveEntry, type HiveOptOut, type HiveSnapshot, isHiveUrl, MAX_ENTRIES, normaliseHiveUrl, TITLE_MAX } from './hive-schema.ts';

export { normaliseHiveUrl };

/** Where authors and Hive staff ask to be left out. One place, so an email can be added later. */
export const HIVE_CONTACT_URL = 'https://github.com/mdlsvensson/wc3-dev/issues';

const DAY = 86_400_000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Whether any of the entry's authors, or its link, is in the opt-out register. */
export function isOptedOut(entry: HiveEntry, optOut: HiveOptOut): boolean {
  return optOutMatcher(optOut)(entry);
}

/** A test for the opt-out register, with its author names and links folded once. */
function optOutMatcher(optOut: HiveOptOut): (entry: HiveEntry) => boolean {
  const authors = new Set(optOut.authors.map(foldName));
  const urls = new Set(optOut.urls.map(normaliseHiveUrl));
  return (entry) => entry.authors.some((author) => authors.has(foldName(author))) || urls.has(normaliseHiveUrl(entry.url));
}

/**
 * Throws, naming every entry that the opt-out register covers; the build runs this on the snapshot.
 * `snapshotFile` is the file the snapshot was read from, for the message.
 */
export function assertNoOptOuts(snapshot: HiveSnapshot, optOut: HiveOptOut, snapshotFile = 'src/data/hive-activity.json'): void {
  const optedOut = optOutMatcher(optOut);
  const titles = snapshot.entries.filter(optedOut).map((entry) => entry.title);
  if (titles.length === 0) return;
  const [verb, pronoun] = titles.length === 1 ? ['is', 'it'] : ['are', 'them'];
  throw new Error(
    `${titles.join(', ')} ${verb} in src/data/hive-optout.json; run \`deno task hive:import\` (no feed files needed) to drop ${pronoun}, or remove ${pronoun} from ${snapshotFile} by hand`,
  );
}

/** An item as `scripts/hive/feed.ts` reads it from an RSS or Atom feed. */
export interface FeedItem {
  title?: string;
  authors: string[];
  categories: string[];
  published?: string;
  link?: string;
}

/** Maps feed items to entries; items without a title, author, Hive link or readable date are skipped. */
export function feedItemsToEntries(items: FeedItem[], feedTitle: string): { entries: HiveEntry[]; skipped: number } {
  const entries: HiveEntry[] = [];
  let skipped = 0;
  const fallbackCategory = feedCategory(feedTitle);
  for (const item of items) {
    const title = item.title?.trim();
    const authors = [...new Set(item.authors.map((author) => author.trim()).filter(Boolean))];
    const category = item.categories.map((c) => c.trim()).find(Boolean) ?? fallbackCategory;
    const published = item.published ? isoDay(item.published) : undefined;
    const link = item.link?.trim();
    if (!title || authors.length === 0 || !category || !published || !link || !isHiveUrl(link)) {
      skipped++;
      continue;
    }
    entries.push({
      title: clip(title, TITLE_MAX),
      authors,
      category: clip(category, CATEGORY_MAX),
      published,
      url: normaliseHiveUrl(link),
    });
  }
  return { entries, skipped };
}

/**
 * Merges incoming entries into existing ones: incoming replaces existing by link, opted-out
 * entries are dropped, the rest is sorted newest first (then by title) and cut to `MAX_ENTRIES`.
 * The lists report titles: `added` and `updated` count only entries that survive the cut.
 */
export function mergeEntries(existing: HiveEntry[], incoming: HiveEntry[], optOut: HiveOptOut): {
  entries: HiveEntry[];
  added: string[];
  updated: string[];
  optedOut: string[];
  cut: string[];
} {
  const before = new Map(existing.map((entry) => [normaliseHiveUrl(entry.url), entry]));
  const byUrl = new Map<string, HiveEntry>();
  for (const entry of [...existing, ...incoming]) {
    const url = normaliseHiveUrl(entry.url);
    byUrl.set(url, { ...entry, url });
  }
  const isOut = optOutMatcher(optOut);
  const optedOut: string[] = [];
  const kept: HiveEntry[] = [];
  for (const entry of byUrl.values()) {
    if (isOut(entry)) optedOut.push(entry.title);
    else kept.push(entry);
  }
  kept.sort((a, b) => (a.published === b.published ? compareText(a.title, b.title) : a.published < b.published ? 1 : -1));
  const entries = kept.slice(0, MAX_ENTRIES);
  const cut = kept.slice(MAX_ENTRIES).map((entry) => entry.title);
  const added: string[] = [];
  const updated: string[] = [];
  for (const entry of entries) {
    const previous = before.get(entry.url);
    if (!previous) added.push(entry.title);
    else if (!sameEntry(previous, entry)) updated.push(entry.title);
  }
  return { entries, added, updated, optedOut, cut };
}

/** 'today', 'yesterday', '3 days ago', '2 weeks ago', '5 months ago', '2 years ago'. */
export function relativeAge(published: string, now: Date): string {
  const days = Math.max(0, daysBetween(published, now));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return plural(Math.floor(days / 7), 'week');
  if (days < 365) return plural(Math.min(11, Math.max(1, Math.floor(days / 30.4375))), 'month');
  return plural(Math.floor(days / 365), 'year');
}

/**
 * What the views show: entries with their age, whether the snapshot is over 30 days old, its date,
 * and the line both views print under their heading.
 */
export function hiveView(snapshot: HiveSnapshot, now: Date, limit?: number): {
  entries: (HiveEntry & { age: string })[];
  stale: boolean;
  updatedLabel: string;
  updatedLine: string;
} {
  const entries = (limit === undefined ? snapshot.entries : snapshot.entries.slice(0, limit))
    .map((entry) => ({ ...entry, age: relativeAge(entry.published, now) }));
  const stale = daysBetween(snapshot.updated, now) > 30;
  const updatedLabel = longDate(snapshot.updated);
  const updatedLine = `From Hive Workshop, ${stale ? 'last updated' : 'updated'} ${updatedLabel}.`;
  return { entries, stale, updatedLabel, updatedLine };
}

/** Whole UTC days from an ISO date to `now`'s UTC date. */
function daysBetween(isoDate: string, now: Date): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - Date.parse(`${isoDate}T00:00:00Z`)) / DAY);
}

/** An ISO date as '25 September 2026'. */
export function longDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** The UTC date part of a feed date, or undefined when it cannot be read. */
function isoDay(value: string): string | undefined {
  const text = value.trim();
  // ISO 8601 ('2026-09-24…') or RFC 822 ('Thu, 24 Sep 2026 …'); Date.parse alone accepts '1' or 'Sep 2026'.
  if (!/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(text) && !/^(?:[A-Za-z]{3},\s*)?\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\b/.test(text)) return undefined;
  const time = Date.parse(text);
  if (Number.isNaN(time)) return undefined;
  const day = new Date(time).toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined;
}

/** A feed's title as a category: "Hive Workshop - Models" and "Models | Hive Workshop" become "Models". */
function feedCategory(feedTitle: string): string {
  return feedTitle.trim().replace(/^hive\s*workshop\s*[-:|–]\s*/i, '').replace(/\s*[-|–]\s*hive(\s*workshop)?$/i, '').trim();
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
}

/** Shortens to at most `max` UTF-16 units (Zod's measure) without splitting a code point. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  let out = '';
  for (const char of Array.from(text)) {
    if (out.length + char.length > max - 1) break;
    out += char;
  }
  return `${out.trimEnd()}…`;
}

function foldName(name: string): string {
  return name.trim().toLowerCase();
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'en');
}

function sameEntry(a: HiveEntry, b: HiveEntry): boolean {
  return a.title === b.title && a.category === b.category && a.published === b.published &&
    a.authors.length === b.authors.length && a.authors.every((author, i) => author === b.authors[i]);
}
