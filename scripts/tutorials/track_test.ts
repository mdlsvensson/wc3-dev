import { strict as assert } from 'node:assert';
import { lessonSchema, tutorialPageSchema } from '../../src/lib/tutorial-schema.ts';
import { buildTrack, formatMinutes, pager, sectionHeadings } from '../../src/lib/tutorials.ts';

const chapters = [
  { slug: 'basics', title: 'Basics', summary: 'First.' },
  { slug: 'terrain', title: 'Terrain', summary: 'Second.' },
];
const lesson = (id: string, order: number, minutes = 10) => ({
  id,
  data: { title: `Title ${id}`, summary: 'Summary.', order, minutes, goals: ['Goal'] },
});
const closing = { href: '/learn/next/', title: 'Where to go next' };

Deno.test('buildTrack orders lessons by chapter, then order, and sums chapter minutes', () => {
  const track = buildTrack(chapters, [
    lesson('terrain/water', 2, 5),
    lesson('basics/tour', 2),
    lesson('terrain/tiles', 1, 15),
    lesson('basics/install', 1),
  ]);
  assert.deepEqual(track.lessons.map((entry) => entry.id), ['basics/install', 'basics/tour', 'terrain/tiles', 'terrain/water']);
  assert.deepEqual(track.chapters.map((chapter) => [chapter.number, chapter.minutes]), [[1, 20], [2, 20]]);
  const water = track.lessons[3];
  assert.equal(water.href, '/learn/terrain/water/');
  assert.equal(water.chapter, 'terrain');
  assert.equal(water.slug, 'water');
  assert.equal(water.chapterNumber, 2);
  assert.equal(water.entry.id, 'terrain/water');
});

Deno.test('buildTrack rejects unknown chapters and repeated orders', () => {
  assert.throws(() => buildTrack(chapters, [lesson('cinematics/intro', 1)]), /cinematics\/intro/);
  assert.throws(() => buildTrack(chapters, [lesson('basics/a', 1), lesson('basics/b', 1)]), /share order 1/);
});

Deno.test('pager links the overview, crosses chapters, and ends at the closing page', () => {
  const track = buildTrack(chapters, [lesson('basics/install', 1), lesson('basics/tour', 2), lesson('terrain/tiles', 1)]);
  assert.deepEqual(pager(track, 'basics/install', closing), {
    previous: { href: '/learn/', title: 'Track overview' },
    next: { href: '/learn/basics/tour/', title: 'Title basics/tour' },
  });
  assert.deepEqual(pager(track, 'terrain/tiles', closing), {
    previous: { href: '/learn/basics/tour/', title: 'Title basics/tour' },
    next: closing,
  });
  assert.throws(() => pager(track, 'basics/missing', closing), /basics\/missing/);
});

Deno.test('section headings keep only h2, and minutes read naturally', () => {
  assert.deepEqual(
    sectionHeadings([
      { depth: 2, slug: 'a', text: 'A' },
      { depth: 3, slug: 'b', text: 'B' },
      { depth: 2, slug: 'c', text: 'C' },
    ]),
    [{ slug: 'a', text: 'A' }, { slug: 'c', text: 'C' }],
  );
  assert.equal(formatMinutes(5), '5 min');
  assert.equal(formatMinutes(60), '1 h');
  assert.equal(formatMinutes(310), '5 h 10 min');
});

Deno.test('lesson frontmatter is validated', () => {
  const valid = { title: 'T', summary: 'S', order: 1, minutes: 10, goals: ['G'] };
  assert.equal(lessonSchema.safeParse(valid).success, true);
  assert.equal(lessonSchema.safeParse({ ...valid, goals: [] }).success, false);
  assert.equal(lessonSchema.safeParse({ ...valid, goals: ['1', '2', '3', '4', '5', '6'] }).success, false);
  assert.equal(lessonSchema.safeParse({ ...valid, order: 0 }).success, false);
  assert.equal(lessonSchema.safeParse({ ...valid, minutes: 2.5 }).success, false);
  assert.equal(lessonSchema.safeParse({ ...valid, summary: 'x'.repeat(201) }).success, false);
  assert.equal(tutorialPageSchema.safeParse({ title: 'T', summary: 'S' }).success, true);
});
