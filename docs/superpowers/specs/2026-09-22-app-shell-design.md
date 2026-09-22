# App shell design

Date: 2026-09-22
Status: Approved design, awaiting spec review
Sub-project: 1 of 5 in the wc3.dev platform roadmap

## Roadmap context

wc3.dev grows from a single portal page into a static Warcraft III modding
platform that complements Hive Workshop. The site stays fully static (no
backend, no accounts, no uploads); contributions arrive as GitHub pull requests.
Sub-projects, built in order, each with its own spec and plan:

1. **App shell** (this spec) — desktop-application layout and navigation.
2. **Resource system** — typed catalog of models, icons, textures, audio, maps,
   tools, and scripts, with browser and detail views.
3. **Previewers** — MDX/MDL model viewer, BLP/DDS image preview, audio player.
4. **Tutorials** — "Getting started with Reforged modding" track in the shell.
5. **Hive Workshop integration plan** — written strategy, drafted alongside 2.

## Goal

Every non-docs view of wc3.dev renders inside one persistent, desktop-style
shell that behaves like an application while keeping real, prerendered,
shareable URLs. The existing visual language (palette, fonts, gold accent,
angular edges) is preserved; only layout and navigation change.

## Non-goals

- Resource data model, previewers, and tutorial content (later sub-projects).
- Changes to Starlight docs beyond linking back into the shell.
- Accounts, server-side state, or a client UI framework.

## Approach

Static Astro pages plus Astro's `ClientRouter` (`astro:transitions`). Each
route is prerendered HTML. The router swaps only the workspace between
navigations. Regions holding client-only state (the tab strip now, a live
WebGL viewer later) are marked `transition:persist` and stay mounted; Astro
keeps persisted elements verbatim, so regions whose content depends on the page
(rail active state, side panel contents, title bar, status bar) are re-rendered
from the server on every navigation, and the panel width is re-applied from
storage after each swap. Without JavaScript every URL still loads
as a normal page.

Rejected: a client-side SPA with a single `index.html` (loses indexable routes,
needs host rewrites, replaces the stack) and a hybrid of prerendered and
client-only views (complexity without benefit).

## Layout

```
┌───────────────────────────────────────────────────────────────┐
│ ◆ wc3.dev   [ Search resources, tutorials…  Ctrl+K ]    GitHub │  title bar
├──┬──────────────┬─────────────────────────────────────────────┤
│ R│ side panel   │  tab strip                                   │
│ A│              │ ──────────────────────────────────────────── │
│ I│              │  workspace (the page's content)              │
│ L│              │                                              │
├──┴──────────────┴─────────────────────────────────────────────┤
│ status bar                                                    │
└───────────────────────────────────────────────────────────────┘
```

- **Title bar**: brand, command-palette trigger, GitHub link.
- **Activity rail**: Home, Resources, Learn, Framework, then Docs (external
  style arrow; opens Starlight with a full navigation). The active section is
  derived from the URL's first segment and marked `aria-current`.
- **Side panel**: per-section content supplied by the page through a named
  slot (`side`). Pages that provide nothing get a collapsed panel. Resizable
  by dragging its edge (200–420px) and collapsible (Ctrl+B); width and
  collapsed state are stored in `localStorage` (wrapped in try/catch; defaults
  apply when storage is unavailable).
- **Tab strip**: navigating to a page flagged `tab` (resource details and
  tutorials, later) opens or focuses a tab labelled with the page title. The
  section landing pages (`/`, `/resources/`, `/learn/`, `/framework/`) never
  create tabs. Tabs can be closed (× button, middle-click, or Alt+W on the
  active tab, since browsers reserve Ctrl+W) — closing the active tab
  navigates to its neighbour, or the section home when none remain). Tabs persist in `localStorage`, capped at 12 (oldest
  inactive tab drops). The strip is hidden when empty.
- **Workspace**: the page's default slot, the only scroll container
  (`.app-scroll`, reused from the current shell).
- **Status bar**: replaces `AppFooter`; keeps the independence and Blizzard
  copyright notices and adds the site version and links to Hive Workshop and
  the framework repository.
- **Command palette** (Ctrl+K or the title-bar field): a modal search over all
  pages using the Pagefind bundle the build already produces. Shell pages add
  `data-pagefind-body` to their workspace so they are indexed alongside the
  docs. Arrow keys move, Enter opens, Escape closes. If Pagefind fails to load,
  the palette shows an inline error and the rail still works.

## Responsive behaviour

- ≥ 900px: full layout.
- 620–900px: side panel starts collapsed and opens as an overlay.
- < 620px: the rail moves to a bottom bar, the side panel becomes a drawer, the
  tab strip is hidden, and the status bar is reduced to the notices.
- No horizontal page scroll at any width; `prefers-reduced-motion` disables
  view-transition animations.

## Routes after this sub-project

| Route | View |
| --- | --- |
| `/` | Home dashboard: intro, framework card, curated links (current content re-laid out) |
| `/resources/` | Placeholder listing the current curated links, until sub-project 2 |
| `/learn/` | Placeholder "Tutorials coming soon" view, until sub-project 4 |
| `/framework/` | Current overview page, moved into the shell |
| `/framework/docs/**` | Starlight, unchanged apart from its "Back to wc3.dev" link |

## Components and modules

| Unit | Responsibility |
| --- | --- |
| `src/layouts/Shell.astro` (replaces `Portal.astro`) | Document head, `ClientRouter`, shell regions, `side` and default slots; props: `title`, `description`, `tab?` |
| `src/components/shell/ActivityRail.astro` | Section links and active state |
| `src/components/shell/TitleBar.astro` | Brand, palette trigger, GitHub link |
| `src/components/shell/StatusBar.astro` | Replaces `AppFooter.astro` |
| `src/components/shell/TabStrip.astro` | Empty persisted container, filled by `tabs.ts` |
| `src/components/shell/CommandPalette.astro` | Dialog markup |
| `src/scripts/shell/tabs-state.ts` | Pure tab reducer (`openTab`, `blurTabs`, `closeTab`, `parseTabs`) |
| `src/scripts/shell/tabs.ts` | Tab DOM rendering and `localStorage` sync |
| `src/scripts/shell/panel-state.ts` | Pure panel width clamping |
| `src/scripts/shell/panel.ts` | Resize, collapse, persistence |
| `src/scripts/shell/palette.ts` | Pagefind loading, results, keyboard handling |
| `src/scripts/shell/keys.ts` | Shortcut matching (pure) |
| `src/scripts/shell/index.ts` | Wires modules to `astro:page-load` / `astro:after-swap` and global keys; shortcuts ignored while focus is in a text field |
| `src/styles/shell.css` | Shell grid and regions (merges `app-shell.css`) |

Scripts re-bind to freshly rendered elements after each navigation via the
`astro:page-load` event and keep their state in module scope; only the tab
strip is persisted.

## Accessibility

Landmarks (`header`, `nav` for rail, `aside` for the panel, `main` for the
workspace, `footer` for the status bar); skip link retained; tabs use
`role="tablist"`/`role="tab"`; the palette is a `<dialog>` with focus
trapped and restored; all shortcuts have visible, clickable equivalents;
focus moves to the workspace after client-side navigation.

## Testing

- **Unit** (`deno test`): the tab reducer (open, focus existing, close active,
  cap eviction) and shortcut matching.
- **Build tests** (`scripts/site_test.ts`): extend the required-route list with
  `/resources/` and `/learn/`; assert every shell page contains the rail, the
  persisted tab strip, and `data-pagefind-body`; keep the existing
  link, anchor, and asset checks.
- **Manual**: verify in the browser pane at desktop, tablet, and mobile widths
  that navigation keeps tabs and panel width, the palette finds a docs page,
  and there is no horizontal scroll.

## Risks

- `ClientRouter` re-runs inline scripts differently from full loads; all shell
  scripts are modules bound through `astro:page-load` to stay idempotent.
- Pagefind: Starlight's Pagefind step indexes the whole `dist/` directory, so
  shell pages marked `data-pagefind-body` are indexed with no extra build step.
  The index only exists after a production build; in `astro dev` the palette
  shows its unavailable state.
