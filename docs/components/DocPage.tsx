import type { VNode } from "preact";
import type { PageRecord, SidebarTree } from "../../shared/types.ts";
import { Document } from "../../shared/components/Document.tsx";
import { Header } from "../../shared/components/Header.tsx";
import { languageCss, languageScript } from "../behaviour/head.ts";
import MobileNav from "../islands/MobileNav.tsx";
import DocMenu from "../islands/DocMenu.tsx";
import Search from "../islands/Search.tsx";
import { docMenuProps } from "../sidebar.ts";
import { Outline, Pager, Sidebar } from "./DocNavigation.tsx";

export interface DocPageProps {
  page: PageRecord;
  sidebar: SidebarTree;
}

export function DocPage({ page, sidebar }: DocPageProps): VNode {
  const items = [{ text: "docs", href: "/moonwell/" }, {
    text: "wrappers",
    href: "/wrappers/",
  }, { text: "systems", href: "/systems/" }];
  const current = page.section ? `/${page.section}/` : undefined;
  const menu = docMenuProps(page, sidebar);
  const hasOutline = menu.headings.length > 0;
  return (
    <Document
      title={`${page.title} | wc3.dev`}
      description={page.description}
      head={
        <>
          <script dangerouslySetInnerHTML={{ __html: languageScript }} />
          <style dangerouslySetInnerHTML={{ __html: languageCss() }} />
        </>
      }
    >
      <div class="documentation" id="top">
        <Header items={items} current={current} leading={<Search />}>
          <MobileNav items={items} current={current} />
        </Header>
        <DocMenu {...menu} />
        <aside class="doc-sidebar">
          <Sidebar tree={sidebar} current={page.url} />
        </aside>
        <div class={`doc-layout${hasOutline ? " has-outline" : ""}`}>
          <main id="main-content" class="doc-content">
            <article
              class="doc-prose"
              dangerouslySetInnerHTML={{ __html: page.html }}
            />
            <Pager tree={sidebar} current={page.url} />
          </main>
          {hasOutline && (
            <aside class="doc-outline">
              <Outline headings={menu.headings} />
            </aside>
          )}
        </div>
      </div>
    </Document>
  );
}
