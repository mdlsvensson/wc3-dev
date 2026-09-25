import { type HiveEntry, type HiveOptOut, type HiveSnapshot, isHiveUrl, MAX_ENTRIES, normaliseHiveUrl } from './hive-schema.ts';

export { normaliseHiveUrl };

/** Where authors and Hive staff ask to be left out. One place, so an email can be added later. */
export const HIVE_CONTACT_URL = 'https://github.com/mdlsvensson/wc3-dev/issues';

const DAY = 86_400_000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TITLE_MAX = 120;
const CATEGORY_MAX = 40;

/** Whether any of the entry's authors, or its link, is in the opt-out register. */
export function isOptedOut(entry: HiveEntry, optOut: HiveOptOut): boolean {
  const authors = new Set(optOut.authors.map(foldName));
  if (entry.authors.some((author) => authors.has(foldName(author)))) return true;
  const url = normaliseHiveUrl(entry.url);
  return optOut.urls.some((blocked) => normaliseHiveUrl(blocked) === url);
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
  const optedOut: string[] = [];
  const kept: HiveEntry[] = [];
  for (const entry of byUrl.values()) {
    if (isOptedOut(entry, optOut)) optedOut.push(entry.title);
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

/** What the views show: entries with their age, whether the snapshot is over 30 days old, and its date. */
export function hiveView(snapshot: HiveSnapshot, now: Date, limit?: number): {
  entries: (HiveEntry & { age: string })[];
  stale: boolean;
  updatedLabel: string;
} {
  const entries = (limit === undefined ? snapshot.entries : snapshot.entries.slice(0, limit))
    .map((entry) => ({ ...entry, age: relativeAge(entry.published, now) }));
  return { entries, stale: daysBetween(snapshot.updated, now) > 30, updatedLabel: longDate(snapshot.updated) };
}

/** Whole UTC days from an ISO date to `now`'s UTC date. */
function daysBetween(isoDate: string, now: Date): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - Date.parse(`${isoDate}T00:00:00Z`)) / DAY);
}

/** '25 September 2026' */
function longDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** The UTC date part of a feed date, or undefined when it cannot be read. */
function isoDay(value: string): string | undefined {
  const time = Date.parse(value.trim());
  return Number.isNaN(time) ? undefined : new Date(time).toISOString().slice(0, 10);
}

/** A feed's title as a category: "Hive Workshop - Models" and "Models | Hive Workshop" become "Models". */
function feedCategory(feedTitle: string): string {
  return feedTitle.trim().replace(/^hive\s*workshop\s*[-:|–]\s*/i, '').replace(/\s*[-|–]\s*hive(\s*workshop)?$/i, '').trim();
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
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
