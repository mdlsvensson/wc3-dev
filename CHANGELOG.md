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
- Add hand-written heading ids, heading links, and an outline that scrolls and marks the current heading.
- Find a name in the search whole or by its parts, and a section by a qualified name; shrink the index file and draw at
  most twenty results.
- Give each page its own description, mark the current section and redirect a trailing slash.
- Add `check:examples` and a sample site for tests and visual checks.
- Refuse a heading id that the page itself uses, such as `top`, for a made id and a hand-written one alike.
- Draw code comments in the palette's secondary text colour, for contrast.
- Keep a dot in a made heading id where it stands between two letters or digits.
- Add `docs/versions.json` and a test that holds every version a page names to it.
