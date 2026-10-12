# wc3.dev

Two [Fresh](https://fresh.deno.dev) sites in one Deno workspace, sharing fonts, artwork and components:

- [wc3.dev](https://wc3.dev) and [www.wc3.dev](https://www.wc3.dev): `home/`, Worker `wc3-dev`.
- [docs.wc3.dev](https://docs.wc3.dev): `docs/`, Worker `wc3-docs`, documenting
  [Moonwell](https://github.com/mdlsvensson/moonwell),
  [Moonwell Wrappers](https://github.com/mdlsvensson/moonwell-wrappers) and
  [Moonwell Systems](https://github.com/mdlsvensson/moonwell-systems).

Production runs in Cloudflare Workers. Markdown is compiled and validated during the build; production requests
use bundled page records and a separate search index. Shared assets and their licences are in `shared/static/`.

## Local development

Use Deno **2.9.7**, with dependencies pinned in `deno.json` and `deno.lock`.

```sh
deno install --frozen --allow-scripts
deno task dev          # docs, http://localhost:5173
deno task dev:home     # home, http://localhost:5174
deno task content     # explicitly prepare/validate documentation
deno task check       # content, source/test types, lint and source formatting
deno task test        # contract tests
deno task build       # both production builds, each validating shared links
deno task build:docs  # documentation Worker only
deno task build:home  # home Worker only
deno task dry-run:docs # inspect docs deployment without uploading
deno task dry-run:home # inspect home deployment without uploading
deno task preview:docs # built docs Worker, http://localhost:5173
deno task preview:home # built home Worker, http://localhost:5174
deno task test:preview # direct HTTP checks while both Worker previews are running
```

Stop the corresponding dev server before running its Worker preview on the same port. Build before previewing.
Worker tasks use the generated Wrangler configs explicitly; Fresh's convenience `_fresh/server.js` wrappers
are not standalone Worker preview entry points. Run the combined build sequentially rather than running two content
preparations against the same checkout concurrently.

Authored Markdown is in `docs/content/`, and section order is in `docs/navigation.ts`. Docs development waits for
initial compilation, then watches Markdown changes. Successful validation publishes the page/search pair and reloads
the browser. An invalid edit reports its error and keeps the previous valid generation available until corrected.
Editing navigation restarts Vite's configuration. Home development shares the components and assets; the home
production build also validates every documentation and landing link.

The apps have independent entry points, client bundles and Worker configurations. `home/` serves the landing page
and redirects legacy documentation paths to `docs.wc3.dev`; `docs/` serves its landing page and the six authored
documents. Shared components, styles and static files live in `shared/`. Each Worker builds and previews independently;
production rendering uses bundled records and never reads the authored Markdown. Search loads its generated JSON
and MiniSearch client only when opened. Static font licences and provenance stay beside the fonts.

Contract tests compare the authored content and shared asset bytes with their original git objects, so run
`deno task test` from a Git checkout with history. Clean source archives can install frozen dependencies and build
both Workers without git history. `deno task test:preview` exercises the actual built routes, redirect queries,
both home hosts, missing pages/assets and empty HEAD bodies, then checks all shared asset types and bytes.

## Cloudflare Workers Builds

Configure two projects. Both use repository root as the root directory and `main` as the production branch. In
Settings > Build > Build Variables and Secrets, set `SKIP_DEPENDENCY_INSTALL` to `1` for both projects, as described
in Cloudflare's [build image documentation](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/).
This disables automatic dependency installation. The build script installs the pinned, checksum-verified
Linux/x86_64 Deno executable and frozen dependencies itself.

| Setting | Home | Docs |
|---|---|---|
| Worker | `wc3-dev` | `wc3-docs` |
| Build command | `sh tools/cloudflare-build.sh home` | `sh tools/cloudflare-build.sh docs` |
| Custom domains | `wc3.dev`, `www.wc3.dev` | `docs.wc3.dev` |

Home deploy command:

```sh
.build-tools/deno task wrangler deploy --config home/_fresh/server/wrangler.json
```

Docs deploy command:

```sh
.build-tools/deno task wrangler deploy --config docs/_fresh/server/wrangler.json
```

Deploy commands explicitly invoke the bootstrap's installed executable, so they do not rely on another command's
shell environment. The generated config points at that app's server bundle and client assets.

Before enabling the migration, confirm both projects deploy only `main`, disable non-production branch builds,
and verify no preview branch setting publishes the migration feature branch. Keep build watch paths unrestricted
for both projects: shared components/styles/assets, documentation, navigation, tooling and dependency changes must
rebuild both apps. Dashboard cutover and the first real Linux bootstrap build require deployment approval.
