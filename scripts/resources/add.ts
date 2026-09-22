import { basename, dirname, join } from 'jsr:@std/path@^1';
import { authoredSchema, HOSTED_TYPES, type HostedType, type Resource, resourceSchema } from '../../src/lib/resource-schema.ts';
import { decodeTexture } from './images.ts';
import { isSlug, sha256Hex, storeKey } from './keys.ts';
import { readModelMeta } from './model-meta.ts';
import { encodePng, pngSize } from './png.ts';
import { type FileFormat, sniff } from './sniff.ts';
import { type AssetStore, dryRunStore, localStore, s3StoreFromEnv } from './store.ts';
import { wavDurationSec } from './wav.ts';

export const ALLOWED_FORMATS: Record<HostedType, FileFormat[]> = {
  model: ['mdx', 'mdl', 'blp', 'dds', 'tga'],
  icon: ['blp', 'dds', 'tga'],
  texture: ['blp', 'dds', 'tga'],
  audio: ['wav', 'mp3', 'ogg', 'flac'],
  script: ['jass', 'lua', 'ts'],
};

const CONTENT_TYPES: Record<FileFormat, string> = {
  mdx: 'application/octet-stream', mdl: 'text/plain; charset=utf-8', blp: 'application/octet-stream',
  dds: 'image/vnd-ms.dds', tga: 'image/x-tga', png: 'image/png', wav: 'audio/wav', mp3: 'audio/mpeg',
  ogg: 'audio/ogg', flac: 'audio/flac', jass: 'text/plain; charset=utf-8', lua: 'text/plain; charset=utf-8',
  ts: 'text/plain; charset=utf-8',
};

export function roleFor(type: HostedType, format: FileFormat, fileName: string): string {
  if (type !== 'model') return type;
  if (format !== 'mdx' && format !== 'mdl') return 'texture';
  return /_portrait\.md[xl]$/i.test(fileName) ? 'portrait' : 'model';
}

export interface AddOptions {
  folder: string;
  contentRoot: string;
  store: AssetStore;
  /** ISO date recorded as `added` (new) or `updated` (with `update`). */
  today: string;
  update?: boolean;
  /** Write the resource JSON; false for dry runs. Defaults to true. */
  write?: boolean;
}

export interface AddResult { path: string; resource: Resource; warnings: string[] }

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function readJson(path: string): Promise<{ added?: string } | null> {
  try {
    return JSON.parse(await Deno.readTextFile(path));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return null;
    throw error;
  }
}

/** Finds a resource with this slug under any type folder, since changing `type` must not silently write a second file. */
async function readExisting(contentRoot: string, type: HostedType, slug: string): Promise<{ path: string; type: HostedType; added?: string } | null> {
  for (const candidate of HOSTED_TYPES) {
    const path = join(contentRoot, candidate, `${slug}.json`);
    const data = await readJson(path);
    if (data) return { path, type: candidate, added: data.added };
  }
  return null;
}

/** Validates, previews, uploads, and records one resource folder. */
export async function addResource(options: AddOptions): Promise<AddResult> {
  const { folder, contentRoot, store, today, update = false, write = true } = options;
  const slug = basename(folder);
  if (!isSlug(slug)) throw new Error(`Folder name "${slug}" must be a lowercase kebab-case slug.`);
  const authored = authoredSchema.parse(JSON.parse(await Deno.readTextFile(join(folder, 'resource.json'))));
  if (authored.type === 'link') throw new Error('Link resources are written by hand; resource:add only handles hosted files.');
  const type = authored.type;

  const path = join(contentRoot, type, `${slug}.json`);
  const existing = await readExisting(contentRoot, type, slug);
  if (existing && existing.type !== type) {
    throw new Error(`"${slug}" already exists as a ${existing.type} resource at ${existing.path}; delete it before adding it as a ${type} resource.`);
  }
  if (existing && !update) throw new Error(`${path} already exists; pass --update to replace it.`);

  const warnings: string[] = [];
  // Pass 1: read, sniff, and validate every file, and build the plan of what will be uploaded.
  // Nothing is uploaded until every file here has passed validation.
  type PlannedFile = { name: string; bytes: Uint8Array; format: FileFormat; role: string };
  const plannedFiles: PlannedFile[] = [];
  let plannedPreview: { name: string; bytes: Uint8Array; width: number; height: number } | undefined;
  let meta: { animations: string[]; textures: string[] } | undefined;
  let durationSec = authored.type === 'audio' ? authored.durationSec : undefined;

  const authoredPreview = await Deno.readFile(join(folder, 'preview.png')).catch(() => null);
  if (authoredPreview) {
    if (sniff('preview.png', authoredPreview) !== 'png') throw new Error('preview.png is not a PNG image.');
    plannedPreview = { name: 'preview.png', bytes: authoredPreview, ...pngSize(authoredPreview) };
  }

  const names: string[] = [];
  for await (const entry of Deno.readDir(folder)) {
    if (entry.isFile && entry.name !== 'resource.json' && entry.name !== 'preview.png') names.push(entry.name);
  }
  names.sort();

  for (const name of names) {
    const bytes = await Deno.readFile(join(folder, name));
    const format = sniff(name, bytes);
    if (!format || !ALLOWED_FORMATS[type].includes(format)) {
      const article = /^[aeiou]/i.test(type) ? 'an' : 'a';
      throw new Error(`${name}: not a valid ${ALLOWED_FORMATS[type].join('/')} file for ${article} ${type} resource.`);
    }
    const role = roleFor(type, format, name);
    plannedFiles.push({ name, bytes, format, role });

    if (role === 'model' && !meta) {
      try {
        meta = readModelMeta(format === 'mdl' ? new TextDecoder().decode(bytes) : bytes);
      } catch (error) {
        warnings.push(`${name}: could not read animations (${message(error)}).`);
      }
    }
    if (format === 'wav' && durationSec === undefined) durationSec = wavDurationSec(bytes) ?? undefined;
    if ((type === 'icon' || type === 'texture') && !plannedPreview && (format === 'blp' || format === 'dds')) {
      try {
        const image = decodeTexture(format, bytes);
        const png = await encodePng(image.width, image.height, image.data);
        plannedPreview = { name: 'preview.png', bytes: png, width: image.width, height: image.height };
      } catch (error) {
        warnings.push(`${name}: could not generate a preview (${message(error)}); add preview.png.`);
      }
    }
  }

  if (plannedFiles.length === 0) throw new Error('No resource files found next to resource.json.');
  if (type === 'audio' && durationSec === undefined) throw new Error('Set durationSec in resource.json; it can only be read from WAV files.');
  if (!plannedPreview && type !== 'audio' && type !== 'script') warnings.push('No preview image: add preview.png to show a thumbnail.');

  // Pass 2: every file has passed validation, so it is now safe to upload.
  const upload = async (fileName: string, bytes: Uint8Array, format: FileFormat) => {
    const key = storeKey(type, slug, await sha256Hex(bytes), fileName);
    await store.put(key, bytes, CONTENT_TYPES[format]);
    return key;
  };

  const files: { key: string; role: string; format: string; bytes: number }[] = [];
  for (const planned of plannedFiles) {
    files.push({ key: await upload(planned.name, planned.bytes, planned.format), role: planned.role, format: planned.format, bytes: planned.bytes.length });
  }
  const preview = plannedPreview
    ? { key: await upload(plannedPreview.name, plannedPreview.bytes, 'png'), width: plannedPreview.width, height: plannedPreview.height }
    : undefined;

  const resource = resourceSchema.parse({
    ...authored,
    files,
    preview,
    ...(type === 'model' ? meta ?? { animations: [], textures: [] } : {}),
    ...(type === 'audio' ? { durationSec } : {}),
    added: existing?.added ?? today,
    ...(existing ? { updated: today } : {}),
  });

  if (write) {
    await Deno.mkdir(dirname(path), { recursive: true });
    await Deno.writeTextFile(path, JSON.stringify(resource, null, 2) + '\n');
  }
  return { path, resource, warnings };
}

if (import.meta.main) {
  const flags = new Set(Deno.args.filter((arg) => arg.startsWith('--')));
  const [folder, ...extra] = Deno.args.filter((arg) => !arg.startsWith('--'));
  const unknown = [...flags].filter((flag) => !['--dry-run', '--local', '--update'].includes(flag));
  if (!folder || extra.length || unknown.length) {
    console.error('Usage: deno task resource:add <folder> [--dry-run] [--local] [--update]');
    Deno.exit(2);
  }
  const dryRun = flags.has('--dry-run');
  try {
    const store = dryRun ? dryRunStore() : flags.has('--local') ? localStore('.asset-store') : s3StoreFromEnv();
    const result = await addResource({
      folder,
      contentRoot: 'src/content/resources',
      store,
      today: new Date().toISOString().slice(0, 10),
      update: flags.has('--update'),
      write: !dryRun,
    });
    for (const warning of result.warnings) console.warn(`warning: ${warning}`);
    console.log(dryRun ? JSON.stringify(result.resource, null, 2) : `Wrote ${result.path} (files in ${store.label}).`);
  } catch (error) {
    console.error(`error: ${message(error)}`);
    Deno.exit(1);
  }
}
