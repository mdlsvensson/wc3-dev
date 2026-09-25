# Hive activity design

Date: 2026-09-25
Status: Approved design, awaiting spec review
Sub-project: 5 of 5 in the wc3.dev platform roadmap (see `2026-09-22-app-shell-design.md`); bound by `docs/hive-integration.md`

## Goal

wc3.dev shows what is new on Hive Workshop: a "New on Hive" list of recent
Hive resources and tutorials, as metadata and outbound links, so visitors are
sent to Hive. This phase makes no automated request to Hive. The list comes
from a committed snapshot that the owner refreshes from feed files saved in a
browser; a later phase can fill the same snapshot automatically once Hive
staff agree, without changing the view.

## Decisions

- **Showing Hive activity** is the only integration in scope. Import prefill
  for catalog resources and sync of existing resources are out of scope.
- **No network in this phase.** `docs/hive-integration.md` requires contacting
  Hive staff before any automated access is built. Nothing in this
  sub-project requests anything from Hive, at build time, in tooling, or in
  the browser.
- **A committed snapshot**, `src/data/hive-activity.json`, refreshed by the
  owner with a Deno command that reads RSS or Atom files saved from Hive.
- **Metadata only**: titles, authors, categories, dates and links. No
  descriptions, no thumbnails or other files, no page content.
- **Placement**: a "New on Hive" group on `/resources/` and a compact card on
  the home dashboard. The activity rail is unchanged.
- **Opt-outs**: a committed register of authors and URLs to leave out,
  enforced by the import command and by the build, and a public section
  explaining how to ask. The contact method is GitHub issues on the wc3-dev
  repository, held in one constant so an email address can be added later.
- **Outreach**: a ready-to-send message to Hive staff is part of this
  sub-project.

## Non-goals

- Any automated request to Hive (fetching feeds, pages, images or APIs), link
  checking against Hive, or scheduled jobs.
- Thumbnails, descriptions, ratings, download counts or other Hive content.
- Changing catalog resources from Hive data.
- A dedicated `/hive/` section or rail item.

## Data model

`src/data/hive-activity.json`:

```json
{
  "updated": "2026-09-25",
  "entries": [
    {
      "title": "Footman (HD)",
      "authors": ["Name"],
      "category": "Models",
      "published": "2026-09-24",
      "url": "https://www.hiveworkshop.com/threads/footman-hd.123456/"
    }
  ]
}
```

- A Zod schema in `src/lib/hive-schema.ts`, shared by Astro and the Deno
  tooling, validates it: `updated` and `published` are ISO dates; `title` is
  1–120 characters; `authors` has at least one name (the feed's author, as
  Hive lists it); `category` is a short free-text label taken from the feed
  (1–40 characters); `url` must be `https://www.hiveworkshop.com/…`;
  entries are unique by URL and sorted newest first; at most 30 entries.
- An empty `entries` list is valid.

`src/data/hive-optout.json`:

```json
{ "authors": ["Name"], "urls": ["https://www.hiveworkshop.com/threads/…/"] }
```

Author names compare case-insensitively; URLs compare after normalisation
(lowercase host, no query or fragment, trailing slash).

## Refresh: `deno task hive:import <file>… [--dry-run]`

1. Reads each given file: an RSS 2.0 or Atom feed the owner saved from Hive
   in a browser. Any other format is an error naming the file.
2. Maps each item to an entry: title; author (`dc:creator`, `author`, or the
   Atom `author/name`); category (the item's first category, or the feed's
   title when the item has none, e.g. "Models"); published date; link.
   Items without a Hive link or title are skipped and counted.
3. Drops entries matching the opt-out register.
4. Merges with the existing snapshot: new entries replace existing ones with
   the same URL; the result is sorted newest first and cut to 30.
5. Writes the file with `updated` set to today, unless `--dry-run`, and
   prints what was added, updated, dropped by the opt-out, and cut.

The parsing and merging are pure functions, separate from file I/O. Which
feeds Hive offers, and their URLs, is for the owner to confirm; the command
works with any RSS or Atom file.

## Views

### `/resources/`: "New on Hive"

A group below Community & tools, when the snapshot has entries:

- A heading "New on Hive" linking to Hive Workshop, and a line "From Hive
  Workshop, updated 25 September 2026."
- One row per entry: title (outbound link to the Hive page), authors,
  category, and the published date (relative, such as "3 days ago", computed
  at build time, with the full date in a `<time>` element).
- When `updated` is more than 30 days before the build date, the line reads
  "From Hive Workshop, last updated 25 August 2026" and the rows stay.
- A short "Authors on Hive" note under the list: wc3.dev links to Hive and
  never hosts these resources; authors or Hive staff can ask to be left out
  by opening an issue (link), and requests are honoured promptly.

### Home dashboard

A compact "Latest on Hive" card with the five newest entries (title and
category) and a link to the full group on `/resources/`. Hidden when the
snapshot is empty.

## Build checks

The build fails when the snapshot fails the schema, or contains an entry that
matches the opt-out register. The check lives in the shared loader both
views use.

## Outreach

- `docs/hive-outreach.md`: a message to Hive Workshop staff introducing
  wc3.dev, what it shows and how it links to Hive, asking whether an official
  feed or API exists or could be agreed, describing the intended limits
  (descriptive User-Agent, rate limits well below any load, metadata only,
  author opt-out, prompt removals), and asking for their terms.
- `docs/hive-integration.md` gains a "Status" section: contact pending; the
  activity list is refreshed by hand from saved feeds.

## Testing

- **Unit**: RSS and Atom fixture parsing (authors, categories, dates,
  skipped items), merging (replace by URL, order, cap), opt-out matching and
  URL normalisation, the schema (non-Hive URL, duplicate URL, over 30
  entries).
- **Command**: `hive:import --dry-run` on a fixture leaves the file unchanged
  and reports the plan.
- **Build**: with a fixture snapshot (loaded only in the test build, like the
  resource fixtures), `/resources/` lists every entry as an external link to
  hiveworkshop.com with its authors, the home card shows five, the stale line
  appears for an old snapshot, and an empty snapshot hides both.

## Risks

- **Feed availability.** If Hive offers no RSS or Atom feed, the import
  command has nothing to read; the fallback is hand-editing the JSON (the
  schema still validates it). This is the owner's first check.
- **Author names in feeds** may be user names rather than display names; the
  view shows what the feed gives, which is what Hive shows.
- **Staleness.** A hand-refreshed list goes stale; the view says when it was
  updated rather than hiding the age.
