import type { VNode } from "preact";
import { useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { createSearchLoader } from "../search/loader.ts";
import { tabBoundaryTarget } from "../search/focus.ts";
import type { SearchEngine } from "../search/types.ts";

const loadEngine = createSearchLoader(async () => {
  const client = await import("../search/client.ts");
  return client.loadSearchEngine();
});

export default function Search(): VNode {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [engine, setEngine] = useState<SearchEngine>();
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const results = useMemo(() => engine?.search(query) ?? [], [engine, query]);
  useLayoutEffect(() => setSelected(0), [results]);
  useLayoutEffect(() => {
    if (!dialog.current?.open) return;
    dialog.current.querySelector<HTMLElement>(`#search-result-${selected}`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [results, selected]);
  const close = () => {
    dialog.current?.close();
    trigger.current?.focus({ preventScroll: true });
  };
  const load = async () => {
    setStatus("loading");
    try {
      setEngine(await loadEngine());
      setStatus("ready");
    } catch {
      setStatus("failed");
    }
  };
  const open = () => {
    if (dialog.current?.open) return;
    dialog.current?.showModal();
    input.current?.focus();
    if (!engine) void load();
  };
  useLayoutEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open();
      }
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [engine]);

  return (
    <div class="documentation-search">
      <button
        ref={trigger}
        type="button"
        class="search-trigger"
        aria-label="Search documentation"
        aria-haspopup="dialog"
        onClick={open}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle
            cx="10"
            cy="10"
            r="6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="m15 15 6 6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          />
        </svg>
        <span>Search</span>
      </button>
      <dialog
        ref={dialog}
        class="search-dialog"
        aria-labelledby="search-label"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            // Search inputs otherwise consume the first Escape to clear their value.
            event.preventDefault();
            event.stopPropagation();
            close();
          } else if (event.key === "Tab") {
            const stops = [...event.currentTarget.querySelectorAll<HTMLElement>(
              "button, input, select, textarea, a[href], [tabindex]",
            )].filter((element) =>
              element.tabIndex >= 0 && !element.hasAttribute("disabled") &&
              element.getClientRects().length > 0
            );
            const target = tabBoundaryTarget(
              stops,
              document.activeElement as HTMLElement | null,
              event.shiftKey,
            );
            if (target) {
              event.preventDefault();
              target.focus();
            }
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => trigger.current?.focus({ preventScroll: true })}
      >
        <div class="search-input-row">
          <label
            id="search-label"
            class="visually-hidden"
            for="docs-search-input"
          >
            Search documentation
          </label>
          <input
            ref={input}
            id="docs-search-input"
            type="search"
            placeholder="Search documentation"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={results[selected]
              ? `search-result-${selected}`
              : undefined}
            value={query}
            onInput={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (!results.length) return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((current) =>
                  (current + (event.key === "ArrowDown" ? 1 : -1) +
                    results.length) % results.length
                );
              } else if (event.key === "Enter") {
                event.preventDefault();
                const result = results[selected];
                close();
                globalThis.location.assign(result.url);
              }
            }}
          />
          <button
            type="button"
            class="search-close"
            aria-label="Close search"
            onClick={close}
          >
            ×
          </button>
        </div>
        <div class="search-status" role="status" aria-live="polite">
          {status === "loading"
            ? "Loading search…"
            : status === "failed"
            ? "Search could not be loaded."
            : !query.trim()
            ? "Type to search documentation."
            : !results.length
            ? <>No results for “{query}”.</>
            : `${results.length} results`}
        </div>
        {status === "failed" && (
          <button
            type="button"
            class="search-retry"
            onClick={() => void load()}
          >
            Retry
          </button>
        )}
        <ul
          id="search-results"
          class="search-results"
          role="listbox"
          aria-label="Search results"
        >
          {results.map((result, i) => (
            <li key={result.id}>
              <a
                id={`search-result-${i}`}
                href={result.url}
                role="option"
                aria-selected={i === selected}
                tabIndex={-1}
                onClick={close}
                onMouseMove={() => setSelected(i)}
              >
                <span class="search-result-title">
                  {result.title}
                  {result.heading && <>› {result.heading}</>}
                </span>
                <span class="search-excerpt">{result.excerpt}</span>
              </a>
            </li>
          ))}
        </ul>
      </dialog>
    </div>
  );
}
