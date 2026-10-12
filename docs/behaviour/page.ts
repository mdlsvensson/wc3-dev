import {
  chooseLanguage,
  nextTab,
  pageLanguages,
  pickLanguage,
  storageKey,
} from "./languages.ts";
import { currentHeading } from "./outline.ts";

// Behaviour for compiled text. It reads the document and holds no page data; every decision it makes is in
// languages.ts and outline.ts.

/** The list the page holds, or else the stored one: storage may be blocked or full, the page's own value is not. */
function readLanguages(): string[] {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch {
    // No storage: the page's own value, if any, is all there is.
  }
  return pageLanguages(
    document.documentElement.getAttribute("data-code-languages"),
    stored,
  );
}

function blocksOf(group: Element): HTMLElement[] {
  return [...group.querySelectorAll<HTMLElement>(":scope > .code-block")];
}

function applyGroups(stored: readonly string[]): void {
  document.querySelectorAll<HTMLElement>(".code-group").forEach(
    (group, number) => {
      const blocks = blocksOf(group);
      const shown = pickLanguage(stored, blocks.map((b) => b.dataset.lang!));
      for (const block of blocks) {
        const language = block.dataset.lang!;
        block.id = `code-${number}-${language}`;
        block.setAttribute("role", "tabpanel");
        block.setAttribute("aria-labelledby", `${block.id}-tab`);
        block.hidden = language !== shown;
      }
      for (const tab of group.querySelectorAll<HTMLElement>(".code-tab")) {
        const language = tab.dataset.lang!;
        tab.id = `code-${number}-${language}-tab`;
        tab.setAttribute("aria-controls", `code-${number}-${language}`);
        tab.setAttribute("aria-selected", String(language === shown));
        tab.tabIndex = language === shown ? 0 : -1;
      }
      group.dataset.ready = "";
    },
  );
}

function choose(tab: HTMLElement): void {
  const group = tab.closest(".code-group")!;
  const stored = chooseLanguage(
    readLanguages(),
    blocksOf(group).map((block) => block.dataset.lang!),
    tab.dataset.lang!,
  );
  try {
    localStorage.setItem(storageKey, stored.join(" "));
  } catch {
    // The choice still applies to this page.
  }
  document.documentElement.dataset.codeLanguages = stored.join(" ");
  // Groups above change height with their language: keep the clicked tab where the reader's pointer is.
  const before = tab.getBoundingClientRect().top;
  applyGroups(stored);
  scrollBy(0, tab.getBoundingClientRect().top - before);
}

function codeGroups(): void {
  applyGroups(readLanguages());
  document.addEventListener("click", (event) => {
    const tab = event.target instanceof Element
      ? event.target.closest<HTMLElement>(".code-tab")
      : null;
    if (tab) choose(tab);
  });
  document.addEventListener("keydown", (event) => {
    const tab = event.target instanceof Element
      ? event.target.closest<HTMLElement>(".code-tab")
      : null;
    // A key with a modifier is the browser's own (Alt+Left is Back): leave it alone.
    if (
      !tab || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
    ) {
      return;
    }
    const tabs = [
      ...tab.parentElement!.querySelectorAll<HTMLElement>(".code-tab"),
    ];
    const next = nextTab(tabs.length, tabs.indexOf(tab), event.key);
    if (next === undefined) return;
    event.preventDefault();
    choose(tabs[next]);
    tabs[next].focus();
  });
}

function copyButtons(): void {
  if (!navigator.clipboard) return;
  for (const block of document.querySelectorAll(".code-block")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy";
    button.textContent = "Copy";
    button.setAttribute("aria-live", "polite");
    // Before the code, so that the keyboard reaches the button where it is drawn: above the code.
    block.prepend(button);
  }
  document.addEventListener("click", (event) => {
    const button = event.target instanceof Element
      ? event.target.closest<HTMLElement>(".code-copy")
      : null;
    const code = button?.parentElement?.querySelector("pre")?.textContent;
    if (!button || code == null) return;
    const say = (text: string) => {
      button.textContent = text;
      setTimeout(() => button.textContent = "Copy", 2000);
    };
    navigator.clipboard.writeText(code).then(
      () => say("Copied"),
      () => say("Not copied"),
    );
  });
}

// The mark only sets aria-current and scrolls the outline's own box: never the page, which the browser's own
// scroll to a fragment owns.
function outlineMark(): void {
  const box = document.querySelector<HTMLElement>(
    ".doc-outline .outline-links",
  );
  if (!box) return;
  const links = [...box.querySelectorAll<HTMLAnchorElement>("a")];
  const headings = links.flatMap((link) => {
    const heading = document.getElementById(
      decodeURIComponent(link.hash.slice(1)),
    );
    return heading ? [heading] : [];
  });
  let frame = 0;
  const update = () => {
    frame = 0;
    const id = currentHeading(
      headings.map((heading) => ({
        id: heading.id,
        top: heading.getBoundingClientRect().top,
      })),
      112,
      // A page that fits the window is at its bottom without a scroll: there the line alone decides.
      scrollY > 0 &&
        innerHeight + scrollY >= document.documentElement.scrollHeight - 2,
    );
    for (const link of links) {
      const on = id !== undefined &&
        decodeURIComponent(link.hash.slice(1)) === id;
      if (on === (link.getAttribute("aria-current") === "location")) continue;
      if (!on) {
        link.removeAttribute("aria-current");
        continue;
      }
      link.setAttribute("aria-current", "location");
      const rect = link.getBoundingClientRect();
      const frameRect = box.getBoundingClientRect();
      if (rect.top < frameRect.top) box.scrollTop -= frameRect.top - rect.top;
      else if (rect.bottom > frameRect.bottom) {
        box.scrollTop += rect.bottom - frameRect.bottom;
      }
    }
  };
  addEventListener("scroll", () => {
    frame ||= requestAnimationFrame(update);
  }, { passive: true });
  update();
}

export function enhancePage(): void {
  codeGroups();
  copyButtons();
  outlineMark();
}
