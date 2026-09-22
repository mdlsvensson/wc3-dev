import { basename, join, relative } from 'jsr:@std/path@^1';
import { z } from 'astro/zod';
import { resourceSchema } from '../../src/lib/resource-schema.ts';
import { isSlug } from './keys.ts';

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
    related.push([file, data.related]);
    if (data.type !== 'link') keys.push(...data.files.map((stored) => stored.key), ...(data.preview ? [data.preview.key] : []));
  }

  for (const [file, references] of related) {
    for (const reference of references) {
      if (!slugs.has(reference)) errors.push(`${file}: related resource "${reference}" does not exist`);
    }
  }

  if (options.remoteBase) {
    const fetchFn = options.fetchFn ?? fetch;
    for (const key of keys) {
      const response = await fetchFn(new URL(key, options.remoteBase).href, { method: 'HEAD' });
      if (!response.ok) errors.push(`missing from the store: ${key} (${response.status})`);
    }
  }
  return errors;
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
  if (errors.length) Deno.exit(1);
  console.log('All resources are valid.');
}
