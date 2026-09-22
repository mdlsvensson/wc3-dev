import { isTypingTarget, matches, SHORTCUTS } from './keys.ts';
import { initPalette, openPalette } from './palette.ts';
import { applyPanel, closePanelOverlay, initPanel, togglePanel } from './panel.ts';
import { closeActiveTab, syncTabs } from './tabs.ts';

let initialLoad = true;

document.addEventListener('astro:after-swap', applyPanel);

document.addEventListener('astro:page-load', () => {
  applyPanel();
  initPanel();
  syncTabs();
  initPalette();
  // After client-side navigation, move focus into the new workspace; leave the initial load alone.
  if (!initialLoad) document.getElementById('main')?.focus({ preventScroll: true });
  initialLoad = false;
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') return closePanelOverlay();
  if (isTypingTarget(event.target as HTMLElement | null)) return;
  if (matches(event, SHORTCUTS.palette)) {
    event.preventDefault();
    openPalette();
  }
  if (matches(event, SHORTCUTS.panel)) {
    event.preventDefault();
    togglePanel();
  }
  if (matches(event, SHORTCUTS.closeTab)) {
    event.preventDefault();
    closeActiveTab();
  }
});
