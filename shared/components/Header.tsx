import type { ComponentChildren, VNode } from "preact";
import type { NavItem } from "../types.ts";

export function GitHubLink(): VNode {
  return (
    <a
      class="github-link"
      href="https://github.com/mdlsvensson/moonwell"
      aria-label="GitHub"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.44 9.81 8.21 11.4.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.85 1.24 1.85 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.6-2.8 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.3c0 .32.22.7.83.58A12 12 0 0 0 24 12C24 5.37 18.63 0 12 0Z"
        />
      </svg>
    </a>
  );
}

export function Header(
  { items, children, leading }: {
    items: readonly NavItem[];
    children?: ComponentChildren;
    leading?: ComponentChildren;
  },
): VNode {
  const brand = (
    <a class="brand" href="/" aria-label="Moonwell home">
      <img
        class="wordmark"
        src="/mw-text-edit.png"
        alt="Moonwell"
        width="128"
        height="48"
      />
    </a>
  );
  return (
    <>
      <a class="skip-link" href="#main-content">Skip to content</a>
      <header class="site-header">
        <div class="header-inner">
          {leading ? <div class="header-start">{brand}{leading}</div> : brand}
          <div class="header-controls">
            <nav class="desktop-nav" aria-label="Main navigation">
              {items.map((item) => (
                <a key={item.href} href={item.href}>{item.text}</a>
              ))}
            </nav>
            <div class="desktop-social">
              <GitHubLink />
            </div>
            {children}
          </div>
        </div>
      </header>
    </>
  );
}
