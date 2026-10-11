import type { VNode } from "preact";
import type { CompiledPage, Heading, NavSection } from "../../shared/types.ts";

function navigationLabel(page: CompiledPage): string {
  if (page.source.endsWith("/index.md")) return "Overview";
  if (page.source.endsWith("/getting-started.md")) return "Getting started";
  return page.title;
}

export function sectionPages(
  page: CompiledPage,
  pages: readonly CompiledPage[],
  sections: readonly NavSection[],
): CompiledPage[] {
  return (sections.find((section) => section.id === page.section)?.sources ??
    [])
    .flatMap((source) =>
      pages.filter((candidate) => candidate.source === source)
    );
}

export function Sidebar(
  { page, pages, sections }: {
    page: CompiledPage;
    pages: readonly CompiledPage[];
    sections: readonly NavSection[];
  },
): VNode {
  return (
    <nav aria-label="Documentation navigation" class="sidebar-links">
      <p class="sidebar-title pixel-heading">
        {sections.find((section) => section.id === page.section)?.label}
      </p>
      {sectionPages(page, pages, sections).map((candidate) => (
        <a
          key={candidate.url}
          href={candidate.url}
          aria-current={candidate.url === page.url ? "page" : undefined}
        >
          {navigationLabel(candidate)}
        </a>
      ))}
    </nav>
  );
}

export function Outline({ headings }: { headings: readonly Heading[] }): VNode {
  return (
    <nav aria-label="On this page" class="outline-links">
      <p>On this page</p>
      <ul>
        {headings.filter((heading) =>
          heading.level === 2 || heading.level === 3
        ).map((heading) => (
          <li
            key={heading.id}
            class={heading.level === 3 ? "outline-nested" : undefined}
          >
            <a href={`#${heading.id}`}>{heading.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Pager(
  { page, pages, sections }: {
    page: CompiledPage;
    pages: readonly CompiledPage[];
    sections: readonly NavSection[];
  },
): VNode {
  const ordered = sectionPages(page, pages, sections);
  const current = ordered.findIndex((candidate) => candidate.url === page.url);
  const previous = ordered[current - 1];
  const next = ordered[current + 1];
  return (
    <nav aria-label="Previous and next pages" class="doc-pager">
      {previous && (
        <a rel="prev" href={previous.url}>
          <span>Previous page</span>
          <strong>
            {navigationLabel(previous)}
          </strong>
        </a>
      )}
      {next && (
        <a rel="next" href={next.url}>
          <span>Next page</span>
          <strong>
            {navigationLabel(next)}
          </strong>
        </a>
      )}
    </nav>
  );
}
