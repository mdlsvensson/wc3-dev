import MiniSearch from "minisearch";
import type { CompiledPage } from "../../shared/types.ts";
import { searchOptions } from "./engine.ts";
import type { SearchEntry, SearchPayload } from "./types.ts";

function excerpt(text: string): string {
  let end = Math.min(text.length, 180);
  const last = text.charCodeAt(end - 1);
  if (end < text.length && last >= 0xd800 && last <= 0xdbff) end--;
  return text.slice(0, end);
}

// Only the compiler's controlled HTML reaches this build-time helper. Strip markup before
// decoding escaped text, so authored strings such as <script> remain searchable strings.
function sectionText(html: string): string {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
  };
  return html.replace(/<\/(?:p|div|li|tr|h[1-6])>|<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(
      /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
      (_, entity: string) => {
        if (!entity.startsWith("#")) return entities[entity.toLowerCase()];
        return String.fromCodePoint(
          entity.toLowerCase().startsWith("#x")
            ? parseInt(entity.slice(2), 16)
            : parseInt(entity.slice(1), 10),
        );
      },
    ).replace(/\s+/g, " ").trim();
}

export function buildSearchPayload(
  pages: readonly CompiledPage[],
): SearchPayload {
  const documents: (SearchEntry & { text: string })[] = [];
  for (const page of pages) {
    const boundaries = [
      ...page.html.matchAll(
        /<h([23])\b[^>]*\bid="([^"]*)"[^>]*>[\s\S]*?<\/h\1>/g,
      ),
    ];
    // A page's own entry is its title and what stands before its first h2 or h3. A record without HTML (the
    // landing page) is indexed by its text.
    const titleEnd = page.html.indexOf("</h1>");
    const intro = page.html
      ? sectionText(page.html.slice(
        titleEnd < 0 ? 0 : titleEnd + 5,
        boundaries[0]?.index ?? page.html.length,
      ))
      : page.text;
    documents.push({
      id: page.source,
      url: page.url,
      title: page.title,
      heading: "",
      text: intro,
      excerpt: excerpt(intro),
    });
    for (let i = 0; i < boundaries.length; i++) {
      const match = boundaries[i];
      const heading = page.headings.find((heading) => heading.id === match[2]);
      if (!heading) {
        throw new Error(`${page.source}: missing search heading ${match[2]}`);
      }
      const text = sectionText(page.html.slice(
        match.index! + match[0].length,
        boundaries[i + 1]?.index ?? page.html.length,
      ));
      documents.push({
        id: `${page.source}#${heading.id}`,
        url: `${page.url}#${heading.id}`,
        title: page.title,
        heading: heading.text,
        text,
        excerpt: excerpt(text),
      });
    }
  }
  const index = new MiniSearch(searchOptions);
  index.addAll(documents);
  return {
    index: JSON.stringify(index),
    entries: documents.map(({ text: _text, ...entry }) => entry),
  };
}
