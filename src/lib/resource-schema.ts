import { z } from 'astro/zod';

export const HOSTED_TYPES = ['model', 'icon', 'texture', 'audio', 'script'] as const;
export type HostedType = typeof HOSTED_TYPES[number];

export const TYPE_SEGMENTS: Record<HostedType, string> = { model: 'models', icon: 'icons', texture: 'textures', audio: 'audio', script: 'scripts' };
export const TYPE_NAMES: Record<HostedType, string> = { model: 'Model', icon: 'Icon', texture: 'Texture', audio: 'Audio', script: 'Script' };
export const TYPE_PLURALS: Record<HostedType, string> = { model: 'Models', icon: 'Icons', texture: 'Textures', audio: 'Audio', script: 'Scripts' };
export const ICON_VARIANTS = ['BTN', 'DISBTN', 'PAS', 'DISPAS', 'ATC', 'DISATC', 'ATT', 'UPG'] as const;

/** `resources/<type>/<slug>/<12 hex of sha256>/<file name>` */
export const STORE_KEY = /^resources\/(model|icon|texture|audio|script)\/[a-z0-9]+(-[a-z0-9]+)*\/[0-9a-f]{12}\/[^/\\?#%]+$/;

const tag = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Tags are lowercase kebab-case');
const isoDate = z.iso.date();
const author = z.object({ name: z.string().min(1), url: z.url().optional() });
const source = z.object({
  site: z.enum(['hive', 'github', 'other']),
  url: z.url(),
  label: z.string().min(1).optional(),
});
const compat = z.object({
  sd: z.boolean(),
  hd: z.boolean(),
  minPatch: z.string().regex(/^\d+\.\d+(\.\d+)?$/).optional(),
});
const storedFile = z.object({
  key: z.string().regex(STORE_KEY),
  role: z.string().min(1),
  format: z.string().min(1),
  bytes: z.number().int().positive(),
});
const preview = z.object({
  key: z.string().regex(STORE_KEY),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const common = {
  title: z.string().min(1).max(80),
  summary: z.string().min(1).max(280),
  tags: z.array(tag).default([]),
  source,
  permission: z.string().min(1).optional(),
  derivative: z.boolean().default(false),
  related: z.array(z.string()).default([]),
};
const hosted = { ...common, authors: z.array(author).min(1), compat };

const modelAuthored = z.object({
  type: z.literal('model'),
  ...hosted,
  kind: z.enum(['unit', 'building', 'doodad', 'effect', 'missile', 'item', 'portrait', 'other']),
});
const iconAuthored = z.object({ type: z.literal('icon'), ...hosted, variants: z.array(z.enum(ICON_VARIANTS)).min(1) });
const textureAuthored = z.object({
  type: z.literal('texture'),
  ...hosted,
  usage: z.enum(['skin', 'tileset', 'sky', 'loading-screen', 'ui', 'other']),
});
const audioAuthored = z.object({
  type: z.literal('audio'),
  ...hosted,
  usage: z.enum(['music', 'sfx', 'voice', 'ambient']),
  // Read from WAV headers by resource:add; author it for other formats.
  durationSec: z.number().positive().optional(),
});
const scriptAuthored = z.object({
  type: z.literal('script'),
  ...hosted,
  language: z.enum(['jass', 'vjass', 'lua', 'typescript']),
  requires: z.array(z.string().min(1)).default([]),
});
const linkAuthored = z.object({
  type: z.literal('link'),
  ...common,
  authors: z.array(author).default([]),
  category: z.enum(['Community', 'Tooling', 'Scripting']),
  order: z.number().int().nonnegative(),
});

/** What the owner writes in `resource.json`; resource:add generates the rest. */
export const authoredSchema = z.discriminatedUnion('type', [
  modelAuthored, iconAuthored, textureAuthored, audioAuthored, scriptAuthored, linkAuthored,
]);

const generated = { files: z.array(storedFile).min(1), preview: preview.optional(), added: isoDate, updated: isoDate.optional() };

/** A complete resource as stored in `src/content/resources/<type>/<slug>.json`. */
export const resourceSchema = z.discriminatedUnion('type', [
  modelAuthored.extend({ ...generated, animations: z.array(z.string()).default([]), textures: z.array(z.string()).default([]), replaceables: z.array(z.string()).default([]) }),
  iconAuthored.extend(generated),
  textureAuthored.extend(generated),
  audioAuthored.extend({ ...generated, durationSec: z.number().positive() }),
  scriptAuthored.extend(generated),
  linkAuthored.extend({ added: isoDate, updated: isoDate.optional() }),
]);

export type Resource = z.infer<typeof resourceSchema>;
export type AuthoredResource = z.infer<typeof authoredSchema>;
