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
  section: SectionId | null;
  html: string;
  headings: readonly Heading[];
}
export interface CompiledPage extends PageRecord {
  links: readonly SourceLink[];
  text: string;
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
