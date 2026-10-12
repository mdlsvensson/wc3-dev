import type { CompiledPage, NavSection } from "../../shared/types.ts";
import { navSources } from "../../docs/sidebar.ts";
import { resolveContentLink, sourceUrl } from "./links.ts";
import { createRenderer, pageDescription, visitTokens } from "./render.ts";
import {
  landingCards,
  landingName,
  landingTagline,
} from "../../shared/content/landing.ts";

export function compileLandingPage(
  pages: readonly CompiledPage[],
  assets: ReadonlySet<string>,
): CompiledPage {
  const links = [
    ...landingCards.map((card) => ({ target: card.path, image: false })),
    { target: "/mw.gif", image: true },
    { target: "/mw-text-edit.png", image: true },
  ];
  for (const link of links) {
    resolveContentLink("landing", link.target, pages, assets);
  }
  return {
    source: "landing",
    url: "/",
    title: landingName,
    description: landingTagline,
    section: null,
    html: "",
    headings: [],
    links,
    text: [
      landingName,
      landingTagline,
      ...landingCards.flatMap((card) => [card.title, card.description]),
    ].join(" "),
    code: [],
  };
}

export async function compileDocumentation(
  sources: ReadonlyMap<string, string>,
  sections: readonly NavSection[],
  assets: ReadonlySet<string>,
): Promise<CompiledPage[]> {
  const ordered: { source: string; section: NavSection["id"] }[] = [];
  const seen = new Set<string>();
  for (const section of sections) {
    const sectionSources = navSources(section);
    if (!sectionSources.length) {
      throw new Error(`${section.id}: navigation section has no page`);
    }
    for (const source of sectionSources) {
      if (seen.has(source)) {
        throw new Error(`${source}: duplicate navigation source ${source}`);
      }
      if (!sources.has(source)) {
        throw new Error(`${source}: missing navigation source ${source}`);
      }
      seen.add(source);
      ordered.push({ source, section: section.id });
    }
  }
  for (const source of sources.keys()) {
    if (!seen.has(source)) {
      throw new Error(`${source}: source omitted from navigation ${source}`);
    }
  }
  const renderer = await createRenderer();
  try {
    const urls = new Map<string, string>();
    const parsed = ordered.map(({ source, section }) => {
      const url = sourceUrl(source);
      const key = url.replace(/\/$/, "");
      if (urls.has(key)) {
        throw new Error(
          `${source}: duplicate canonical URL ${url} with ${urls.get(key)}`,
        );
      }
      urls.set(key, source);
      return {
        source,
        section,
        url,
        ...renderer.parse(source, sources.get(source)!),
      };
    });
    const pages: CompiledPage[] = parsed.map((page) => {
      const title = page.headings.find((heading) => heading.level === 1)!.text;
      return {
        source: page.source,
        url: page.url,
        title,
        description: pageDescription(page.paragraph, title),
        section: page.section,
        html: "",
        headings: page.headings,
        links: page.links,
        text: page.text,
        code: page.code,
      };
    });
    // Pass two has the complete heading and URL map, including forward references.
    for (let i = 0; i < parsed.length; i++) {
      const page = parsed[i];
      visitTokens(page.tokens, (token) => {
        const attribute = token.type === "image"
          ? "src"
          : token.type === "link_open"
          ? "href"
          : null;
        if (attribute) {
          token.attrSet(
            attribute,
            resolveContentLink(
              page.source,
              token.attrGet(attribute)!,
              pages,
              assets,
            ),
          );
        }
      });
      pages[i].html = renderer.render(page.tokens);
    }
    return pages;
  } finally {
    renderer.dispose();
  }
}
