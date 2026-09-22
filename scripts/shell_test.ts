import { strict as assert } from 'node:assert';
import { blurTabs, closeTab, emptyTabs, MAX_TABS, openTab, parseTabs, sectionHome } from '../src/scripts/shell/tabs-state.ts';
import { clampPanelWidth, PANEL_DEFAULT, PANEL_MAX, PANEL_MIN } from '../src/scripts/shell/panel-state.ts';
import { isTypingTarget, matches, SHORTCUTS } from '../src/scripts/shell/keys.ts';

const a = { href: '/resources/models/footman/', title: 'Footman' };
const b = { href: '/learn/terrain/', title: 'Terrain' };
const c = { href: '/learn/triggers/', title: 'Triggers' };

Deno.test('openTab appends and activates a new tab', () => {
  assert.deepEqual(openTab(emptyTabs, a), { tabs: [a], active: a.href });
});

Deno.test('openTab focuses an existing tab without duplicating it and refreshes its title', () => {
  const state = openTab(openTab(emptyTabs, a), b);
  const renamed = { ...a, title: 'Footman (HD)' };
  assert.deepEqual(openTab(state, renamed), { tabs: [renamed, b], active: a.href });
});

Deno.test('openTab evicts the oldest tab beyond the cap', () => {
  let state = emptyTabs;
  for (let i = 0; i <= MAX_TABS; i++) state = openTab(state, { href: `/learn/${i}/`, title: `${i}` });
  assert.equal(state.tabs.length, MAX_TABS);
  assert.equal(state.tabs[0].href, '/learn/1/');
  assert.equal(state.active, `/learn/${MAX_TABS}/`);
});

Deno.test('blurTabs clears only the active marker', () => {
  assert.deepEqual(blurTabs(openTab(emptyTabs, a)), { tabs: [a], active: null });
});

Deno.test('closing an inactive tab does not navigate', () => {
  const state = openTab(openTab(emptyTabs, a), b);
  assert.deepEqual(closeTab(state, a.href), { state: { tabs: [b], active: b.href }, navigateTo: null });
});

Deno.test('closing the active tab moves to its right neighbour, then its left', () => {
  assert.equal(closeTab({ tabs: [a, b, c], active: b.href }, b.href).navigateTo, c.href);
  assert.equal(closeTab({ tabs: [a, b], active: b.href }, b.href).navigateTo, a.href);
});

Deno.test('closing the last tab returns to its section home', () => {
  assert.deepEqual(closeTab(openTab(emptyTabs, a), a.href), { state: emptyTabs, navigateTo: '/resources/' });
});

Deno.test('sectionHome maps hrefs to their landing page', () => {
  assert.equal(sectionHome('/learn/terrain/'), '/learn/');
  assert.equal(sectionHome('/'), '/');
});

Deno.test('parseTabs recovers from malformed or hostile storage', () => {
  assert.deepEqual(parseTabs(null), emptyTabs);
  assert.deepEqual(parseTabs('{oops'), emptyTabs);
  assert.deepEqual(parseTabs('null'), emptyTabs);
  const hostile = {
    tabs: [a, { href: 'https://evil.test/', title: 'x' }, { href: '//evil.test/', title: 'y' }, { title: 'no href' }],
    active: 'https://evil.test/',
  };
  assert.deepEqual(parseTabs(JSON.stringify(hostile)), { tabs: [a], active: null });
  assert.deepEqual(parseTabs(JSON.stringify({ tabs: [a, b], active: b.href })), { tabs: [a, b], active: b.href });
});

Deno.test('clampPanelWidth keeps the panel within bounds', () => {
  assert.equal(clampPanelWidth(10), PANEL_MIN);
  assert.equal(clampPanelWidth(9999), PANEL_MAX);
  assert.equal(clampPanelWidth(301.6), 302);
  assert.equal(clampPanelWidth(Number.NaN), PANEL_DEFAULT);
});

const key = (code: string, modifiers: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }> = {}) =>
  ({ code, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...modifiers });

Deno.test('shortcuts accept Ctrl or Cmd and reject extra modifiers', () => {
  assert(matches(key('KeyK', { ctrlKey: true }), SHORTCUTS.palette));
  assert(matches(key('KeyK', { metaKey: true }), SHORTCUTS.palette));
  assert(!matches(key('KeyK'), SHORTCUTS.palette));
  assert(!matches(key('KeyK', { ctrlKey: true, shiftKey: true }), SHORTCUTS.palette));
  assert(matches(key('KeyB', { ctrlKey: true }), SHORTCUTS.panel));
  assert(matches(key('KeyW', { altKey: true }), SHORTCUTS.closeTab));
  assert(!matches(key('KeyW', { ctrlKey: true }), SHORTCUTS.closeTab));
});

Deno.test('text fields suppress shortcuts', () => {
  assert(isTypingTarget({ tagName: 'INPUT' }));
  assert(isTypingTarget({ tagName: 'TEXTAREA' }));
  assert(isTypingTarget({ tagName: 'DIV', isContentEditable: true }));
  assert(!isTypingTarget({ tagName: 'A' }));
  assert(!isTypingTarget(null));
});
