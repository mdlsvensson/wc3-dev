import { strict as assert } from 'node:assert';
import { cjsDefault, cjsNamed, isHandler } from '../../src/scripts/previewers/cjs.ts';
import { fileName, parsePreviewFiles, PREVIEW_KINDS, scriptLanguage } from '../../src/scripts/previewers/files.ts';

Deno.test('parsePreviewFiles reads data-files and derives file names from URLs', () => {
  const raw = JSON.stringify([
    { role: 'model', format: 'mdx', url: 'https://assets.example.test/resources/model/a/0123456789ab/Foot%20man.mdx' },
    { role: 'texture', format: 'blp', url: 'https://assets.example.test/resources/model/a/1123456789ab/Footman.blp' },
    { role: 'broken' },
  ]);
  assert.deepEqual(parsePreviewFiles(raw).map((file) => [file.role, file.name]), [['model', 'Foot man.mdx'], ['texture', 'Footman.blp']]);
  assert.deepEqual(parsePreviewFiles(undefined), []);
  assert.deepEqual(parsePreviewFiles('{not json'), []);
  assert.deepEqual(parsePreviewFiles('{"role":"model"}'), []);
  assert.equal(fileName('https://x.test/a/b/c.lua?v=1'), 'c.lua');
});

Deno.test('resource types map to previewer kinds, and script formats to Shiki languages', () => {
  assert.equal(PREVIEW_KINDS.model, 'model');
  assert.equal(PREVIEW_KINDS.icon, 'image');
  assert.equal(PREVIEW_KINDS.texture, 'image');
  assert.equal(PREVIEW_KINDS.audio, 'audio');
  assert.equal(PREVIEW_KINDS.script, 'script');
  assert.equal(PREVIEW_KINDS.link, undefined);
  assert.equal(scriptLanguage('jass'), 'jass');
  assert.equal(scriptLanguage('lua'), 'lua');
  assert.equal(scriptLanguage('ts'), 'typescript');
});

Deno.test('CommonJS helpers unwrap default and named exports in either module shape', () => {
  class Viewer {}
  const handler = { isValidSource: () => true };
  assert.equal(cjsDefault(Viewer), Viewer);
  assert.equal(cjsDefault({ default: Viewer }), Viewer);
  assert.equal(cjsDefault({ default: { default: Viewer } }), Viewer);
  assert.equal(cjsDefault({ default: handler }, isHandler), handler);
  assert.equal(cjsDefault(handler, isHandler), handler);
  assert.throws(() => cjsDefault({ default: 1 }));
  assert.equal(cjsNamed({ BlpImage: Viewer }, 'BlpImage'), Viewer);
  assert.equal(cjsNamed({ default: { BlpImage: Viewer } }, 'BlpImage'), Viewer);
  assert.throws(() => cjsNamed({}, 'BlpImage'));
});
