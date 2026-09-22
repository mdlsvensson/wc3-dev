export type FileFormat = 'mdx' | 'mdl' | 'blp' | 'dds' | 'tga' | 'png' | 'wav' | 'mp3' | 'ogg' | 'flac' | 'jass' | 'lua' | 'ts';

const EXTENSIONS: Record<string, FileFormat> = {
  mdx: 'mdx', mdl: 'mdl', blp: 'blp', dds: 'dds', tga: 'tga', png: 'png',
  wav: 'wav', mp3: 'mp3', ogg: 'ogg', flac: 'flac', j: 'jass', lua: 'lua', ts: 'ts',
};

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

/** UTF-8 text without NUL bytes, or null for binary data. */
function text(bytes: Uint8Array): string | null {
  if (bytes.length === 0 || bytes.includes(0)) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

const CHECKS: Record<FileFormat, (bytes: Uint8Array) => boolean> = {
  mdx: (b) => ascii(b, 0, 4) === 'MDLX',
  mdl: (b) => /\bVersion\s*\{[^}]*FormatVersion/.test(text(b) ?? ''),
  // Warcraft III only uses BLP1; BLP2 is World of Warcraft's format.
  blp: (b) => ascii(b, 0, 4) === 'BLP1',
  dds: (b) => ascii(b, 0, 4) === 'DDS ',
  tga: (b) => b.length >= 18 && b[1] <= 1 && [1, 2, 3, 9, 10, 11].includes(b[2]) && [8, 15, 16, 24, 32].includes(b[16]),
  png: (b) => b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 3) === 'PNG',
  wav: (b) => b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WAVE',
  mp3: (b) => ascii(b, 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0),
  ogg: (b) => ascii(b, 0, 4) === 'OggS',
  flac: (b) => ascii(b, 0, 4) === 'fLaC',
  jass: (b) => text(b) !== null,
  lua: (b) => text(b) !== null,
  ts: (b) => text(b) !== null,
};

/** The format a file claims by its extension, if its contents agree; otherwise null. */
export function sniff(fileName: string, bytes: Uint8Array): FileFormat | null {
  const format = EXTENSIONS[fileName.split('.').pop()?.toLowerCase() ?? ''];
  return format && CHECKS[format](bytes) ? format : null;
}
