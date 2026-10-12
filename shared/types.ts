export type SectionId = "moonwell" | "wrappers" | "systems";
export interface SiteState {
  title: string;
}
export interface NavPage {
  source: string;
  label?: string;
}
export interface NavGroup {
  title?: string;
  pages: readonly (string | NavPage)[];
}
export interface NavSection {
  id: SectionId;
  label: string;
  groups: readonly NavGroup[];
}
export interface SidebarItem {
  label: string;
  url: string;
}
export interface SidebarGroup {
  title?: string;
  items: readonly SidebarItem[];
}
export interface SidebarTree {
  label: string;
  groups: readonly SidebarGroup[];
}
export type Sidebars = Readonly<Partial<Record<SectionId, SidebarTree>>>;
export interface Heading {
  id: string;
  text: string;
  level: number;
}
export interface SourceLink {
  target: string;
  image: boolean;
}
export interface PageRecord {
  source: string;
  url: string;
  title: string;
  /** The page's meta description, as plain text. */
  description: string;
  section: SectionId | null;
  html: string;
  headings: readonly Heading[];
}
export interface CodeBlock {
  /** A `CodeLanguage` name. */
  language: string;
  code: string;
  /** 1-based line of the fence in its Markdown file. */
  line: number;
  skip: boolean;
  /** Index of its code group on the page, or null. */
  group: number | null;
}
export interface CompiledPage extends PageRecord {
  links: readonly SourceLink[];
  text: string;
  code: readonly CodeBlock[];
}
export interface NavItem {
  text: string;
  href: string;
}
export interface LandingCard {
  title: string;
  description: string;
  path: string;
}
