import { navigate } from 'astro:transitions/client';
import { blurTabs, closeTab, emptyTabs, openTab, parseTabs, type Tab, type TabState } from './tabs-state.ts';

const STORAGE_KEY = 'wc3.tabs';
let state: TabState = load();

function load(): TabState {
  try { return parseTabs(localStorage.getItem(STORAGE_KEY)); } catch { return emptyTabs; }
}
function save(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Storage unavailable: tabs last for this visit only. */ }
}

/** Opens a tab for pages that declare `<meta name="wc3-tab">`; otherwise only clears the active tab. */
export function syncTabs(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="wc3-tab"]');
  state = meta ? openTab(state, { href: location.pathname, title: meta.content }) : blurTabs(state);
  save();
  render();
}

export function closeActiveTab(): void {
  if (state.active) close(state.active);
}

function close(href: string): void {
  const result = closeTab(state, href);
  state = result.state;
  save();
  render();
  if (result.navigateTo) void navigate(result.navigateTo);
}

function render(): void {
  const strip = document.getElementById('tab-strip');
  if (!strip) return;
  strip.hidden = state.tabs.length === 0;
  strip.replaceChildren(...state.tabs.map(renderTab));
}

function renderTab(tab: Tab): HTMLElement {
  const item = document.createElement('div');
  item.className = 'tab';
  const link = document.createElement('a');
  link.href = tab.href;
  link.textContent = tab.title;
  link.title = tab.title;
  link.setAttribute('role', 'tab');
  link.setAttribute('aria-selected', String(tab.href === state.active));
  // Middle-click closes the tab, as in editors, instead of opening a browser tab.
  link.addEventListener('mousedown', (event) => { if (event.button === 1) event.preventDefault(); });
  link.addEventListener('auxclick', (event) => {
    if (event.button !== 1) return;
    event.preventDefault();
    close(tab.href);
  });
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tab-close';
  button.setAttribute('aria-label', `Close ${tab.title}`);
  button.textContent = '×';
  button.addEventListener('click', () => close(tab.href));
  item.append(link, button);
  return item;
}
