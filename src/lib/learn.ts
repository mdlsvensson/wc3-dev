import { getCollection, getEntry } from 'astro:content';
import { chapters } from '../data/tutorials';
import { buildTrack, NEXT_PAGE, type PagerLink } from './tutorials';

/** The whole track, from the `tutorials` collection. */
export async function getTrack() {
  return buildTrack(chapters, await getCollection('tutorials'));
}

/** The closing "Where to go next" page (`src/content/tutorials/next.md`). */
export async function getClosingPage() {
  const page = await getEntry('tutorialPages', 'next');
  if (!page) throw new Error('src/content/tutorials/next.md is missing');
  return page;
}

export async function closingLink(): Promise<PagerLink> {
  return { href: NEXT_PAGE, title: (await getClosingPage()).data.title };
}
