# Changelog

## Unreleased

- Migrate wc3.dev and docs.wc3.dev to two independent Deno/Fresh apps hosted by Cloudflare Workers.
- Preserve the landing pages, documentation, navigation, artwork, self-hosted fonts and asset licences.
- Compile and validate Markdown during the build, with a lazy documentation search and keyboard-accessible menus.
- Validate home-domain pages and shared assets, and resolve known documentation overview aliases consistently.
- Add pinned, checksum-verified Deno build setup and independent build, preview and deployment configurations.
- Group the documentation sidebar, with labels per page, and stop sending every page's content with each page.
- Add code groups with remembered language tabs, notes and warnings, a copy button and language labels.
- Highlight YueScript, Pkl, TOML, JSON, shell and PowerShell; a code block must name a known language.
- Add hand-written heading ids, which must end the heading, heading links, and an outline that scrolls and marks the
  current heading.
- Search finds a name whole or by its parts, and a qualified name finds its section; the index file is smaller and at
  most twenty results are drawn.
- Give each page its own description, mark the current section and redirect a trailing slash.
- Add `check:examples` and a sample site for tests and visual checks.
