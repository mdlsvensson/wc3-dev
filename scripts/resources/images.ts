import { BlpImage } from 'mdx-m3-viewer-th/dist/cjs/parsers/blp/image.js';
import { DdsImage } from 'mdx-m3-viewer-th/dist/cjs/parsers/dds/image.js';

export interface Rgba { width: number; height: number; data: Uint8Array }

export const PREVIEW_MAX = 512;

/** The first mipmap level whose larger side is at most `max`, or the smallest level available. */
export function pickMipmap(width: number, height: number, levels: number, max = PREVIEW_MAX): number {
  let level = 0;
  while (level < levels - 1 && Math.max(width >> level, height >> level) > max) level++;
  return level;
}

/** Decodes a BLP1 or DDS texture to RGBA at preview size. Throws for encodings it cannot preview. */
export function decodeTexture(format: 'blp' | 'dds', bytes: Uint8Array): Rgba {
  // The parsers read from offset 0 of the underlying buffer, so hand them an exact copy.
  const copy = bytes.slice();
  if (format === 'blp') {
    const image = new BlpImage();
    image.load(copy);
    const mipmap = image.getMipmap(pickMipmap(image.width, image.height, Math.max(image.mipmaps(), 1)));
    return { width: mipmap.width, height: mipmap.height, data: new Uint8Array(mipmap.data) };
  }
  const image = new DdsImage();
  image.load(copy);
  const mipmap = image.getMipmap(pickMipmap(image.width, image.height, image.mipmaps()));
  // RGTC (normal maps) decodes to two channels, which cannot be shown as a preview.
  if (mipmap.data.length !== mipmap.width * mipmap.height * 4) throw new Error('Unsupported DDS encoding for previews.');
  return mipmap;
}
