# Hive Workshop integration principles

wc3.dev is a companion to [Hive Workshop](https://www.hiveworkshop.com/), not a
replacement. These rules bind every feature that touches Hive content,
including any future automation (roadmap sub-project 5).

## What wc3.dev does

- Displays a curated selection of resources for browsing and previewing only.
  wc3.dev never offers downloads.
- Links every resource prominently to where it was originally published. For
  resources from Hive, that link is the primary action on the page.
- Credits authors as their original page lists them.

## Permission

- A resource is displayed only with its author's permission or under a licence
  that allows it. The resource's `permission` field records which.
- Authors and Hive staff can ask for a resource to be removed at any time;
  removals happen promptly and without argument.

## Game textures

To render models as they appear in game, wc3.dev hosts the base-game
textures that catalog models reference, and nothing more: no game models,
sounds, or other files. These are Blizzard Entertainment's assets. Blizzard
or its representatives can ask for them to be removed, and removal happens
promptly; models then render with stand-in textures.

## Automated access

No automated access to Hive exists today. Before any is built:

1. Contact Hive Workshop staff, explain the purpose, and ask whether an
   official feed or API exists or could be agreed. Prefer it over scraping.
2. Respect `robots.txt` and Hive's terms of service in full.
3. Identify the client with a descriptive User-Agent that links to wc3.dev.
4. Rate-limit requests well below anything that could affect Hive's service,
   and back off on errors.
5. Cache metadata only (titles, authors, links, tags, dates). Never copy
   resource files or page content in bulk.
6. Provide an opt-out that authors can use without contacting wc3.dev
   directly, and honour it on the next sync.

## Tone

wc3.dev sends people to Hive. Copy on wc3.dev describes Hive as the community
hub it is, and never implies that wc3.dev hosts the canonical version of
anything published there.
