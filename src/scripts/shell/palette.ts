import { navigate } from 'astro:transitions/client';

interface PagefindData { url: string; excerpt: string; meta: { title?: string } }
interface Pagefind {
  init?: () => Promise<void>;
  debouncedSearch: (term: string, options?: object, debounceMs?: number) =>
    Promise<{ results: { data: () => Promise<PagefindData> }[] } | null>;
}

const MAX_RESULTS = 8;
const UNAVAILABLE = 'Search is unavailable right now. Use the sections on the left to browse.';
let pagefind: Promise<Pagefind> | null = null;
let results: PagefindData[] = [];
let selected = 0;

function loadPagefind(): Promise<Pagefind> {
  // The index is emitted by the production build, so load it at runtime instead of through the bundler.
  const url = '/pagefind/pagefind.js';
  if (!pagefind) {
    pagefind = import(/* @vite-ignore */ url).then(async (module: Pagefind) => {
      await module.init?.();
      return module;
    });
    pagefind.catch(() => { pagefind = null; });
  }
  return pagefind;
}

function elements() {
  const dialog = document.getElementById('command-palette') as HTMLDialogElement | null;
  if (!dialog) return null;
  return {
    dialog,
    input: dialog.querySelector<HTMLInputElement>('#palette-input')!,
    list: dialog.querySelector<HTMLUListElement>('#palette-results')!,
    status: dialog.querySelector<HTMLElement>('.palette-status')!,
  };
}
type PaletteElements = NonNullable<ReturnType<typeof elements>>;

function render(ui: PaletteElements): void {
  ui.list.replaceChildren(...results.map((result, index) => {
    const item = document.createElement('li');
    item.id = `palette-option-${index}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(index === selected));
    const title = document.createElement('strong');
    title.textContent = result.meta.title ?? result.url;
    const excerpt = document.createElement('span');
    excerpt.textContent = result.excerpt.replace(/<[^>]*>/g, '');
    item.append(title, excerpt);
    item.addEventListener('click', () => go(ui, index));
    return item;
  }));
  ui.input.setAttribute('aria-expanded', String(results.length > 0));
  if (results.length) ui.input.setAttribute('aria-activedescendant', `palette-option-${selected}`);
  else ui.input.removeAttribute('aria-activedescendant');
  ui.list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}

async function search(ui: PaletteElements, term: string): Promise<void> {
  const query = term.trim();
  if (!query) {
    results = [];
    render(ui);
    ui.status.textContent = 'Type to search.';
    return;
  }
  try {
    const response = await (await loadPagefind()).debouncedSearch(query, {}, 150);
    if (response === null) return; // Superseded by a newer keystroke.
    results = await Promise.all(response.results.slice(0, MAX_RESULTS).map((result) => result.data()));
    selected = 0;
    render(ui);
    ui.status.textContent = results.length ? `${results.length} results` : `No results for “${query}”.`;
  } catch {
    results = [];
    render(ui);
    ui.status.textContent = UNAVAILABLE;
  }
}

function go(ui: PaletteElements, index: number): void {
  const result = results[index];
  if (!result) return;
  ui.dialog.close();
  void navigate(result.url);
}

export function openPalette(): void {
  const ui = elements();
  if (!ui || ui.dialog.open) return;
  ui.dialog.showModal();
  ui.input.select();
  void search(ui, ui.input.value);
  loadPagefind().catch(() => { ui.status.textContent = UNAVAILABLE; });
}

/** Binds the trigger and dialog rendered with the current page. */
export function initPalette(): void {
  document.querySelectorAll('[data-palette-open]').forEach((trigger) => trigger.addEventListener('click', openPalette));
  const ui = elements();
  if (!ui) return;
  ui.input.addEventListener('input', () => void search(ui, ui.input.value));
  ui.input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!results.length) return;
      selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      render(ui);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(ui, selected);
    }
  });
  // A click on the dialog element itself lands on the backdrop, outside .palette-body.
  ui.dialog.addEventListener('click', (event) => { if (event.target === ui.dialog) ui.dialog.close(); });
}
