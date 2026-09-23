import { basename, join, relative } from 'jsr:@std/path@^1';
import { z } from 'astro/zod';
import { assetUrlFrom } from '../../src/lib/asset-url.ts';
import { unhostedGameTextures, type GameTextureMap } from '../../src/lib/game-textures.ts';
import { resourceSchema } from '../../src/lib/resource-schema.ts';
import { isSlug } from './keys.ts';
import { readManifest } from './manifest.ts';

async function* jsonFiles(dir: string): AsyncGenerator<string> {
  const entries = [];
  for await (const entry of Deno.readDir(dir)) entries.push(entry);
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory) yield* jsonFiles(path);
    else if (entry.name.endsWith('.json')) yield path;
  }
}

const describe = (error: unknown) =>
  error instanceof z.ZodError ? z.prettifyError(error).replaceAll('\n', ' ') : error instanceof Error ? error.message : String(error);

/** Validates every resource file under `root`; returns human-readable errors (empty when valid). */
export async function checkResources(
  root: string,
  options: { remoteBase?: string; fetchFn?: typeof fetch } = {},
): Promise<string[]> {
  const errors: string[] = [];
  const slugs = new Map<string, string>();
  const types = new Map<string, string>();
  const related: [string, string[]][] = [];
  const keys: string[] = [];

  for await (const path of jsonFiles(root)) {
    const file = relative(root, path).replaceAll('\\', '/');
    const slug = basename(path, '.json');
    if (!isSlug(slug)) errors.push(`${file}: file name must be a lowercase kebab-case slug`);
    const owner = slugs.get(slug);
    if (owner) errors.push(`${file}: slug "${slug}" is also used by ${owner}`);
    else slugs.set(slug, file);

    let data;
    try {
      data = resourceSchema.parse(JSON.parse(await Deno.readTextFile(path)));
    } catch (error) {
      errors.push(`${file}: ${describe(error)}`);
      continue;
    }
    const folder = file.split('/').at(-2);
    if (folder !== data.type) errors.push(`${file}: type "${data.type}" must live in an "${data.type}/" folder`);
    types.set(slug, data.type);
    related.push([file, data.related]);
    if (data.type !== 'link') keys.push(...data.files.map((stored) => stored.key), ...(data.preview ? [data.preview.key] : []));
  }

  for (const [file, references] of related) {
    for (const reference of references) {
      const type = types.get(reference);
      if (type === undefined) errors.push(`${file}: related resource "${reference}" does not exist`);
      else if (type === 'link') errors.push(`${file}: related resource "${reference}" is a link, not a hosted resource, and cannot be shown`);
    }
  }

  if (options.remoteBase) {
    const fetchFn = options.fetchFn ?? fetch;
    for (const key of keys) {
      const response = await fetchFn(assetUrlFrom(options.remoteBase, key), { method: 'HEAD' });
      if (!response.ok) errors.push(`missing from the store: ${key} (${response.status})`);
    }
  }
  return errors;
}

/** Models whose game textures are not hosted yet. Warnings only: a model still renders, with stand-in textures. */
export async function gameTextureWarnings(root: string, manifest: GameTextureMap): Promise<string[]> {
  const warnings: string[] = [];
  for await (const path of jsonFiles(root)) {
    let data;
    try {
      data = resourceSchema.parse(JSON.parse(await Deno.readTextFile(path)));
    } catch {
      continue; // checkResources reports invalid files.
    }
    if (data.type !== 'model') continue;
    const unhosted = unhostedGameTextures(manifest, {
      textures: data.textures,
      replaceables: data.replaceables,
      ownFiles: data.files.map((file) => file.key.split('/').at(-1) ?? ''),
    });
    if (unhosted.length) {
      const file = relative(root, path).replaceAll('\\', '/');
      warnings.push(`${file}: ${unhosted.length} game ${unhosted.length === 1 ? 'texture' : 'textures'} not hosted (run deno task game:sync): ${unhosted.join(', ')}`);
    }
  }
  return warnings;
}

if (import.meta.main) {
  const remote = Deno.args.includes('--remote');
  const remoteBase = remote ? Deno.env.get('ASSET_BASE_URL') : undefined;
  if (remote && !remoteBase) {
    console.error('error: set ASSET_BASE_URL to check the store.');
    Deno.exit(2);
  }
  const errors = await checkResources('src/content/resources', { remoteBase });
  for (const error of errors) console.error(error);
  // Test fixtures reference textures that are deliberately never hosted.
  const warnings = (await gameTextureWarnings('src/content/resources', await readManifest())).filter((warning) => !warning.startsWith('_fixtures/'));
  for (const warning of warnings) console.warn(`warning: ${warning}`);
  if (errors.length) Deno.exit(1);
  console.log('All resources are valid.');
}
