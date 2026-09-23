// Writes real sample files into .asset-store/ at the keys the test fixtures reference,
// so every previewer can be tried locally: deno task fixtures:store && deno task build:fixtures.
import { join } from 'jsr:@std/path@^1';
import { type Resource, resourceSchema } from '../../src/lib/resource-schema.ts';
import { encodePng } from './png.ts';
import { localStore } from './store.ts';
import { makeBlp, makeDxt1Dds, makeTexturedMdx, makeWav } from './testdata.ts';

const FIXTURES = 'src/content/resources/_fixtures';

const SAMPLE_LUA = `-- Fixture damage library
local Damage = {}

---@param source unit
---@param target unit
---@param amount real
function Damage.apply(source, target, amount)
  UnitDamageTarget(source, target, amount, true, false, ATTACK_TYPE_NORMAL, DAMAGE_TYPE_NORMAL, nil)
end

return Damage
`;

async function gradientPng(size: number): Promise<Uint8Array> {
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) pixels.set([Math.round((x / size) * 255), 90, Math.round((y / size) * 255), 255], (y * size + x) * 4);
  }
  return encodePng(size, size, pixels);
}

async function sample(format: string, resource: Resource): Promise<Uint8Array> {
  switch (format) {
    case 'mdx':
      return resource.type === 'model'
        ? makeTexturedMdx({ sequences: resource.animations, textures: resource.textures, replaceableIds: [1] })
        : makeTexturedMdx();
    case 'blp':
      return makeBlp();
    case 'dds':
      return makeDxt1Dds();
    case 'wav':
      return makeWav(resource.type === 'audio' ? resource.durationSec : 1);
    case 'lua':
    case 'jass':
    case 'ts':
      return new TextEncoder().encode(SAMPLE_LUA);
    case 'png':
      return gradientPng(64);
    default:
      throw new Error(`No sample for ${format}`);
  }
}

async function* fixtureFiles(dir: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(dir)) {
    const path = join(dir, entry.name);
    if (entry.isDirectory) yield* fixtureFiles(path);
    else if (entry.name.endsWith('.json')) yield path;
  }
}

if (import.meta.main) {
  const store = localStore('.asset-store');
  let count = 0;
  for await (const path of fixtureFiles(FIXTURES)) {
    const resource = resourceSchema.parse(JSON.parse(await Deno.readTextFile(path)));
    if (resource.type === 'link') continue;
    for (const file of resource.files) {
      await store.put(file.key, await sample(file.format, resource), 'application/octet-stream');
      count++;
    }
    if (resource.preview) {
      await store.put(resource.preview.key, await gradientPng(resource.preview.width), 'image/png');
      count++;
    }
  }
  console.log(`Wrote ${count} sample files to .asset-store/.`);
}
