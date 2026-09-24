import { strict as assert } from 'node:assert';
import { join } from 'jsr:@std/path@^1';
import { checkTutorials, formatReport } from './check.ts';

const lesson = (order: number, body: string, extra = '') => `---
title: A lesson
summary: What it teaches.
order: ${order}
minutes: 10
goals:
  - Learn a thing${extra}
---

${body}
`;

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await Deno.makeTempDir();
  for (const [path, content] of Object.entries(files)) {
    await Deno.mkdir(join(root, path, '..'), { recursive: true });
    await Deno.writeTextFile(join(root, path), content);
  }
  return root;
}

Deno.test('a valid track reports shots and verify notes without errors', async () => {
  const root = await fixture({
    'basics/intro.md': lesson(1, '## Start\n\n::shot[The main window]{src="./intro/main.png"}\n\n::shot[The palette]{src="./intro/palette.png"}\n\n<!-- verify: F4 opens the Trigger Editor -->'),
    'basics/intro/main.png': 'png',
    'basics/tour.md': lesson(2, '## Tour\n\n:::steps\n1. Do a thing.\n:::\n\n::::tip[Nested]\n:::caution\nCareful.\n:::\n::::\n\n```md\n::shot[Inside a code block]{src="./nowhere.png"}\n:::warning\n```'),
    'next.md': '---\ntitle: Where to go next\nsummary: Onward.\n---\n\n## Hive\n',
  });
  const report = await checkTutorials(root, ['basics']);
  assert.deepEqual(report.errors, []);
  assert.equal(report.lessons, 2);
  assert.equal(report.shots, 2);
  assert.deepEqual(report.missing, [{ page: 'basics/intro', src: './intro/palette.png', note: 'The palette' }]);
  assert.deepEqual(report.verify, [{ page: 'basics/intro', note: 'F4 opens the Trigger Editor' }]);
  const text = formatReport(report);
  assert.match(text, /1 of 2 screenshots captured/);
  assert.match(text, /\.\/intro\/palette\.png: The palette/);
  assert.match(text, /F4 opens the Trigger Editor/);
});

Deno.test('structural problems are errors', async () => {
  const root = await fixture({
    'basics/intro.md': lesson(1, 'No sections here.'),
    'basics/Bad_Name.md': lesson(2, '## A'),
    'basics/dupe.md': lesson(1, '## B\n\n::shot[Wrong folder]{src="./elsewhere/x.png"}'),
    'basics/broken.md': '---\ntitle: Missing fields\n---\n\n## C\n',
    'basics/aside.md': lesson(3, '## E\n\n:::warning[Careful]\nText.\n:::'),
    'cinematics/intro.md': lesson(1, '## D'),
    'next.md': '---\ntitle: Where to go next\n---\n',
  });
  const report = await checkTutorials(root, ['basics', 'terrain']);
  const expect = (pattern: RegExp) => assert(report.errors.some((error) => pattern.test(error)), `Expected an error matching ${pattern}:\n${report.errors.join('\n')}`);
  expect(/^basics\/intro\.md: .*"## "/);
  expect(/^basics\/Bad_Name\.md: file name/);
  expect(/^basics\/(dupe|intro)\.md: order 1 is also used by basics\/(dupe|intro)/);
  expect(/^basics\/dupe\.md: .*\.\/dupe\//);
  expect(/^basics\/broken\.md: /);
  expect(/^basics\/aside\.md: unknown directive ":::warning"/);
  expect(/^cinematics\/: not a chapter/);
  expect(/^terrain\/: chapter has no lessons/);
  expect(/^next\.md: /);
});
