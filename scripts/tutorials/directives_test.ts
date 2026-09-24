import { strict as assert } from 'node:assert';
import { join, toFileUrl } from 'jsr:@std/path@^1';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { isTutorialFile, tutorialDirectives } from '../../src/markdown/tutorial-directives.ts';

const processor = await createSatteriMarkdownProcessor({ mdastPlugins: [tutorialDirectives], features: { directive: true } });

// A lesson at <temp>/src/content/tutorials/terrain/water.md with one captured screenshot.
const root = await Deno.makeTempDir();
const chapterDir = join(root, 'src', 'content', 'tutorials', 'terrain');
await Deno.mkdir(join(chapterDir, 'water'), { recursive: true });
await Deno.writeFile(join(chapterDir, 'water', 'river.png'), new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
const lessonURL = toFileUrl(join(chapterDir, 'water.md'));
const docsURL = toFileUrl(join(root, 'src', 'content', 'docs', 'framework', 'docs', 'index.md'));

async function render(markdown: string, fileURL = lessonURL) {
  return await processor.render(markdown, { frontmatter: {}, fileURL });
}
const html = async (markdown: string, fileURL?: URL) => (await render(markdown, fileURL)).code;

Deno.test('only tutorial files are transformed', async () => {
  assert.equal(isTutorialFile(lessonURL), true);
  assert.equal(isTutorialFile(docsURL), false);
  assert.equal(isTutorialFile(undefined), false);
  assert(!(await html('Press :kbd[Ctrl+F9].', docsURL)).includes('<kbd'));
});

Deno.test('keys and menu paths', async () => {
  assert.match(await html('Press :kbd[Ctrl + F9].'), /<kbd class="keys"><kbd>Ctrl<\/kbd>\+<kbd>F9<\/kbd><\/kbd>/);
  assert.match(
    await html('Open :menu[Scenario > Map Options].'),
    /<span class="menu-path"><span>Scenario<\/span><span class="menu-sep" aria-hidden="true">›<\/span><span>Map Options<\/span><\/span>/,
  );
});

Deno.test('steps wrap their ordered list', async () => {
  assert.match(await html(':::steps\n1. First\n2. Second\n:::'), /<div class="tutorial-steps">\s*<ol>\s*<li>First<\/li>/);
});

Deno.test('callouts and checkpoints carry a title, default or custom', async () => {
  const tip = await html(':::tip\nHold Shift.\n:::');
  assert.match(tip, /<aside class="tutorial-callout tutorial-callout-tip">\s*<p class="tutorial-callout-title">Tip<\/p>\s*<p>Hold Shift.<\/p>/);
  const caution = await html(':::caution[Save *first*]\nBack up your map.\n:::');
  assert.match(caution, /<aside class="tutorial-callout tutorial-callout-caution">\s*<p class="tutorial-callout-title">Save <em>first<\/em><\/p>\s*<p>Back up your map.<\/p>/);
  assert.match(await html(':::note\nA note.\n:::'), /tutorial-callout-note/);
  const checkpoint = await html(':::checkpoint\nThe river blocks the way.\n:::');
  assert.match(checkpoint, /<aside class="tutorial-checkpoint">\s*<p class="tutorial-callout-title">Checkpoint: your map now…<\/p>\s*<p>The river blocks the way.<\/p>/);
  assert(!(await html(':::warning\nNot ours.\n:::')).includes('tutorial-callout'), 'Unknown containers are left for Starlight to restore');
});

Deno.test('a captured screenshot becomes an image Astro optimises', async () => {
  const result = await render('::shot[The river and its ford]{src="./water/river.png" caption="The ford is the only crossing."}');
  assert.match(result.code, /<figure class="shot">/);
  assert.match(result.code, /__ASTRO_IMAGE_="[^"]*The river and its ford[^"]*"/);
  assert.match(result.code, /<figcaption>The ford is the only crossing.<\/figcaption>/);
  assert.deepEqual(result.metadata.localImagePaths, ['./water/river.png']);
});

Deno.test('a missing screenshot renders a placeholder with its capture note', async () => {
  const result = await render('::shot[The Terrain Palette with Shallow Water selected]{src="./water/palette.png"}');
  assert.match(result.code, /<figure class="shot shot-missing">/);
  assert.match(result.code, /<span class="shot-flag">Screenshot needed<\/span><span class="shot-note">The Terrain Palette with Shallow Water selected<\/span>/);
  assert(!result.code.includes('<img'));
  assert.deepEqual(result.metadata.localImagePaths, []);
});

Deno.test('a screenshot without a relative src is an error', async () => {
  await assert.rejects(() => render('::shot[No source]'), /::shot needs a src/);
  await assert.rejects(() => render('::shot[Absolute]{src="/images/a.png"}'), /::shot needs a src/);
});

Deno.test('verify notes are removed and docs links reload the page', async () => {
  const output = await html('Press F9.\n\n<!-- verify: F9 opens the Help -->\n\nSee [the docs](/framework/docs/installation/) and [resources](/resources/).');
  assert(!output.includes('verify'), 'Verify notes never reach the page');
  assert.match(output, /<a href="\/framework\/docs\/installation\/" data-astro-reload="">the docs<\/a>/);
  assert.match(output, /<a href="\/resources\/">resources<\/a>/);
});
