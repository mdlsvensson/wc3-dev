import { activeIndex } from './outline-state.ts';

/** How far below the top of the workspace a heading counts as "being read". */
const OFFSET = 96;

let cleanup: (() => void) | undefined;

/**
 * The side panel is rendered afresh on every navigation, so its scroll starts at the top.
 * Scroll only the panel (not the workspace or the page) so the current lesson is visible.
 */
function revealCurrentLesson(): void {
  const link = document.querySelector<HTMLElement>('.track-outline [aria-current="page"]');
  const panel = link?.closest<HTMLElement>('.side-panel-content');
  if (!link || !panel) return;
  const view = panel.getBoundingClientRect();
  const box = link.getBoundingClientRect();
  if (box.top < view.top) panel.scrollTop += box.top - view.top;
  else if (box.bottom > view.bottom) panel.scrollTop += Math.min(box.bottom - view.bottom, box.top - view.top);
}

function bind(): void {
  revealCurrentLesson();
  const main = document.getElementById('main');
  const pairs = [...document.querySelectorAll<HTMLAnchorElement>('.track-outline .outline-headings a')]
    .map((link) => ({ link, heading: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
    .filter((pair): pair is { link: HTMLAnchorElement; heading: HTMLElement } => pair.heading !== null);
  if (!main || pairs.length === 0) return;

  let frame = 0;
  const update = () => {
    frame = 0;
    const top = main.getBoundingClientRect().top;
    const tops = pairs.map(({ heading }) => heading.getBoundingClientRect().top - top);
    const atBottom = main.scrollTop + main.clientHeight >= main.scrollHeight - 2;
    const active = activeIndex(tops, OFFSET, atBottom);
    pairs.forEach(({ link }, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  main.addEventListener('scroll', onScroll, { passive: true });
  update();
  cleanup = () => {
    main.removeEventListener('scroll', onScroll);
    if (frame) cancelAnimationFrame(frame);
  };
}

document.addEventListener('astro:page-load', bind);
document.addEventListener('astro:before-swap', () => {
  cleanup?.();
  cleanup = undefined;
});
