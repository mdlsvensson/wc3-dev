/** Duration of a WAV file in seconds (two decimals), or null when its header cannot be read. */
export function wavDurationSec(bytes: Uint8Array): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let byteRate = 0;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const id = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === 'fmt ' && size >= 16 && offset + 20 <= bytes.length) byteRate = view.getUint32(offset + 16, true);
    if (id === 'data') return byteRate ? Math.round((size / byteRate) * 100) / 100 : null;
    offset += 8 + size + (size % 2);
  }
  return null;
}
