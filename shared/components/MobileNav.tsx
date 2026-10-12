import type { VNode } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { NavItem } from "../types.ts";
import { GitHubLink } from "./Header.tsx";

export function MobileNav(
  { items, current }: {
    items: readonly NavItem[];
    /** The `href` of the current section's item. */
    current?: string;
  },
): VNode {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dismiss = () => {
    setOpen(false);
    trigger.current?.focus();
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
  return (
    <div class="mobile-navigation">
      <button
        ref={trigger}
        class="menu-toggle"
        type="button"
        aria-label="Main menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => open ? dismiss() : setOpen(true)}
      >
        <span class="menu-lines" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>
      <nav
        id="mobile-menu"
        class="mobile-menu"
        aria-label="Mobile navigation"
        hidden={!open}
        onClick={(event) => {
          if (
            event.target instanceof Element && event.target.closest("a")
          ) dismiss();
        }}
      >
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={item.href === current ? "true" : undefined}
          >
            {item.text}
          </a>
        ))}
        <div class="mobile-social">
          <GitHubLink />
        </div>
      </nav>
    </div>
  );
}
