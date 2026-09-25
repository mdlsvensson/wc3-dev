import { strict as assert } from 'node:assert';
import { type HiveEntry, hiveEntrySchema, hiveOptOutSchema, hiveSnapshotSchema, MAX_ENTRIES, validateDataFile } from '../../src/lib/hive-schema.ts';
import { assertNoOptOuts, feedItemsToEntries, hiveView, isOptedOut, longDate, mergeEntries, normaliseHiveUrl, relativeAge } from '../../src/lib/hive.ts';

const entry = (n: number, published = '2026-09-20', extra: Partial<HiveEntry> = {}): HiveEntry => ({
  title: `Entry ${n}`,
  authors: ['Author'],
  category: 'Models',
  published,
  url: `https://www.hiveworkshop.com/threads/entry.${n}/`,
  ...extra,
});
const noOptOut = { authors: [], urls: [] };
/** `count` entries, newest first, one day apart ending on 2026-09-25. */
const series = (count: number, from = 0) =>
  Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(2026, 8, 25) - i * 86_400_000).toISOString().slice(0, 10);
    return entry(from + i, date);
  });

Deno.test('the entry schema validates URLs, authors and lengths', () => {
  assert.equal(hiveEntrySchema.safeParse(entry(1)).success, true);
  assert.equal(hiveEntrySchema.safeParse(entry(1, '2026-09-20', { url: 'https://hiveworkshop.com/threads/a.1/' })).success, true);
  assert.equal(hiveEntrySchema.safeParse(entry(1, '2026-09-20', { url: 'https://example.com/threads/a.1/' })).success, false);
  assert.equal(hiveEntrySchema.safeParse(entry(1, '2026-09-20', { url: 'http://www.hiveworkshop.com/threads/a.1/' })).success, false);
  assert.equal(hiveEntrySchema.safeParse(entry(1, '2026-09-20', { authors: [] })).success, false);
  assert.equal(hiveEntrySchema.safeParse(entry(1, '2026-09-20', { authors: [''] })).success, false);
  assert.equal(hiveEntrySchema.safeParse(entry(1, '2026-09-20', { title: 'x'.repeat(121) })).success, false);
  assert.equal(hiveEntrySchema.safeParse(entry(1, '2026-09-20', { category: 'x'.repeat(41) })).success, false);
  assert.equal(hiveEntrySchema.safeParse(entry(1, '20 September 2026')).success, false);
});

Deno.test('the snapshot schema enforces the cap, unique URLs and order', () => {
  assert.equal(hiveSnapshotSchema.safeParse({ updated: '2026-09-25', entries: [] }).success, true);
  assert.equal(hiveSnapshotSchema.safeParse({ updated: '2026-09-25', entries: series(MAX_ENTRIES) }).success, true);
  assert.equal(hiveSnapshotSchema.safeParse({ updated: '2026-09-25', entries: series(MAX_ENTRIES + 1) }).success, false);
  const duplicate = { ...entry(2, '2026-09-19'), url: 'https://hiveworkshop.com/threads/entry.1/?page=2' };
  assert.equal(hiveSnapshotSchema.safeParse({ updated: '2026-09-25', entries: [entry(1), duplicate] }).success, false);
  assert.equal(hiveSnapshotSchema.safeParse({ updated: '2026-09-25', entries: [entry(1, '2026-09-01'), entry(2, '2026-09-02')] }).success, false);
  assert.equal(hiveSnapshotSchema.safeParse({ updated: 'yesterday', entries: [] }).success, false);
  assert.equal(hiveOptOutSchema.safeParse({ authors: [], urls: [] }).success, true);
  assert.equal(hiveOptOutSchema.safeParse({ authors: [''], urls: [] }).success, false);
});

Deno.test('normaliseHiveUrl lowercases the host, drops query and fragment, and adds www and a trailing slash', () => {
  assert.equal(normaliseHiveUrl('HTTPS://WWW.HiveWorkshop.com/threads/a.1/?x=1#post'), 'https://www.hiveworkshop.com/threads/a.1/');
  assert.equal(normaliseHiveUrl('https://hiveworkshop.com/threads/a.1'), 'https://www.hiveworkshop.com/threads/a.1/');
  assert.equal(normaliseHiveUrl('https://www.hiveworkshop.com'), 'https://www.hiveworkshop.com/');
});

Deno.test('isOptedOut matches authors case-insensitively and URLs after normalisation', () => {
  const e = entry(1, '2026-09-20', { authors: ['Someone', 'Retera'] });
  assert.equal(isOptedOut(e, { authors: [' retera '], urls: [] }), true);
  assert.equal(isOptedOut(e, { authors: [], urls: ['https://hiveworkshop.com/threads/entry.1/#post-5'] }), true);
  assert.equal(isOptedOut(e, { authors: ['Other'], urls: ['https://www.hiveworkshop.com/threads/entry.2/'] }), false);
});

Deno.test('feedItemsToEntries maps items and skips those without a title, Hive link or date', () => {
  const { entries, skipped } = feedItemsToEntries([
    {
      title: ' Footman (HD) ',
      authors: [' Name ', 'Name', 'Other'],
      categories: ['Models', 'Units'],
      published: 'Thu, 24 Sep 2026 23:30:00 -0200',
      link: 'https://hiveworkshop.com/threads/footman-hd.123456/?utm=1',
    },
    { title: 'Spell pack', authors: ['Caster'], categories: [], published: '2026-09-20T10:00:00Z', link: 'https://www.hiveworkshop.com/threads/spells.9' },
    { authors: ['A'], categories: [], published: '2026-09-20', link: 'https://www.hiveworkshop.com/threads/x.1/' },
    { title: 'Elsewhere', authors: ['A'], categories: [], published: '2026-09-20', link: 'https://example.com/threads/x.1/' },
    { title: 'No date', authors: ['A'], categories: [], published: 'not a date', link: 'https://www.hiveworkshop.com/threads/y.1/' },
    { title: 'No link', authors: ['A'], categories: [] },
  ], 'Spells');
  assert.equal(skipped, 4);
  assert.deepEqual(entries, [
    {
      title: 'Footman (HD)',
      authors: ['Name', 'Other'],
      category: 'Models',
      published: '2026-09-25',
      url: 'https://www.hiveworkshop.com/threads/footman-hd.123456/',
    },
    { title: 'Spell pack', authors: ['Caster'], category: 'Spells', published: '2026-09-20', url: 'https://www.hiveworkshop.com/threads/spells.9/' },
  ]);
  for (const e of entries) assert.equal(hiveEntrySchema.safeParse(e).success, true);
});

Deno.test('mergeEntries replaces by URL, drops opt-outs, sorts and cuts', () => {
  const existing = series(MAX_ENTRIES);
  const replaced = { ...existing[3], url: 'https://hiveworkshop.com/threads/entry.3', title: 'Entry 3 (v2)' };
  const unchanged = existing[4];
  const fresh = entry(100, '2026-09-26');
  const blocked = entry(101, '2026-09-26', { authors: ['Blocked'] });
  const result = mergeEntries(existing, [replaced, unchanged, fresh, blocked], { authors: ['blocked'], urls: [existing[0].url] });
  assert.deepEqual(result.added, ['Entry 100']);
  assert.deepEqual(result.updated, ['Entry 3 (v2)']);
  assert.deepEqual(result.optedOut.sort(), ['Entry 0', 'Entry 101']);
  assert.deepEqual(result.cut, []);
  assert.equal(result.entries.length, MAX_ENTRIES);
  assert.deepEqual(result.entries.slice(0, 3).map((e) => e.title), ['Entry 100', 'Entry 1', 'Entry 2']);
  assert.equal(result.entries[3].url, 'https://www.hiveworkshop.com/threads/entry.3/');
  assert.equal(hiveSnapshotSchema.safeParse({ updated: '2026-09-26', entries: result.entries }).success, true);

  const more = mergeEntries(existing, [entry(200, '2026-09-26'), entry(201, '2026-09-26')], noOptOut);
  assert.deepEqual(more.added, ['Entry 200', 'Entry 201']);
  assert.deepEqual(more.cut, ['Entry 28', 'Entry 29']);
  assert.equal(more.entries.length, MAX_ENTRIES);

  const ties = mergeEntries([], [entry(2, '2026-09-20', { title: 'Beta' }), entry(1, '2026-09-20', { title: 'Alpha' })], noOptOut);
  assert.deepEqual(ties.entries.map((e) => e.title), ['Alpha', 'Beta']);
});

Deno.test('relativeAge reads naturally at the boundaries', () => {
  const now = new Date('2026-09-25T18:00:00Z');
  const ago = (days: number) => relativeAge(new Date(Date.UTC(2026, 8, 25) - days * 86_400_000).toISOString().slice(0, 10), now);
  assert.equal(ago(0), 'today');
  assert.equal(ago(1), 'yesterday');
  assert.equal(ago(6), '6 days ago');
  assert.equal(ago(7), '1 week ago');
  assert.equal(ago(13), '1 week ago');
  assert.equal(ago(14), '2 weeks ago');
  assert.equal(ago(30), '1 month ago');
  assert.equal(ago(160), '5 months ago');
  assert.equal(ago(364), '11 months ago');
  assert.equal(ago(365), '1 year ago');
  assert.equal(ago(731), '2 years ago');
  assert.equal(ago(-1), 'today');
});

Deno.test('hiveView adds ages, applies the limit and flags stale snapshots', () => {
  const now = new Date('2026-09-25T12:00:00Z');
  const fresh = hiveView({ updated: '2026-08-26', entries: series(7) }, now, 5);
  assert.equal(fresh.stale, false);
  assert.equal(fresh.updatedLabel, '26 August 2026');
  assert.equal(fresh.updatedLine, 'From Hive Workshop, updated 26 August 2026.');
  assert(!fresh.updatedLine.includes('last'), 'A fresh snapshot does not say "last updated"');
  assert.equal(fresh.entries.length, 5);
  assert.deepEqual(fresh.entries.slice(0, 2).map((e) => e.age), ['today', 'yesterday']);
  assert.equal(fresh.entries[0].url, 'https://www.hiveworkshop.com/threads/entry.0/');

  const stale = hiveView({ updated: '2026-08-25', entries: series(7) }, now);
  assert.equal(stale.stale, true);
  assert.equal(stale.updatedLabel, '25 August 2026');
  assert.equal(stale.updatedLine, 'From Hive Workshop, last updated 25 August 2026.');
  assert.equal(stale.entries.length, 7);

  assert.equal(hiveView({ updated: '2026-09-05', entries: [] }, now).updatedLabel, '5 September 2026');
  assert.equal(longDate('2026-01-09'), '9 January 2026');
});

Deno.test('the schemas reject malformed links, credentials and blank text without throwing', () => {
  for (const url of ['www.hiveworkshop.com/a/', 'nope']) {
    const snapshot = { updated: '2026-09-25', entries: [entry(1), { ...entry(2, '2026-09-19'), url }] };
    assert.equal(hiveSnapshotSchema.safeParse(snapshot).success, false);
  }
  const withCredentials = entry(1, '2026-09-20', { url: 'https://user:secret@www.hiveworkshop.com/threads/a.1/' });
  assert.equal(hiveEntrySchema.safeParse(withCredentials).success, false);
  assert.equal(hiveOptOutSchema.safeParse({ authors: [], urls: ['https://user@hiveworkshop.com/threads/a.1/'] }).success, false);
  const badLink = hiveEntrySchema.safeParse(entry(1, '2026-09-20', { url: 'https://example.com/a/' }));
  assert.match(badLink.error?.issues[0].message ?? '', /https:\/\/www\.hiveworkshop\.com\/… or https:\/\/hiveworkshop\.com\/…/);
  assert.equal(hiveEntrySchema.safeParse(entry(1, '2026-09-20', { title: '   ' })).success, false);
  assert.equal(hiveEntrySchema.safeParse(entry(1, '2026-09-20', { category: ' \t' })).success, false);
});

Deno.test('feedItemsToEntries rejects vague dates, strips the feed title and clips without splitting emoji', () => {
  const item = (published: string, title = 'T') => ({ title, authors: ['A'], categories: [], published, link: 'https://www.hiveworkshop.com/threads/t.1/' });
  const vague = feedItemsToEntries([item('1'), item('Sep 2026'), item('2026-09')], 'Models');
  assert.deepEqual(vague, { entries: [], skipped: 3 });
  const dated = feedItemsToEntries([item('2026-09-24'), item('2026-09-24T23:00:00-02:00'), item('24 Sep 2026 10:00 GMT')], 'Hive Workshop - Models');
  assert.deepEqual(dated.entries.map((e) => [e.published, e.category]), [
    ['2026-09-24', 'Models'],
    ['2026-09-25', 'Models'],
    ['2026-09-24', 'Models'],
  ]);
  const long = feedItemsToEntries([item('2026-09-24', `${'x'.repeat(118)}😀😀😀`)], 'Models').entries[0];
  assert.equal(long.title, `${'x'.repeat(118)}…`);
  assert.equal(long.title.length <= 120, true);
  const emoji = feedItemsToEntries([item('2026-09-24', `${'x'.repeat(117)}😀😀😀`)], 'Models').entries[0];
  assert.equal(emoji.title, `${'x'.repeat(117)}😀…`);
  assert.equal(hiveEntrySchema.safeParse(emoji).success, true);
});

Deno.test('assertNoOptOuts passes a clean snapshot and names every opted-out entry', () => {
  const snapshot = { updated: '2026-09-25', entries: series(3) };
  assertNoOptOuts(snapshot, noOptOut);
  assert.throws(
    () => assertNoOptOuts(snapshot, { authors: [' AUTHOR '], urls: [] }),
    /Entry 0, Entry 1, Entry 2 are in src\/data\/hive-optout\.json; run `deno task hive:import` \(no feed files needed\) to drop them, or remove them from src\/data\/hive-activity\.json by hand/,
  );
  assert.throws(
    () => assertNoOptOuts(snapshot, { authors: [], urls: ['https://hiveworkshop.com/threads/entry.1?page=2'] }, 'src/data/_fixtures/hive-activity.json'),
    /^Error: Entry 1 is in src\/data\/hive-optout\.json; run `deno task hive:import` \(no feed files needed\) to drop it, or remove it from src\/data\/_fixtures\/hive-activity\.json by hand$/,
  );
});

Deno.test('the committed snapshot, fixture and opt-out register are valid and agree', async () => {
  const read = async (path: string) => JSON.parse(await Deno.readTextFile(new URL(`../../${path}`, import.meta.url)));
  const optOut = validateDataFile(hiveOptOutSchema, await read('src/data/hive-optout.json'), 'src/data/hive-optout.json');
  for (const path of ['src/data/hive-activity.json', 'src/data/_fixtures/hive-activity.json']) {
    assertNoOptOuts(validateDataFile(hiveSnapshotSchema, await read(path), path), optOut, path);
  }
});

Deno.test('validateDataFile names the file and lists the problems', () => {
  assert.throws(
    () => validateDataFile(hiveOptOutSchema, { authors: 'nobody' }, 'src/data/hive-optout.json'),
    /^Error: src\/data\/hive-optout\.json is not valid:\n[\s\S]*authors[\s\S]*urls/,
  );
});
