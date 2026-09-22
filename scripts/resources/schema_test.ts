import { strict as assert } from 'node:assert';
import { authoredSchema, resourceSchema } from '../../src/lib/resource-schema.ts';

const model = {
  type: 'model',
  title: 'Footman',
  summary: 'A footman.',
  authors: [{ name: 'Blizzard Entertainment' }],
  source: { site: 'hive', url: 'https://www.hiveworkshop.com/threads/footman.1/' },
  compat: { sd: true, hd: true },
  kind: 'unit',
  files: [{ key: 'resources/model/footman/0123456789ab/Footman.mdx', role: 'model', format: 'mdx', bytes: 10 }],
  added: '2026-09-22',
};

const link = {
  type: 'link',
  title: 'Hive Workshop',
  summary: 'The main community hub.',
  source: { site: 'hive', url: 'https://www.hiveworkshop.com/' },
  category: 'Community',
  order: 1,
  added: '2026-09-22',
};

Deno.test('a complete model parses with defaults applied', () => {
  const resource = resourceSchema.parse(model);
  assert.equal(resource.type, 'model');
  assert.deepEqual(resource.tags, []);
  assert.deepEqual(resource.related, []);
  assert.equal(resource.derivative, false);
  assert(resource.type === 'model');
  assert.deepEqual(resource.animations, []);
});

Deno.test('every resource needs a source url', () => {
  assert.throws(() => resourceSchema.parse({ ...model, source: undefined }));
  assert.throws(() => resourceSchema.parse({ ...model, source: { site: 'hive' } }));
  assert.throws(() => resourceSchema.parse({ ...link, source: { site: 'other', url: 'not a url' } }));
});

Deno.test('hosted resources need an author and a file', () => {
  assert.throws(() => resourceSchema.parse({ ...model, authors: [] }));
  assert.throws(() => resourceSchema.parse({ ...model, files: [] }));
});

Deno.test('store keys must follow the resource layout', () => {
  const file = (key: string) => ({ ...model, files: [{ ...model.files[0], key }] });
  assert.throws(() => resourceSchema.parse(file('Footman.mdx')));
  assert.throws(() => resourceSchema.parse(file('resources/model/Footman/0123456789ab/Footman.mdx')));
  assert.throws(() => resourceSchema.parse(file('resources/model/footman/0123/Footman.mdx')));
  assert.doesNotThrow(() => resourceSchema.parse(file('resources/model/footman/0123456789ab/Foot man.mdx')));
});

Deno.test('links need no files, compat, or authors', () => {
  const resource = resourceSchema.parse(link);
  assert.equal(resource.type, 'link');
  assert.deepEqual(resource.authors, []);
});

Deno.test('authored input leaves out generated fields', () => {
  const { files: _files, added: _added, ...authored } = model;
  assert.equal(authoredSchema.parse(authored).type, 'model');
  assert.throws(() => resourceSchema.parse(authored));
});

Deno.test('audio needs a duration once complete', () => {
  const audio = { ...model, type: 'audio', usage: 'sfx', kind: undefined, files: [{ key: 'resources/audio/horn/0123456789ab/horn.wav', role: 'audio', format: 'wav', bytes: 10 }] };
  assert.throws(() => resourceSchema.parse(audio));
  assert.equal(resourceSchema.parse({ ...audio, durationSec: 2.5 }).type, 'audio');
});

Deno.test('tags, dates, and variants are validated', () => {
  assert.throws(() => resourceSchema.parse({ ...model, tags: ['Night Elf'] }));
  assert.throws(() => resourceSchema.parse({ ...model, added: '22/09/2026' }));
  assert.throws(() => resourceSchema.parse({ ...model, type: 'icon', variants: ['HUGE'] }));
});
