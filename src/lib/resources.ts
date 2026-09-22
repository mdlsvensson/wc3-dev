import { getCollection, type CollectionEntry } from 'astro:content';
import { TYPE_SEGMENTS } from './resource-schema';
import type { Resource } from './resource-schema';

export type ResourceEntry = CollectionEntry<'resources'>;
export type HostedData = Exclude<Resource, { type: 'link' }>;
export type HostedEntry = ResourceEntry & { data: HostedData };
export type LinkEntry = ResourceEntry & { data: Extract<Resource, { type: 'link' }> };

export const isHosted = (entry: ResourceEntry): entry is HostedEntry => entry.data.type !== 'link';
export const isLink = (entry: ResourceEntry): entry is LinkEntry => entry.data.type === 'link';

const lastChange = (entry: ResourceEntry) => entry.data.updated ?? entry.data.added;

/** All resources, most recently added or updated first. */
export async function getResources(): Promise<ResourceEntry[]> {
  return (await getCollection('resources'))
    .sort((a, b) => lastChange(b).localeCompare(lastChange(a)) || a.data.title.localeCompare(b.data.title));
}

/** Curated external links in their display order. */
export async function getLinks(): Promise<LinkEntry[]> {
  return (await getCollection('resources')).filter(isLink).sort((a, b) => a.data.order - b.data.order);
}

export const resourceHref = (entry: HostedEntry): string => `/resources/${TYPE_SEGMENTS[entry.data.type]}/${entry.id}/`;

const SOURCE_LABELS = { hive: 'View on Hive Workshop', github: 'View on GitHub', other: 'Original source' } as const;
export const sourceLabel = (source: Resource['source']): string => source.label ?? SOURCE_LABELS[source.site];

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Type-specific rows for the detail page's facts table. */
export function typeDetails(data: HostedData): [string, string][] {
  switch (data.type) {
    case 'model':
      return [['Kind', data.kind], ['Animations', data.animations.join(', ') || 'None'], ['Textures', String(data.textures.length)]];
    case 'icon':
      return [['Variants', data.variants.join(', ')]];
    case 'texture':
      return [['Usage', data.usage]];
    case 'audio':
      return [['Usage', data.usage], ['Duration', formatDuration(data.durationSec)]];
    case 'script':
      return [['Language', data.language], ['Requires', data.requires.join(', ') || 'Nothing']];
  }
}
