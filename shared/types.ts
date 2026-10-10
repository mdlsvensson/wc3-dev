export type SectionId = "moonwell" | "wrappers" | "systems";
export interface SiteState {
  title: string;
}
export interface NavSection {
  id: SectionId;
  label: string;
  sources: readonly string[];
}
export interface Heading {
  id: string;
  text: string;
  level: number;
}
export interface SourceLink {
  target: string;
  image: boolean;
}
export interface CompiledPage {
  source: string;
  url: string;
  title: string;
  section: SectionId | null;
  html: string;
  headings: readonly Heading[];
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
