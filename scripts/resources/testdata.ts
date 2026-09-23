// Tiny, valid Warcraft III files built in memory so tests need no binary fixtures.
import BoneModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/bone.js';
import GeosetModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/geoset.js';
import LayerModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/layer.js';
import MaterialModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/material.js';
import ModelModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/model.js';
import SequenceModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/sequence.js';
import TextureModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/texture.js';

// This library publishes CommonJS modules with exports.default; Deno's default import is that exports object.
const Bone = BoneModule.default;
const Geoset = GeosetModule.default;
const Layer = LayerModule.default;
const Material = MaterialModule.default;
const Model = ModelModule.default;
const Sequence = SequenceModule.default;
const Texture = TextureModule.default;

function model(animations: string[], textures: string[], replaceableIds: number[] = []) {
  const result = new Model();
  result.version = 800;
  animations.forEach((name, index) => {
    const sequence = new Sequence();
    sequence.name = name;
    sequence.interval[0] = index * 1000;
    sequence.interval[1] = index * 1000 + 999;
    result.sequences.push(sequence);
  });
  for (const path of textures) {
    const texture = new Texture();
    texture.path = path;
    result.textures.push(texture);
  }
  for (const replaceableId of replaceableIds) {
    const texture = new Texture();
    texture.replaceableId = replaceableId;
    result.textures.push(texture);
  }
  return result;
}

export const makeMdx = (animations = ['Stand', 'Walk'], textures = ['Textures\\Footman.blp'], replaceableIds: number[] = []): Uint8Array =>
  model(animations, textures, replaceableIds).saveMdx();

export const makeMdl = (animations = ['Stand'], textures = ['Textures\\Footman.blp']): string =>
  model(animations, textures).saveMdl();

/** A 2×2 palettised BLP1 without alpha: palette 0 is black, palette 1 is blue; pixels are 0,1,1,0. */
export function makeBlp(): Uint8Array {
  const width = 2, height = 2, headerSize = 156, paletteSize = 1024;
  const bytes = new Uint8Array(headerSize + paletteSize + width * height);
  const view = new DataView(bytes.buffer);
  // magic 'BLP1', content 1 (direct), alphaBits 0, width, height, type 5, hasMipmaps 0
  [0x31504c42, 1, 0, width, height, 5, 0].forEach((value, index) => view.setInt32(index * 4, value, true));
  view.setInt32(7 * 4, headerSize + paletteSize, true);
  view.setInt32(23 * 4, width * height, true);
  bytes[headerSize + 4] = 255; // palette[1] is stored BGRA: blue = 255
  bytes.set([0, 1, 1, 0], headerSize + paletteSize);
  return bytes;
}

/** A 4×4 DXT1 DDS whose single block is solid red. */
export function makeDxt1Dds(): Uint8Array {
  const bytes = new Uint8Array(128 + 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x20534444, true); // 'DDS '
  view.setUint32(4, 124, true); // header size
  view.setUint32(8, 0x1007, true); // caps | height | width | pixel format
  view.setUint32(12, 4, true); // height
  view.setUint32(16, 4, true); // width
  view.setUint32(76, 32, true); // pixel format size
  view.setUint32(80, 0x4, true); // DDPF_FOURCC
  view.setUint32(84, 0x31545844, true); // 'DXT1'
  view.setUint16(128, 0xf800, true); // color0: pure red in RGB565
  view.setUint16(130, 0x0000, true); // color1: black
  view.setUint32(132, 0, true); // every texel uses color0
  return bytes;
}

/** 16-bit mono PCM WAV of silence. */
export function makeWav(seconds: number, sampleRate = 8000): Uint8Array {
  const dataSize = seconds * sampleRate * 2;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => bytes.set(new TextEncoder().encode(text), offset);
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  ascii(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, dataSize, true);
  return bytes;
}

/**
 * A single upright 100×100 quad textured with the model's first texture, framed by its extent.
 * Renders in the viewer (verified in a browser during planning); used for the fixture store and manual checks.
 */
export function makeTexturedMdx(options: { sequences?: string[]; textures?: string[]; replaceableIds?: number[] } = {}): Uint8Array {
  const result = model(options.sequences ?? ['Stand'], options.textures ?? ['Textures\\Footman.blp'], options.replaceableIds ?? []);
  const material = new Material();
  const layer = new Layer();
  layer.textureId = 0;
  material.layers.push(layer);
  result.materials.push(material);

  const geoset = new Geoset();
  geoset.vertices = new Float32Array([-50, 0, 0, 50, 0, 0, 50, 0, 100, -50, 0, 100]);
  geoset.normals = new Float32Array([0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0]);
  geoset.faceTypeGroups = new Uint32Array([4]);
  geoset.faceGroups = new Uint32Array([6]);
  geoset.faces = new Uint16Array([0, 1, 2, 0, 2, 3]);
  geoset.vertexGroups = new Uint8Array([0, 0, 0, 0]);
  geoset.matrixGroups = new Uint32Array([1]);
  geoset.matrixIndices = new Uint32Array([0]);
  geoset.uvSets = [new Float32Array([0, 1, 1, 1, 1, 0, 0, 0])];
  geoset.materialId = 0;
  geoset.extent.min.set([-50, 0, 0]);
  geoset.extent.max.set([50, 0, 100]);
  geoset.extent.boundsRadius = 80;
  result.geosets.push(geoset);

  const bone = new Bone();
  bone.name = 'Root';
  bone.objectId = 0;
  bone.parentId = -1;
  bone.geosetId = 0;
  result.bones.push(bone);
  result.pivotPoints.push(new Float32Array([0, 0, 0]));
  result.extent.min.set([-50, 0, 0]);
  result.extent.max.set([50, 0, 100]);
  result.extent.boundsRadius = 80;
  return result.saveMdx();
}
