import { clampPanelWidth } from './panel-state.ts';

const WIDTH_KEY = 'wc3.panel.width';
const COLLAPSED_KEY = 'wc3.panel.collapsed';
const root = document.documentElement;
const isNarrow = () => matchMedia('(max-width: 900px)').matches;

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* Storage unavailable: keep the in-memory state only. */ }
}

function setWidth(width: number): number {
  const clamped = clampPanelWidth(width);
  root.style.setProperty('--panel-width', `${clamped}px`);
  document.querySelector('.panel-resizer')?.setAttribute('aria-valuenow', String(clamped));
  return clamped;
}

function syncToggle(): void {
  const expanded = root.dataset.panel === 'open' && document.getElementById('side-panel') !== null;
  document.querySelector('[data-panel-toggle]')?.setAttribute('aria-expanded', String(expanded));
}

/** Re-applies stored panel state; Astro replaces the <html> attributes on every navigation. */
export function applyPanel(): void {
  const width = read(WIDTH_KEY);
  if (width) setWidth(Number(width));
  root.dataset.panel = isNarrow() || read(COLLAPSED_KEY) === '1' ? 'collapsed' : 'open';
  syncToggle();
}

export function togglePanel(): void {
  if (!document.getElementById('side-panel')) return;
  const collapse = root.dataset.panel !== 'collapsed';
  root.dataset.panel = collapse ? 'collapsed' : 'open';
  // On narrow screens the panel is a temporary overlay, so its state is not remembered.
  if (!isNarrow()) write(COLLAPSED_KEY, collapse ? '1' : '0');
  syncToggle();
}

export function closePanelOverlay(): void {
  if (isNarrow() && root.dataset.panel === 'open') togglePanel();
}

/** Binds the controls rendered with the current page. */
export function initPanel(): void {
  document.querySelector('[data-panel-toggle]')?.addEventListener('click', togglePanel);
  document.querySelector('.workspace')?.addEventListener('click', closePanelOverlay);
  const panel = document.getElementById('side-panel');
  const handle = panel?.querySelector<HTMLElement>('.panel-resizer');
  if (!panel || !handle) return;
  handle.setAttribute('aria-valuenow', String(Math.round(panel.getBoundingClientRect().width)));

  handle.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const left = panel.getBoundingClientRect().left;
    handle.setPointerCapture(event.pointerId);
    handle.dataset.dragging = '';
    const move = (e: PointerEvent) => setWidth(e.clientX - left);
    const end = (e: PointerEvent) => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      delete handle.dataset.dragging;
      write(WIDTH_KEY, String(setWidth(e.clientX - left)));
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  });

  handle.addEventListener('keydown', (event) => {
    const step = event.key === 'ArrowLeft' ? -16 : event.key === 'ArrowRight' ? 16 : 0;
    if (!step) return;
    event.preventDefault();
    write(WIDTH_KEY, String(setWidth(panel.getBoundingClientRect().width + step)));
  });
}
