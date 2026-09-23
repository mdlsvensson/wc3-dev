export const ZOOMS = ['fit', '1', '2', '4', '8'] as const;
export type Zoom = typeof ZOOMS[number];
export interface Size { width: number; height: number }

/** On-screen size of the image; pixel-sharp rendering from 2× up. */
export function displaySize(image: Size, viewport: Size, zoom: Zoom): Size & { pixelated: boolean } {
  const scale = zoom === 'fit' ? Math.min(viewport.width / image.width, viewport.height / image.height) : Number(zoom);
  return {
    width: Math.max(1, Math.round(image.width * scale)),
    height: Math.max(1, Math.round(image.height * scale)),
    pixelated: scale >= 2,
  };
}

/** The alpha channel as opaque greyscale. */
export function alphaOnly(data: Uint8ClampedArray): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(data.length);
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    out[index] = alpha;
    out[index + 1] = alpha;
    out[index + 2] = alpha;
    out[index + 3] = 255;
  }
  return out;
}
