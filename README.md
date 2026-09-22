# wc3.dev

An independent Warcraft III developer portal, built with Deno, Astro, Starlight,
Astro Content Collections with Zod, lucide-astro, and Shiki.

## Local development

Install Deno 2.9 or newer (2.x), then run from this directory:

```sh
deno install --frozen
deno task dev
```

Open the local URL printed by Astro (normally http://127.0.0.1:4321).
No standalone Node.js installation or npm commands are required. Dependencies are
declared in `package.json` and locked in `deno.lock`; do not add npm lockfiles.
The package name `lucide-astro` is retained as requested; its publisher now marks
it deprecated in favor of `@lucide/astro`.

Astro 7 can run its development server in the background. Stop it with
`deno run -A npm:astro dev stop` before building or checking in the same checkout,
since these commands share generated content caches. Restart `deno task dev`
when finished.

## Validate and build

```sh
deno task check
deno task build
deno task test
deno task preview
```

`deno task test` builds with test fixtures first (`deno task build:test`), then runs the tests.
They check required routes, all generated local links and anchors, asset references, the search
bundle, and syntax tokenization. For deployments, use `deno task build`, which never includes
fixtures. The build clears Astro's content cache so theme changes cannot leave generated
code blocks referencing old stylesheets. Code-block styles are inlined with the content.
`dist/` is a static website, suitable for any static host. Serve the generated
`404.html` for missing pages. Production hosting and DNS are not configured.
`astro.config.ts` sets the canonical origin to `https://wc3.dev`.

## Structure

| Path | Purpose |
| --- | --- |
| `src/pages/index.astro` | Community and modding resource portal |
| `src/pages/framework/index.astro` | Framework landing page at `/framework/` |
| `src/content/docs/framework/docs/` | Starlight docs at `/framework/docs/` |
| `src/content/resources/` | Resource cards, validated with Zod — curated links in `link/`, hosted resources in `<type>/`, build fixtures in `_fixtures/` |
| `src/content.config.ts` | Content collection loaders and schemas |
| `src/syntax/jass.ts` | Project-owned JASS / basic vJASS TextMate grammar |
| `src/styles/` | Portal and Starlight themes |

### Resources

Resources are view-only: the site previews them and links to where they were
originally published, and never offers downloads. Only the maintainer adds
them. See `docs/hive-integration.md` for the rules on third-party content.

- **Curated links** (`type: "link"`): write
  `src/content/resources/link/<slug>.json` by hand.
- **Hosted resources** (models, icons, textures, audio, scripts): put the files
  and a `resource.json` with the authored fields in a folder named after the
  slug, then run:

  ```sh
  deno task resource:add path/to/<slug> --dry-run   # preview the result
  deno task resource:add path/to/<slug> --local     # store files in .asset-store/
  deno task resource:add path/to/<slug>             # upload to the asset store
  ```

  Uploads need `ASSET_STORE_ENDPOINT`, `ASSET_STORE_BUCKET`,
  `ASSET_STORE_ACCESS_KEY_ID`, and `ASSET_STORE_SECRET_ACCESS_KEY`. Add a
  `preview.png` for models. Pass `--update` to replace an existing resource.
- `deno task resource:check` validates every resource (`--remote` also checks
  the store at `ASSET_BASE_URL`).
- `deno task assets:serve` serves `.asset-store/` on `http://127.0.0.1:4322/`,
  the default asset URL in development.
- Production builds must set `ASSET_BASE_URL` once any hosted resource exists.
  Configure the store with no public listing, a CORS allowlist for the site's
  origins, and hotlink protection.

Add documentation as Markdown with `title` and `description` frontmatter, then
add its slug to the sidebar in `astro.config.ts`.

TypeScript and Lua use Shiki's built-in grammars. JASS is registered in both
Astro's Markdown renderer and Starlight's Expressive Code renderer. Use fenced
code blocks labeled `typescript`, `lua`, or `jass`. JASS highlighting is lexical;
it is not a compiler or validator.

Mona Sans is the site text font; Monaspace Argon 1.400 is used for code. Both are
self-hosted under `public/fonts/`, with their licenses and sources included there.
Shared font definitions live in `src/styles/fonts.css`.

## Documentation migration

All eight Markdown pages from `w3ts-framework/docs` are now hosted here. The former
`docs/README.md` becomes `/framework/docs/`. Internal links use the website routes;
contributing and changelog links point to the framework source repository.
The framework's MIT license is retained in `LICENSE` for the migrated material.

This repository is independent and does not read from the framework at build time.
The original framework repository is untouched to respect the requested folder
boundary. Once this site is published, its documentation links can be redirected
to wc3.dev and the original copies retired in a separate framework change.

Warcraft III is a Blizzard Entertainment game. This is an independent community
project and is not affiliated with Blizzard Entertainment.
