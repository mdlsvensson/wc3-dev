import { type CardFacts, type FilterState, matchesFilters, parseFilters, serializeFilters } from './filter-state.ts';

const VIEW_KEY = 'wc3.resources.view';

function facts(card: HTMLElement): CardFacts {
  return {
    tags: card.dataset.tags ? card.dataset.tags.split(' ') : [],
    authors: card.dataset.authors ? JSON.parse(card.dataset.authors) : [],
    sd: card.dataset.sd === 'true',
    hd: card.dataset.hd === 'true',
  };
}

function readForm(form: HTMLFormElement): FilterState {
  const params = new URLSearchParams();
  for (const [name, value] of new FormData(form)) if (typeof value === 'string' && value) params.append(name, value);
  return parseFilters(params.toString());
}

function writeForm(form: HTMLFormElement, state: FilterState): void {
  for (const input of form.querySelectorAll<HTMLInputElement>('input')) {
    if (input.name === 'tag') input.checked = state.tags.includes(input.value);
    else if (input.name === 'sd') input.checked = state.sd;
    else if (input.name === 'hd') input.checked = state.hd;
    else if (input.name === 'author') input.value = state.author;
  }
}

function initLayoutToggle(catalog: HTMLElement): void {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-view]')];
  const show = (layout: string) => {
    catalog.dataset.layout = layout;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.view === layout));
  };
  let saved: string | null = null;
  try { saved = localStorage.getItem(VIEW_KEY); } catch { /* Storage unavailable: default to grid. */ }
  if (saved === 'grid' || saved === 'list') show(saved);
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const layout = button.dataset.view ?? 'grid';
      show(layout);
      try { localStorage.setItem(VIEW_KEY, layout); } catch { /* Storage unavailable: keep for this page only. */ }
    });
  }
}

function initCatalog(): void {
  const catalog = document.querySelector<HTMLElement>('[data-catalog]');
  if (!catalog) return;
  initLayoutToggle(catalog);
  const form = document.querySelector<HTMLFormElement>('[data-filter-form]');
  if (!form) return;
  const cards = [...catalog.querySelectorAll<HTMLElement>('[data-resource-card]')].map((element) => ({ element, facts: facts(element) }));
  const count = document.querySelector<HTMLElement>('[data-catalog-count]');
  const empty = document.querySelector<HTMLElement>('[data-catalog-empty]');

  const apply = (state: FilterState) => {
    let shown = 0;
    for (const card of cards) {
      const visible = matchesFilters(card.facts, state);
      card.element.hidden = !visible;
      if (visible) shown++;
    }
    if (count) count.textContent = `${shown} ${shown === 1 ? 'resource' : 'resources'}`;
    if (empty) empty.hidden = shown > 0;
  };
  const update = () => {
    const state = readForm(form);
    apply(state);
    // Keep the router's own history state; only the query changes.
    history.replaceState(history.state, '', location.pathname + serializeFilters(state) + location.hash);
  };

  const initial = parseFilters(location.search);
  writeForm(form, initial);
  apply(initial);
  form.addEventListener('input', update);
  form.addEventListener('submit', (event) => event.preventDefault());
  // The reset event fires before the fields are cleared.
  form.addEventListener('reset', () => setTimeout(update));
}

document.addEventListener('astro:page-load', initCatalog);
