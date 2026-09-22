import ModelModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/model.js';

// This library publishes CommonJS modules with exports.default; Deno's default import is that exports object.
const Model = ModelModule.default;

export interface ModelMeta { animations: string[]; textures: string[] }

/** Reads sequence names and texture paths from MDX bytes or MDL text. Throws if the parser rejects the file. */
export function readModelMeta(source: Uint8Array | string): ModelMeta {
  const model = new Model();
  // The parser reads from offset 0 of the underlying buffer, so hand it an exact copy.
  model.load(typeof source === 'string' ? source : source.slice());
  return {
    animations: model.sequences.map((sequence) => sequence.name).filter(Boolean),
    textures: [...new Set(model.textures.map((texture) => texture.path).filter(Boolean))],
  };
}
