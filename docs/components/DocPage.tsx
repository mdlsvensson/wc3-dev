import type { VNode } from "preact";
import type { CompiledPage, NavSection } from "../../shared/types.ts";
import { Document } from "../../shared/components/Document.tsx";
import { Header } from "../../shared/components/Header.tsx";
import MobileNav from "../islands/MobileNav.tsx";
import DocMenu from "../islands/DocMenu.tsx";
import Search from "../islands/Search.tsx";
import { Outline, Pager, Sidebar } from "./DocNavigation.tsx";

export interface DocPageProps {
  page: CompiledPage;
  pages: readonly CompiledPage[];
  sections: readonly NavSection[];
}

export function DocPage({ page, pages, sections }: DocPageProps): VNode {
  const items = [{ text: "docs", href: "/moonwell/" }, {
    text: "wrappers",
    href: "/wrappers/",
  }, { text: "systems", href: "/systems/" }];
  const hasOutline = page.headings.some((heading) =>
    heading.level === 2 || heading.level === 3
  );
  return (
    <Document title={`${page.title} | wc3.dev`}>
      <div class="documentation" id="top">
        <Header items={items} leading={<Search />}>
          <MobileNav items={items} />
        </Header>
        <DocMenu page={page} pages={pages} sections={sections} />
        <aside class="doc-sidebar">
          <Sidebar page={page} pages={pages} sections={sections} />
        </aside>
        <div class={`doc-layout${hasOutline ? " has-outline" : ""}`}>
          <main id="main-content" class="doc-content">
            <article
              class="doc-prose"
              dangerouslySetInnerHTML={{ __html: page.html }}
            />
            <Pager page={page} pages={pages} sections={sections} />
          </main>
          {hasOutline && (
            <aside class="doc-outline">
              <Outline headings={page.headings} />
            </aside>
          )}
        </div>
      </div>
    </Document>
  );
}
