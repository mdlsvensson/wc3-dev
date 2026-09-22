import { getCollection, type CollectionEntry } from 'astro:content';
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
