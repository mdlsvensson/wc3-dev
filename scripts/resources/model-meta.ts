import ModelModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/model.js';
import ReplaceableIdsModule from 'mdx-m3-viewer-th/dist/cjs/viewer/handlers/mdx/replaceableids.js';

// This library publishes CommonJS modules with exports.default; Deno's default import is that exports object.
const Model = ModelModule.default;
/** The viewer's own replaceable-ID table, e.g. 11 → "Cliff/Cliff0". */
const REPLACEABLE_IDS = ReplaceableIdsModule.default as Record<number, string>;
// Team colour (1) and glow (2) come from the shared team colour sets.
const TEAM_IDS = new Set([1, 2]);

export interface ModelMeta { animations: string[]; textures: string[]; replaceables: string[] }

/** Reads sequence names, texture paths, and replaceable textures from MDX bytes or MDL text. Throws if the parser rejects the file. */
export function readModelMeta(source: Uint8Array | string): ModelMeta {
  const model = new Model();
  // The parser reads from offset 0 of the underlying buffer, so hand it an exact copy.
  model.load(typeof source === 'string' ? source : source.slice());
  const replaceables = model.textures
    .filter((texture) => !texture.path && !TEAM_IDS.has(texture.replaceableId) && REPLACEABLE_IDS[texture.replaceableId])
    .map((texture) => `ReplaceableTextures\\${REPLACEABLE_IDS[texture.replaceableId].replaceAll('/', '\\')}`);
  return {
    animations: model.sequences.map((sequence) => sequence.name).filter(Boolean),
    textures: [...new Set(model.textures.map((texture) => texture.path).filter(Boolean))],
    replaceables: [...new Set(replaceables)],
  };
}
