/** A workspace tab: one prerendered page the user opened. */
export interface Tab { href: string; title: string }
export interface TabState { tabs: Tab[]; active: string | null }

export const MAX_TABS = 12;
export const emptyTabs: TabState = { tabs: [], active: null };

/** Opens `tab` (refreshing its title if already open) and activates it, evicting the oldest other tab past the cap. */
export function openTab(state: TabState, tab: Tab): TabState {
  const tabs = state.tabs.some((open) => open.href === tab.href)
    ? state.tabs.map((open) => (open.href === tab.href ? tab : open))
    : [...state.tabs, tab];
  while (tabs.length > MAX_TABS) tabs.splice(tabs.findIndex((open) => open.href !== tab.href), 1);
  return { tabs, active: tab.href };
}

/** Clears the active marker while the user is on a page that does not open tabs. */
export function blurTabs(state: TabState): TabState {
  return state.active === null ? state : { ...state, active: null };
}

/** The landing page of the section an href belongs to, e.g. `/resources/x/` → `/resources/`. */
export function sectionHome(href: string): string {
  const segment = href.split('/').filter(Boolean)[0];
  return segment ? `/${segment}/` : '/';
}

/** Closes a tab. `navigateTo` is set only when the active tab closed. */
export function closeTab(state: TabState, href: string): { state: TabState; navigateTo: string | null } {
  const index = state.tabs.findIndex((open) => open.href === href);
  if (index < 0) return { state, navigateTo: null };
  const tabs = state.tabs.filter((open) => open.href !== href);
  if (state.active !== href) return { state: { tabs, active: state.active }, navigateTo: null };
  const neighbour = tabs[index] ?? tabs[index - 1];
  return { state: { tabs, active: neighbour?.href ?? null }, navigateTo: neighbour?.href ?? sectionHome(href) };
}

const isTab = (value: unknown): value is Tab => {
  const tab = value as Partial<Tab> | null;
  return typeof tab?.title === 'string' && typeof tab.href === 'string'
    && tab.href.startsWith('/') && !tab.href.startsWith('//');
};

/** Reads stored tab state, keeping only same-site tabs and discarding anything malformed. */
export function parseTabs(raw: string | null): TabState {
  try {
    const value = JSON.parse(raw ?? 'null') as { tabs?: unknown; active?: unknown } | null;
    const tabs = (Array.isArray(value?.tabs) ? value.tabs : []).filter(isTab).slice(-MAX_TABS);
    const active = tabs.some((tab) => tab.href === value?.active) ? value?.active as string : null;
    return { tabs, active };
  } catch {
    return emptyTabs;
  }
}
