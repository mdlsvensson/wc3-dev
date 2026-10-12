import type { VNode } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { Outline, Sidebar } from "../components/DocNavigation.tsx";
import type { DocMenuProps } from "../sidebar.ts";

export default function DocMenu(
  { sidebar, current, headings }: DocMenuProps,
): VNode {
  const [open, setOpen] = useState<"sidebar" | "outline" | null>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const outlineTrigger = useRef<HTMLButtonElement>(null);
  const dismiss = () => {
    (open === "sidebar" ? menuTrigger : outlineTrigger).current?.focus();
    setOpen(null);
  };
  useLayoutEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [open]);
  const hasOutline = headings.length > 0;
  return (
    <div
      class={`doc-local-nav${hasOutline ? " has-outline" : ""}${
        open ? " is-open" : ""
      }`}
    >
      <button
        ref={menuTrigger}
        type="button"
        aria-expanded={open === "sidebar"}
        aria-controls="doc-mobile-sidebar"
        onClick={() => open === "sidebar" ? dismiss() : setOpen("sidebar")}
      >
        <span aria-hidden="true">☰</span>Menu
      </button>
      {hasOutline
        ? (
          <button
            ref={outlineTrigger}
            type="button"
            aria-expanded={open === "outline"}
            aria-controls="doc-mobile-outline"
            onClick={() => open === "outline" ? dismiss() : setOpen("outline")}
          >
            On this page
          </button>
        )
        : <a class="return-top" href="#top">Return to top</a>}
      <button
        class="doc-menu-backdrop"
        type="button"
        aria-label="Close documentation menu"
        hidden={!open}
        onClick={dismiss}
      />
      <div
        class="doc-mobile-panel"
        id="doc-mobile-sidebar"
        hidden={open !== "sidebar"}
        onClick={(event) => {
          if (
            event.target instanceof Element && event.target.closest("a")
          ) dismiss();
        }}
      >
        <Sidebar tree={sidebar} current={current} />
      </div>
      {hasOutline && (
        <div
          class="doc-mobile-panel mobile-outline"
          id="doc-mobile-outline"
          hidden={open !== "outline"}
          onClick={(event) => {
            const anchor = event.target instanceof Element
              ? event.target.closest("a")
              : null;
            if (!anchor) return;
            const trigger = outlineTrigger.current;
            dismiss();
            if (anchor.getAttribute("href")?.startsWith("#")) {
              // Native fragment navigation moves focus after click dispatch.
              setTimeout(() => {
                if (trigger?.isConnected) {
                  trigger.focus({ preventScroll: true });
                }
              }, 0);
            }
          }}
        >
          <Outline headings={headings} />
        </div>
      )}
    </div>
  );
}
