/**
 * `deno task hive:import <file>… [--dry-run]`: refreshes `src/data/hive-activity.json` from RSS or
 * Atom files saved from Hive in a browser. It reads local files only; it never requests anything
 * from Hive (the task has no `--allow-net`).
 */
import { join, resolve } from 'jsr:@std/path@^1';
import { z } from 'astro/zod';
import { type HiveEntry, type HiveOptOut, hiveOptOutSchema, type HiveSnapshot, hiveSnapshotSchema, MAX_ENTRIES } from '../../src/lib/hive-schema.ts';
import { feedItemsToEntries, mergeEntries } from '../../src/lib/hive.ts';
import { parseFeed } from './feed.ts';

const SNAPSHOT_PATH = 'src/data/hive-activity.json';
const OPT_OUT_PATH = 'src/data/hive-optout.json';
const USAGE = 'Usage: deno task hive:import <file>… [--dry-run]';

/**
 * Parses the feed files and merges their entries into the snapshot, dated `today`. Pure: throws an
 * error naming the file when one is not an RSS or Atom feed.
 */
export function planImport(
  files: { name: string; xml: string }[],
  snapshot: HiveSnapshot,
  optOut: HiveOptOut,
  today: string,
): { snapshot: HiveSnapshot; report: string; skipped: number } {
  const lines: string[] = [];
  const incoming: HiveEntry[] = [];
  let skipped = 0;
  for (const file of files) {
    let feed: ReturnType<typeof parseFeed>;
    try {
      feed = parseFeed(file.xml);
    } catch (error) {
      throw new Error(`${file.name}: ${message(error)}`);
    }
    const mapped = feedItemsToEntries(feed.items, feed.title);
    incoming.push(...mapped.entries);
    skipped += mapped.skipped;
    lines.push(`${file.name}: ${count(feed.items.length, 'item')}, ${count(mapped.entries.length, 'entry', 'entries')}, ${mapped.skipped} skipped`);
  }
  const merged = mergeEntries(snapshot.entries, incoming, optOut);
  const next = hiveSnapshotSchema.parse({ updated: today, entries: merged.entries });
  lines.push(
    section('Added', merged.added),
    section('Updated', merged.updated),
    section('Left out by the opt-out register', merged.optedOut),
    section(`Cut to ${MAX_ENTRIES} entries`, merged.cut),
    `Snapshot: ${count(next.entries.length, 'entry', 'entries')}, updated ${today}.`,
  );
  return { snapshot: next, report: lines.join('\n'), skipped };
}

export interface MainOptions {
  /** The repository root the data files and relative feed paths resolve against. */
  root?: string;
  /** ISO date for `updated`; defaults to today in UTC. */
  today?: string;
  log?: (line: string) => void;
  error?: (line: string) => void;
}

/** Runs the command; returns the exit code (0 ok, 1 error, 2 usage). */
export async function main(args: string[], options: MainOptions = {}): Promise<number> {
  const { root = Deno.cwd(), today = new Date().toISOString().slice(0, 10), log = console.log, error = console.error } = options;
  const flags = args.filter((arg) => arg.startsWith('--'));
  const paths = args.filter((arg) => !arg.startsWith('--'));
  if (paths.length === 0 || flags.some((flag) => flag !== '--dry-run')) {
    error(USAGE);
    return 2;
  }
  const dryRun = flags.includes('--dry-run');
  try {
    const files = await Promise.all(paths.map(async (path) => ({ name: path, xml: await readFile(resolve(root, path), path) })));
    const snapshot = await readJson(root, SNAPSHOT_PATH, hiveSnapshotSchema);
    const optOut = await readJson(root, OPT_OUT_PATH, hiveOptOutSchema);
    const plan = planImport(files, snapshot, optOut, today);
    log(plan.report);
    if (dryRun) {
      log(`Dry run: ${SNAPSHOT_PATH} not written.`);
    } else {
      await Deno.writeTextFile(join(root, SNAPSHOT_PATH), JSON.stringify(plan.snapshot, null, 2) + '\n');
      log(`Wrote ${SNAPSHOT_PATH}.`);
    }
    return 0;
  } catch (err) {
    error(`error: ${message(err)}`);
    return 1;
  }
}

async function readFile(path: string, name: string): Promise<string> {
  try {
    return await Deno.readTextFile(path);
  } catch (error) {
    throw new Error(`${name}: ${message(error)}`);
  }
}

async function readJson<T>(root: string, path: string, schema: z.ZodType<T>): Promise<T> {
  const text = await readFile(join(root, path), path);
  try {
    return schema.parse(JSON.parse(text));
  } catch (error) {
    throw new Error(`${path}: ${message(error)}`);
  }
}

function section(label: string, titles: string[]): string {
  return titles.length === 0 ? `${label}: none` : [`${label} (${titles.length}):`, ...titles.map((title) => `  ${title}`)].join('\n');
}

function count(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function message(error: unknown): string {
  return error instanceof z.ZodError ? z.prettifyError(error).replaceAll('\n', ' ') : error instanceof Error ? error.message : String(error);
}

if (import.meta.main) Deno.exit(await main(Deno.args));
