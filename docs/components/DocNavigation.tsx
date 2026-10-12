import type { VNode } from "preact";
import type { Heading, SidebarGroup, SidebarTree } from "../../shared/types.ts";
import { sidebarItems } from "../sidebar.ts";

export function Sidebar(
  { tree, current }: { tree: SidebarTree; current: string },
): VNode {
  const currentGroup = tree.groups.findIndex((group) =>
    group.items.some((item) => item.url === current)
  );
  const links = (group: SidebarGroup) =>
    group.items.map((item) => (
      <a
        key={item.url}
        href={item.url}
        aria-current={item.url === current ? "page" : undefined}
      >
        {item.label}
      </a>
    ));
  return (
    <nav aria-label="Documentation navigation" class="sidebar-links">
      <p class="sidebar-title pixel-heading">{tree.label}</p>
      {tree.groups.map((group, index) =>
        group.title
          ? (
            <details
              key={group.title}
              class="sidebar-group"
              open={index === 0 || index === currentGroup}
            >
              <summary class="pixel-heading">{group.title}</summary>
              {links(group)}
            </details>
          )
          : links(group)
      )}
    </nav>
  );
}

export function Outline({ headings }: { headings: readonly Heading[] }): VNode {
  return (
    <nav aria-label="On this page" class="outline-links">
      <p>On this page</p>
      <ul>
        {headings.map((heading) => (
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
  { tree, current }: { tree: SidebarTree; current: string },
): VNode {
  const ordered = sidebarItems(tree);
  const index = ordered.findIndex((item) => item.url === current);
  const previous = ordered[index - 1];
  const next = ordered[index + 1];
  return (
    <nav aria-label="Previous and next pages" class="doc-pager">
      {previous && (
        <a rel="prev" href={previous.url}>
          <span>Previous page</span>
          <strong>{previous.label}</strong>
        </a>
      )}
      {next && (
        <a rel="next" href={next.url}>
          <span>Next page</span>
          <strong>{next.label}</strong>
        </a>
      )}
    </nav>
  );
}
