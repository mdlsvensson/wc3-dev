import * as blpModule from 'mdx-m3-viewer-th/dist/cjs/parsers/blp/image.js';
import * as ddsModule from 'mdx-m3-viewer-th/dist/cjs/parsers/dds/image.js';
// tga-js directly rather than the viewer's TgaImage: the viewer calls `require('tga-js').default`, which only exists
// when a bundler resolves tga-js's ESM build (Vite does); under Deno it gets the CJS build and fails.
import * as tgaModule from 'tga-js';
import { cjsDefault, cjsNamed } from './cjs.ts';

type BlpImageClass = typeof import('mdx-m3-viewer-th/dist/cjs/parsers/blp/image.js').BlpImage;
type DdsImageClass = typeof import('mdx-m3-viewer-th/dist/cjs/parsers/dds/image.js').DdsImage;
/** The members of tga-js's loader used here; the package ships no types. */
type TgaLoaderClass = new () => { load(bytes: Uint8Array): void; header: { width: number; height: number }; getImageData(target: ImageData): ImageData };

export type ImageFormat = 'blp' | 'dds' | 'tga';

export interface DecodedImage {
  /** Size of the decoded mipmap level. */
  width: number;
  height: number;
  data: Uint8ClampedArray;
  mipmaps: number;
  /** Format and full-size dimensions, e.g. "BLP1, 256×256". */
  label: string;
}

export const infoLine = (image: DecodedImage): string => `${image.label}, ${image.mipmaps} ${image.mipmaps === 1 ? 'mipmap' : 'mipmaps'}`;

/** Decodes one mipmap level of a BLP1, DDS, or TGA file to RGBA. Throws for data it cannot preview. */
export function decodeImage(format: ImageFormat, bytes: Uint8Array, level = 0): DecodedImage {
  // The parsers read from offset 0 of the underlying buffer, so hand them an exact copy.
  const copy = bytes.slice();
  if (format === 'blp') {
    const BlpImage = cjsNamed<BlpImageClass>(blpModule, 'BlpImage');
    const image = new BlpImage();
    image.load(copy);
    const mipmaps = Math.max(image.mipmaps(), 1);
    const mipmap = image.getMipmap(Math.min(level, mipmaps - 1));
    // ImageData here is always 8-bit RGBA; newer DOM typings widen `data` to include Float16Array.
    return { width: mipmap.width, height: mipmap.height, data: mipmap.data as Uint8ClampedArray, mipmaps, label: `BLP1, ${image.width}×${image.height}` };
  }
  if (format === 'dds') {
    const DdsImage = cjsNamed<DdsImageClass>(ddsModule, 'DdsImage');
    const image = new DdsImage();
    image.load(copy);
    const mipmaps = Math.max(image.mipmaps(), 1);
    const mipmap = image.getMipmap(Math.min(level, mipmaps - 1));
    // RGTC (normal maps) decodes to two channels, which cannot be shown as colour.
    if (mipmap.data.length !== mipmap.width * mipmap.height * 4) throw new Error('this DDS encoding cannot be previewed');
    const data = new Uint8ClampedArray(mipmap.data.buffer, mipmap.data.byteOffset, mipmap.data.length);
    return { width: mipmap.width, height: mipmap.height, data, mipmaps, label: `DDS, ${image.width}×${image.height}` };
  }
  const TgaLoader = cjsDefault<TgaLoaderClass>(tgaModule);
  const tga = new TgaLoader();
  tga.load(copy);
  const { width, height } = tga.header;
  const image = tga.getImageData(new ImageData(width, height));
  return { width, height, data: image.data as Uint8ClampedArray, mipmaps: 1, label: `TGA, ${width}×${height}` };
}
