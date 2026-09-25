import { strict as assert } from 'node:assert';
import { join } from 'jsr:@std/path@^1';
import type { HiveEntry, HiveSnapshot } from '../../src/lib/hive-schema.ts';
import { parseFeed } from './feed.ts';
import { main, planImport } from './import.ts';

const testdata = new URL('./testdata/', import.meta.url);
const read = (name: string) => Deno.readTextFile(new URL(name, testdata));
const noOptOut = { authors: [], urls: [] };

const entry = (n: number, published: string, extra: Partial<HiveEntry> = {}): HiveEntry => ({
  title: `Old ${n}`,
  authors: ['Author'],
  category: 'Models',
  published,
  url: `https://www.hiveworkshop.com/threads/old.${n}/`,
  ...extra,
});

Deno.test('parseFeed reads RSS 2.0', async () => {
  const feed = parseFeed(await read('rss.xml'));
  assert.equal(feed.title, 'Hive Workshop - Models');
  assert.deepEqual(feed.items, [
    {
      title: 'Footman (HD) & Knight',
      authors: ['Tauren Maker'],
      categories: ['Units', 'Human'],
      published: 'Thu, 24 Sep 2026 21:30:00 -0300',
      link: 'https://www.hiveworkshop.com/threads/footman-hd.123456/?utm_source=rss',
    },
    {
      title: 'Mirror of a Hive model',
      authors: ['Somebody Else'],
      categories: [],
      published: 'Wed, 23 Sep 2026 10:00:00 +0000',
      link: 'https://example.com/mirror/footman/',
    },
    {
      title: '1234',
      authors: ['Grunt Smith'],
      categories: [],
      published: 'Tue, 22 Sep 2026 08:15:00 +0000',
      link: 'https://hiveworkshop.com/threads/1234.123457/',
    },
  ]);
});

Deno.test('parseFeed reads Atom', async () => {
  const feed = parseFeed(await read('atom.xml'));
  assert.equal(feed.title, 'Hive Workshop | Tutorials');
  assert.deepEqual(feed.items, [
    {
      title: 'Triggers & Variables for Beginners',
      authors: ['Paladin Writer', 'Co Author'],
      categories: ['Triggers (GUI)'],
      published: '2026-09-24T09:00:00Z',
      link: 'https://www.hiveworkshop.com/threads/triggers-variables.200001/',
    },
    {
      title: 'Terrain Basics',
      authors: ['Ground Shaper'],
      categories: [],
      published: '2026-09-20T18:45:00+02:00',
      link: 'https://www.hiveworkshop.com/threads/terrain-basics.200002/',
    },
  ]);
});

Deno.test('parseFeed rejects anything but RSS or Atom', async () => {
  const html = await read('not-a-feed.html');
  assert.throws(() => parseFeed(html), /Not an RSS or Atom feed/);
  assert.throws(() => parseFeed('{"items": []}'), /Not an RSS or Atom feed/);
  assert.throws(() => parseFeed('<rss><channel><item>'), /Not an RSS or Atom feed/);
  assert.throws(() => parseFeed(''), /Not an RSS or Atom feed/);
});

Deno.test('planImport maps, merges and reports', async () => {
  const files = [{ name: 'rss.xml', xml: await read('rss.xml') }, { name: 'atom.xml', xml: await read('atom.xml') }];
  // 29 old entries plus one the Atom feed updates: 30 in all, so every addition cuts an old one.
  const existing: HiveSnapshot = {
    updated: '2026-09-01',
    entries: [
      entry(0, '2026-09-24', { title: 'Old title', url: 'https://www.hiveworkshop.com/threads/triggers-variables.200001/', category: 'Triggers (GUI)' }),
      ...Array.from({ length: 29 }, (_, i) => entry(i + 1, `2026-08-${String(29 - i).padStart(2, '0')}`)),
    ],
  };
  const optOut = { authors: ['ground shaper'], urls: [] };
  const plan = planImport(files, existing, optOut, '2026-09-25');

  assert.equal(plan.skipped, 1);
  assert.equal(plan.snapshot.updated, '2026-09-25');
  assert.equal(plan.snapshot.entries.length, 30);
  assert.deepEqual(plan.snapshot.entries.slice(0, 3), [
    {
      title: 'Footman (HD) & Knight',
      authors: ['Tauren Maker'],
      category: 'Units',
      published: '2026-09-25',
      url: 'https://www.hiveworkshop.com/threads/footman-hd.123456/',
    },
    {
      title: 'Triggers & Variables for Beginners',
      authors: ['Paladin Writer', 'Co Author'],
      category: 'Triggers (GUI)',
      published: '2026-09-24',
      url: 'https://www.hiveworkshop.com/threads/triggers-variables.200001/',
    },
    {
      title: '1234',
      authors: ['Grunt Smith'],
      category: 'Models',
      published: '2026-09-22',
      url: 'https://www.hiveworkshop.com/threads/1234.123457/',
    },
  ]);
  assert.equal(plan.snapshot.entries.at(-1)!.title, 'Old 27');

  const report = plan.report;
  assert.match(report, /rss\.xml: 3 items, 2 entries, 1 skipped/);
  assert.match(report, /atom\.xml: 2 items, 2 entries/);
  assert.match(report, /Added \(2\):\n {2}Footman \(HD\) & Knight\n {2}1234\n/);
  assert.match(report, /Updated \(1\):\n {2}Triggers & Variables for Beginners\n/);
  assert.match(report, /Left out by the opt-out register \(1\):\n {2}Terrain Basics\n/);
  assert.match(report, /Cut to 30 entries \(2\):\n {2}Old 28\n {2}Old 29\n/);
  assert.match(report, /30 entries, updated 2026-09-25/);
});

Deno.test('planImport with nothing new reports none', async () => {
  const plan = planImport([{ name: 'atom.xml', xml: await read('atom.xml') }], { updated: '2026-09-01', entries: [] }, noOptOut, '2026-09-25');
  assert.equal(plan.skipped, 0);
  assert.equal(plan.snapshot.entries.length, 2);
  assert.match(plan.report, /Updated: none/);
  assert.match(plan.report, /Cut to 30 entries: none/);
});

Deno.test('planImport names a file that is not a feed', async () => {
  const xml = await read('not-a-feed.html');
  assert.throws(
    () => planImport([{ name: 'saved.html', xml }], { updated: '2026-09-01', entries: [] }, noOptOut, '2026-09-25'),
    /saved\.html: Not an RSS or Atom feed/,
  );
});

/** A temp dir laid out like the repo, with the data files and the fixtures. */
async function repo(): Promise<{ root: string; data: string; optOut: string }> {
  const root = await Deno.makeTempDir();
  await Deno.mkdir(join(root, 'src/data'), { recursive: true });
  const data = JSON.stringify({ updated: '2026-09-01', entries: [entry(1, '2026-08-30')] }, null, 2) + '\n';
  const optOut = JSON.stringify({ authors: [], urls: [] }, null, 2) + '\n';
  await Deno.writeTextFile(join(root, 'src/data/hive-activity.json'), data);
  await Deno.writeTextFile(join(root, 'src/data/hive-optout.json'), optOut);
  for (const name of ['rss.xml', 'atom.xml', 'not-a-feed.html']) await Deno.writeTextFile(join(root, name), await read(name));
  return { root, data, optOut };
}

function capture() {
  const lines: string[] = [];
  return { lines, log: (line: string) => lines.push(line) };
}

Deno.test('the CLI with --dry-run reports and leaves the data files untouched', async () => {
  const { root, data, optOut } = await repo();
  const out = capture();
  const code = await main(['rss.xml', '--dry-run'], { root, today: '2026-09-25', log: out.log, error: out.log });
  assert.equal(code, 0);
  const text = out.lines.join('\n');
  assert.match(text, /Added \(2\)/);
  assert.match(text, /Dry run: src\/data\/hive-activity\.json not written/);
  assert.equal(await Deno.readTextFile(join(root, 'src/data/hive-activity.json')), data);
  assert.equal(await Deno.readTextFile(join(root, 'src/data/hive-optout.json')), optOut);
});

Deno.test('the CLI writes the snapshot as pretty JSON', async () => {
  const { root } = await repo();
  const out = capture();
  assert.equal(await main(['rss.xml', 'atom.xml'], { root, today: '2026-09-25', log: out.log, error: out.log }), 0);
  const written = await Deno.readTextFile(join(root, 'src/data/hive-activity.json'));
  const snapshot = JSON.parse(written) as HiveSnapshot;
  assert.equal(written, JSON.stringify(snapshot, null, 2) + '\n');
  assert.equal(snapshot.updated, '2026-09-25');
  assert.equal(snapshot.entries.length, 5);
  assert.match(out.lines.join('\n'), /Wrote src\/data\/hive-activity\.json/);
});

Deno.test('the CLI names a bad or missing file and writes nothing', async () => {
  const { root, data } = await repo();
  for (const [args, pattern] of [
    [['rss.xml', 'not-a-feed.html'], /not-a-feed\.html: Not an RSS or Atom feed/],
    [['rss.xml', 'missing.xml'], /missing\.xml: /],
  ] as const) {
    const out = capture();
    assert.equal(await main([...args], { root, today: '2026-09-25', log: out.log, error: out.log }), 1);
    assert.match(out.lines.join('\n'), pattern);
    assert.equal(await Deno.readTextFile(join(root, 'src/data/hive-activity.json')), data);
  }
});

Deno.test('the CLI rejects missing files and unknown flags with usage', async () => {
  const { root } = await repo();
  for (const args of [[], ['--dry-run'], ['rss.xml', '--force']]) {
    const out = capture();
    assert.equal(await main(args, { root, log: out.log, error: out.log }), 2);
    assert.match(out.lines.join('\n'), /Usage: deno task hive:import/);
  }
});

Deno.test('the CLI names an invalid data file', async () => {
  const { root } = await repo();
  await Deno.writeTextFile(join(root, 'src/data/hive-optout.json'), '{ "authors": "nobody" }');
  const out = capture();
  assert.equal(await main(['rss.xml'], { root, today: '2026-09-25', log: out.log, error: out.log }), 1);
  assert.match(out.lines.join('\n'), /src\/data\/hive-optout\.json: /);
});
