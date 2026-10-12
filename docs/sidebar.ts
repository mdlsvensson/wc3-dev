import type {
  Heading,
  NavPage,
  NavSection,
  PageRecord,
  SectionId,
  SidebarItem,
  Sidebars,
  SidebarTree,
} from "../shared/types.ts";

function navPage(entry: string | NavPage): NavPage {
  return typeof entry === "string" ? { source: entry } : entry;
}

/** Every source of a section, in the order its groups list them. */
export function navSources(section: NavSection): string[] {
  return section.groups.flatMap((group) =>
    group.pages.map((entry) => navPage(entry).source)
  );
}

export function buildSidebars(
  pages: readonly Pick<PageRecord, "source" | "url" | "title">[],
  sections: readonly NavSection[],
): Sidebars {
  const bySource = new Map(pages.map((page) => [page.source, page]));
  const sidebars: Partial<Record<SectionId, SidebarTree>> = {};
  for (const section of sections) {
    sidebars[section.id] = {
      label: section.label,
      groups: section.groups.map((group) => ({
        ...(group.title ? { title: group.title } : {}),
        items: group.pages.flatMap((entry) => {
          const { source, label } = navPage(entry);
          const page = bySource.get(source);
          return page ? [{ label: label ?? page.title, url: page.url }] : [];
        }),
      })),
    };
  }
  return sidebars;
}

export function sidebarItems(tree: SidebarTree): SidebarItem[] {
  return tree.groups.flatMap((group) => group.items);
}

export interface DocMenuProps {
  sidebar: SidebarTree;
  current: string;
  headings: readonly Heading[];
}

/** All an island may know of a page: never its HTML, its text or another page. */
export function docMenuProps(
  page: PageRecord,
  sidebar: SidebarTree,
): DocMenuProps {
  return {
    sidebar,
    current: page.url,
    headings: page.headings.filter((heading) =>
      heading.level === 2 || heading.level === 3
    ).map(({ id, text, level }) => ({ id, text, level })),
  };
}
