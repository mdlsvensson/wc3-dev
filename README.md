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
deno task dev:sample   # docs with the sample site of tests/fixtures/site, http://localhost:5173
deno task content     # explicitly prepare/validate documentation
deno task check       # content, source/test types, lint and source formatting
deno task check:examples # compile the YueScript and Lua examples; needs MOONWELL_YUE and MOONWELL_LUAC
deno task test        # contract tests
deno task build       # both production builds, each validating shared links
deno task build:docs  # documentation Worker only
deno task build:home  # home Worker only
deno task build:sample # a local docs build of the sample site, for previews and measurements
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

`tests/fixtures/site/` is a sample documentation site: its own navigation, its Markdown and `unit-page.ts`, which
writes its long reference page. `deno task dev:sample` serves it and `deno task build:sample` builds it, so that long
pages, grouped sidebars and wide tables can be looked at and measured before such pages are authored. A sample run
writes into the same `docs/generated/` and `docs/_fresh/` as a real one. To run `deno task test:preview` against the
sample, build in this order: `deno task build:home`, then `deno task build:sample`, then start both previews, then run
the test. (`build:home`, `deno task check`, `deno task content` and `deno task dev` prepare the authored content, and
would overwrite the generated records that the test reads if they ran after the sample build.) End a sample run with
`deno task build:docs`, so that the generated files and the docs build are the authored site again.

Authored Markdown is in `docs/content/`. `docs/navigation.ts` lists each section's groups and pages: a group with a
`title` opens and closes in the sidebar, and a page's sidebar label is its `label` or else its `h1` heading, of which a
page has exactly one. A page must be listed there. Docs development waits for initial compilation, then watches
Markdown changes. Successful validation publishes the page/search pair and reloads the browser. An invalid edit
reports its error and keeps the previous valid generation available until corrected. Editing navigation restarts
Vite's configuration. Home development shares the components and assets; the home production build also validates
every documentation and landing link.

`docs/versions.json` holds the release each section documents and, in `written`, the sections whose pages are
written. `deno task test` fails where a page names another version of Moonwell or of a library: in
`moonwell@<version>`, after the word Moonwell, in the `tag` that follows a library's `github` line, in a link to a
library's repository at a tag, and after a library's name (`moonwell-wrappers v0.10.1`). It also fails when the
overview of a written section does not name its version. After a release, change the file first: the test then
names every line to rewrite.

A code block names its language: `yue` (or `yuescript`), `lua`, `pkl`, `toml`, `json`, `sh` (or `bash`, `shell`),
`powershell` (or `ps1`) or `text`. The table is `shared/code-languages.ts`. A language is added in three places: a row
there, its Shiki grammar as a line of the imports in `deno.json` (each grammar is mapped by its file), and the grammar's
use in `tools/content/render.ts`. Three blocks are written between `:::` lines, and a block may not stand inside
another:

````md
::: code-group
```yue
speed = 3
```
```lua
local speed = 3
```
:::

::: note An optional title
Text.
:::

::: warning
Text.
:::
````

A code group holds two or more code blocks, each in a different language. A note or a warning without a written title
shows "Note" or "Warning"; a written title is plain text.

A heading takes a hand-written id from a trailing `{#id}`: it starts with a lower-case letter or a digit and goes on
with lower-case letters, digits, `.`, `_` and `-`. The marker must end the heading, and an id that is written by hand
cannot be the id of another heading of the page. To show a literal `{#...}` in a heading, put it in inline code.
Without a marker the id is made from the heading's text. A dot stays in a made id where it stands between two
letters or digits (`unit.create`, `moonwell.toml`), and is dropped anywhere else. An id that the page itself uses (such
as `top` or `main-content`) is refused, for a made id and a hand-written one alike: the way out is another
hand-written id.

`deno task check:examples` compiles the `yue` and `lua` blocks of the authored pages. `MOONWELL_YUE` names the
YueScript compiler and `MOONWELL_LUAC` names Lua 5.3's `luac`. The task reads both when it starts, and stops with a
line that names each one that is missing, whether or not the pages hold a block of that language. A block that cannot
stand alone is written `lua skip` or `yue skip`: it is counted and not compiled. A code group with one of `yue` and
`lua` needs the other.

Content preparation fails, with the file and the line, on an unknown code language, a code block without a language,
an unknown block name, a block that is not closed or that stands inside another, a heading id that is written twice
and a heading id that the page itself uses. It fails on a dead link, a page missing from the navigation and a
navigation entry without a page.

The search covers every page and every `h2` and `h3` heading. A function name is found whole or by its parts
(`issueTargetOrder` by `target order`), and a qualified name finds its section.

The apps have independent entry points, client bundles and Worker configurations. `home/` serves the landing page
and redirects legacy documentation paths to `docs.wc3.dev`; `docs/` serves its landing page and the authored
documents. Shared components, styles and static files live in `shared/`. Each Worker builds and previews independently;
production rendering uses bundled records and never reads the authored Markdown. Search loads its generated JSON
and MiniSearch client only when opened. Static font licences and provenance stay beside the fonts.

Contract tests compare the shared asset bytes with their original git objects, so run `deno task test` from a Git
checkout with history. Tests of what a page can hold run against the sample site in `tests/fixtures/site/`. The authored
pages are held only to contracts that fit any page: each is served with one `h1`, its title and its place in the
sidebar, and the first page of a section is its overview. No test names an authored page. `deno task test` passes
without `MOONWELL_YUE` and `MOONWELL_LUAC`; the test of the real compilers is then skipped. Clean source archives can
install frozen dependencies and build both Workers without git history. `deno task test:preview` exercises the actual
built routes, redirect queries, both home hosts, missing pages/assets and empty HEAD bodies, checks that a built page
holds its own text and no other page's, then checks all shared asset types and bytes.

The repository's `.gitattributes` keeps source files with LF line ends, and authored Markdown, the sample's Markdown,
static files and the vendored grammar byte-exact.

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
