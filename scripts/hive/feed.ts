import { XMLParser } from 'fast-xml-parser';
import type { FeedItem } from '../../src/lib/hive.ts';

/** A parsed XML node: text, or an element with `@_` attributes and a `#text` value. */
type Node = string | { [key: string]: Node | Node[] | undefined };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Keep every value a string: a title like "1234" must not become a number.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
});

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/**
 * Reads an RSS 2.0 or Atom feed saved from Hive into its title and items. Only metadata is read:
 * title, link, date, authors and categories.
 */
export function parseFeed(xml: string): { title: string; items: FeedItem[] } {
  let doc: Record<string, Node>;
  try {
    doc = parser.parse(xml, true) as Record<string, Node>;
  } catch {
    throw new Error('Not an RSS or Atom feed');
  }
  const channel = element(element(doc.rss)?.channel);
  if (channel) return { title: text(channel.title) ?? '', items: list(channel.item).map(rssItem) };
  const feed = element(doc.feed);
  if (feed) return { title: text(feed.title) ?? '', items: list(feed.entry).map(atomEntry) };
  throw new Error('Not an RSS or Atom feed');
}

function rssItem(node: Node): FeedItem {
  const item = element(node) ?? {};
  const authors = [...list(item['dc:creator']), ...list(item.author)].map(text).map(rssAuthor).filter(isText);
  return {
    title: text(item.title),
    authors,
    categories: list(item.category).map(text).filter(isText),
    published: text(item.pubDate) ?? text(item['dc:date']),
    link: text(item.link),
  };
}

/** RSS `author` is often "email (Name)"; keep the name. */
function rssAuthor(value: string | undefined): string | undefined {
  return value?.match(/^\S+@\S+\s*\((.+)\)$/)?.[1].trim() ?? value;
}

function atomEntry(node: Node): FeedItem {
  const entry = element(node) ?? {};
  const links = list(entry.link).map(element).filter((link) => link !== undefined);
  const alternate = links.find((link) => (attr(link, 'rel') ?? 'alternate') === 'alternate') ?? links[0];
  return {
    title: text(entry.title),
    authors: list(entry.author).map((author) => text(element(author)?.name)).filter(isText),
    categories: list(entry.category).map((category) => attr(element(category), 'term') ?? text(category)).filter(isText),
    published: text(entry.published) ?? text(entry.updated),
    link: alternate ? attr(alternate, 'href') : undefined,
  };
}

function list(value: Node | Node[] | undefined): Node[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function element(value: Node | Node[] | undefined): Record<string, Node | Node[] | undefined> | undefined {
  return value !== undefined && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

function attr(node: Record<string, Node | Node[] | undefined> | undefined, name: string): string | undefined {
  const value = node?.[`@_${name}`];
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

/**
 * A node's text with HTML entities decoded (CDATA and `type="html"` titles keep them after XML
 * parsing) and whitespace collapsed; undefined when empty.
 */
function text(value: Node | Node[] | undefined): string | undefined {
  const node = Array.isArray(value) ? value[0] : value;
  const raw = typeof node === 'string' ? node : typeof element(node)?.['#text'] === 'string' ? element(node)!['#text'] as string : undefined;
  const clean = raw === undefined ? undefined : decodeEntities(raw).replace(/\s+/g, ' ').trim();
  return clean || undefined;
}

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, name: string) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED[name.toLowerCase()] ?? match;
  });
}

function isText(value: string | undefined): value is string {
  return value !== undefined;
}
